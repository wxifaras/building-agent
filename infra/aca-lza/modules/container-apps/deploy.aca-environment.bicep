targetScope = 'subscription'

// =================================================================================================
// PARAMETERS
// =================================================================================================

@description('Required. The resource names definition')
param resourcesNames object

@description('The location where the resources will be created. This needs to be the same region as the spoke.')
param location string

@description('Optional. The tags to be assigned to the created resources.')
param tags object = {}

@description('Required. Whether to enable deplotment telemetry.')
param enableTelemetry bool

// Hub
@description('The resource ID of the existing hub virtual network.')
param hubVNetId string

// Spoke
@description('The name of the existing spoke virtual network.')
param spokeVNetName string

@description('The name of the existing spoke infrastructure subnet.')
param spokeInfraSubnetName string

// Telemetry
@description('Optional. Enable or disable creation of Application Insights. Default is true.')
param enableApplicationInsights bool = true

@description('The storage account name to be mounted to the ACA environment.')
param storageAccountName string

@description('The resource id of an existing Azure Log Analytics Workspace.')
param logAnalyticsWorkspaceId string

@description('Any storage accounts that need to be mounted to the ACA environment.')
param containerAppsEnvironmentStorages array = []

@description('Optional, default value is true. If true, any resources that support AZ will be deployed in all three AZ. However if the selected region is not supporting AZ, this parameter needs to be set to false.')
param deployZoneRedundantResources bool = true

@description('The resource ID of the centralized user-assigned managed identity for Azure Container Apps.')
param acaUserAssignedIdentityId string

// ------------------
// VARIABLES
// ------------------
var workProfileName = 'general-purpose'
var virtualNetworkLinks = concat(
  [
    {
      virtualNetworkResourceId: spokeVNet.id
      registrationEnabled: false
    }
  ],
  (!empty(hubVNetId))
    ? [
        {
          virtualNetworkResourceId: hubVNetId
          registrationEnabled: false
        }
      ]
    : []
)
var storageShare = 'smbfileshare'
var storages = concat(
  [
    {
      accessMode: 'ReadWrite'
      kind: 'SMB'
      shareName: storageShare
      storageAccountName: storageAccountName
    }
  ],
  containerAppsEnvironmentStorages
)

// =================================================================================================
// EXISTING RESOURCES
// =================================================================================================

@description('The existing spoke virtual network.')
resource spokeVNet 'Microsoft.Network/virtualNetworks@2024-05-01' existing = {
  name: spokeVNetName
  scope: resourceGroup(resourcesNames.resourceGroup)
  resource infraSubnet 'subnets' existing = {
    name: spokeInfraSubnetName
  }
}

// =================================================================================================
// RESOURCES
// =================================================================================================

@description('Azure Application Insights, the workload\' log & metric sink and APM tool')
module applicationInsights 'br/public:avm/res/insights/component:0.4.2' = if (enableApplicationInsights) {
  name: '${take(uniqueString(deployment().name, location),4)}-appinsights'
  scope: resourceGroup(resourcesNames.resourceGroup)
  params: {
    name: resourcesNames.applicationInsights
    location: location
    tags: tags
    enableTelemetry: enableTelemetry
    workspaceResourceId: logAnalyticsWorkspaceId
  }
}

@description('The Azure Container Apps (ACA) cluster.')
module containerAppsEnvironment 'br/public:avm/res/app/managed-environment:0.8.1' = {
  name: '${take(uniqueString(deployment().name, location),4)}-acaenv'
  scope: resourceGroup(resourcesNames.resourceGroup)
  params: {
    logAnalyticsWorkspaceResourceId: logAnalyticsWorkspaceId
    name: resourcesNames.containerAppsEnvironment
    location: location
    tags: tags
    enableTelemetry: enableTelemetry
    internal: true
    managedIdentities: {
      userAssignedResourceIds: [
        acaUserAssignedIdentityId
      ]
    }
    infrastructureSubnetId: spokeVNet::infraSubnet.id
    workloadProfiles: [
      {
        maximumCount: 3
        minimumCount: 0
        name: workProfileName
        workloadProfileType: 'D4'
      }
    ]
    storages: storages
    zoneRedundant: deployZoneRedundantResources
  }
}

@description('The Private DNS zone containing the ACA load balancer IP')
module containerAppsEnvironmentPrivateDnsZone 'br/public:avm/res/network/private-dns-zone:0.7.0' = {
  name: '${take(uniqueString(deployment().name, location),4)}-dns-aca'
  scope: resourceGroup(resourcesNames.resourceGroup)
  params: {
    name: containerAppsEnvironment.outputs.defaultDomain
    location: 'global'
    tags: tags
    enableTelemetry: enableTelemetry
    virtualNetworkLinks: virtualNetworkLinks
    a: [
      {
        name: '*'
        aRecords: [
          {
            ipv4Address: containerAppsEnvironment.outputs.staticIp
          }
        ]
      }
    ]
  }
}

// =================================================================================================
// OUTPUTS
// =================================================================================================

@description('The resource ID of the Container Apps environment.')
output containerAppsEnvironmentId string = containerAppsEnvironment.outputs.resourceId

@description('The name of the Container Apps environment.')
output containerAppsEnvironmentName string = containerAppsEnvironment.outputs.name

@description('The name of the Application Insights instance.')
output applicationInsightsName string = (enableApplicationInsights) ? applicationInsights!.outputs.name : ''

@description('The name of the workload profiles provisioned in the Container Apps environment.')
output workloadProfileNames array = [workProfileName]
