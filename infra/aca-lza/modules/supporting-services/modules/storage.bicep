targetScope = 'resourceGroup'

// =================================================================================================
// PARAMETERS
// =================================================================================================

@description('The location where the resources will be created.')
param location string = resourceGroup().location

@description('The name of the storage account.')
param storageAccountName string

@description('Optional. The tags to be assigned to the created resources.')
param tags object = {}

@description('Required. Whether to enable deplotment telemetry.')
param enableTelemetry bool = true

@description('Optional. Enable private endpoint for Storage Account. Default is true.')
param enablePrivateEndpoint bool = true

@description('The resource id of the subnet in the VNet to which the private endpoint will be connected.')
param spokePrivateEndpointSubnetResourceId string = ''

@description('Optional. The name of the private endpoint to be created for Key Vault. If left empty, it defaults to "<resourceName>-pep')
param storagePrivateEndpointName string = 'storage-pep'

@description('Required. Resource ID of the diagnostic log analytics workspace. For security reasons, it is recommended to set diagnostic settings to send data to either storage account, log analytics workspace.')
param diagnosticWorkspaceId string

@description('Optional. The name of the diagnostic setting, if deployed. If left empty, it defaults to "<resourceName>-diagnosticSettings".')
param diagnosticSettingsName string = 'storage-diagnosticSettings'

@description('Optional. Principal ID of the managed identity to access Storage. If provided, RBAC assignment (Storage Blob Data Contributor) will be added.')
param managedIdentityPrincipalId string = ''

@description('Required. Resource ID of the existing private DNS zone for Blob Storage.')
param privateDnsZoneResourceId string

@description('Required. Resource ID of the existing private DNS zone for File Storage.')
param fileSharePrivateDnsZoneResourceId string

@description('Optional. Containers to be created in blob storage.')
param storageContainers array = []

// =================================================================================================
// VARIABLES
// =================================================================================================

// Role assignments for ACA managed identity
// Storage Blob Data Contributor - read/write/delete access to blob containers
var roleAssignments = (!empty(managedIdentityPrincipalId))
  ? [
      {
        principalId: managedIdentityPrincipalId
        roleDefinitionIdOrName: 'Storage Blob Data Contributor'
        principalType: 'ServicePrincipal'
      }
    ]
  : []

var privateEndpointsConfig = (enablePrivateEndpoint && !empty(spokePrivateEndpointSubnetResourceId) && !empty(privateDnsZoneResourceId))
  ? [
      {
        name: storagePrivateEndpointName
        privateDnsZoneGroup: {
          privateDnsZoneGroupConfigs: [
            {
              privateDnsZoneResourceId: privateDnsZoneResourceId
            }
          ]
        }
        service: 'blob'
        subnetResourceId: spokePrivateEndpointSubnetResourceId
      }
      {
        name: '${storagePrivateEndpointName}-file'
        privateDnsZoneGroup: {
          privateDnsZoneGroupConfigs: [
            {
              privateDnsZoneResourceId: fileSharePrivateDnsZoneResourceId
            }
          ]
        }
        service: 'file'
        subnetResourceId: spokePrivateEndpointSubnetResourceId
      }
    ]
  : []

// =================================================================================================
// RESOURCES
// =================================================================================================

// Storage account for application data
module storage 'br/public:avm/res/storage/storage-account:0.15.0' = {
  name: '${take(uniqueString(deployment().name, location),4)}-storage'
  params: {
    location: location
    kind: 'StorageV2'
    skuName: 'Standard_ZRS'
    enableTelemetry: enableTelemetry
    name: storageAccountName
    publicNetworkAccess: enablePrivateEndpoint ? 'Disabled' : 'Enabled'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    networkAcls: enablePrivateEndpoint ? {
      bypass: 'AzureServices'
      defaultAction: 'Deny'
    } : {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
    blobServices: {
      containers: storageContainers
      diagnosticSettings: [
        {
          name: 'blob-diagnostics'
          workspaceResourceId: diagnosticWorkspaceId
          logCategoriesAndGroups: [
            { categoryGroup: 'allLogs' }
          ]
        }
      ]
    }
    privateEndpoints: privateEndpointsConfig
    roleAssignments: roleAssignments
    diagnosticSettings: [
      {
        metricCategories: [
          {
            category: 'AllMetrics'
          }
        ]
        name: diagnosticSettingsName
        workspaceResourceId: diagnosticWorkspaceId
      }
    ]
    tags: tags
  }
}

// =================================================================================================
// OUTPUTS
// =================================================================================================

@description('The resource ID of the storage account.')
output storageAccountResourceId string = storage.outputs.resourceId

@description('The name of the storage account.')
output storageAccountName string = storage.outputs.name

@description('The primary blob endpoint.')
output blobEndpoint string = storage.outputs.primaryBlobEndpoint
