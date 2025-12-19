targetScope = 'resourceGroup'

// ------------------
//    PARAMETERS
// ------------------
@description('The location where the resources will be created.')
param location string = resourceGroup().location

@description('The name of the Key Vault.')
param keyVaultName string

@description('Optional. The tags to be assigned to the created resources.')
param tags object = {}

@description('Required. Whether to enable deplotment telemetry.')
param enableTelemetry bool = true

@description('Optional. Enable private endpoint for Key Vault. Default is true.')
param enablePrivateEndpoint bool = true

@description('The resource id of the subnet in the VNet to which the private endpoint will be connected.')
param spokePrivateEndpointSubnetResourceId string = ''

@description('Optional. The name of the private endpoint to be created for Key Vault. If left empty, it defaults to "<resourceName>-pep')
param keyVaultPrivateEndpointName string = 'keyvault-pep'

@description('Required. Resource ID of the diagnostic log analytics workspace. For security reasons, it is recommended to set diagnostic settings to send data to either storage account, log analytics workspace.')
param diagnosticWorkspaceId string

@description('Optional. The name of the diagnostic setting, if deployed. If left empty, it defaults to "<resourceName>-diagnosticSettings".')
param diagnosticSettingsName string = 'keyvault-diagnosticSettings'

@description('Optional. Principal ID of the managed identity to access Key Vault. If provided, an RBAC assignment (Key Vault Secrets User) will be added to the vault.')
param managedIdentityPrincipalId string = ''

@description('Required. Resource ID of the existing private DNS zone for Key Vault.')
param privateDnsZoneResourceId string

// ------------------
// VARIABLES
// ------------------
var roleAssignments = (!empty(managedIdentityPrincipalId))
  ? [
      {
        principalId: managedIdentityPrincipalId
        roleDefinitionIdOrName: 'Key Vault Secrets User'
        principalType: 'ServicePrincipal'
      }
    ]
  : []

var privateEndpointsConfig = (enablePrivateEndpoint && !empty(spokePrivateEndpointSubnetResourceId) && !empty(privateDnsZoneResourceId))
  ? [
      {
        name: keyVaultPrivateEndpointName
        privateDnsZoneGroup: {
          privateDnsZoneGroupConfigs: [
            {
              privateDnsZoneResourceId: privateDnsZoneResourceId
            }
          ]
        }
        subnetResourceId: spokePrivateEndpointSubnetResourceId
      }
    ]
  : []

// ------------------
// RESOURCES
// ------------------
module keyvault 'br/public:avm/res/key-vault/vault:0.11.1' = {
  name: '${take(uniqueString(deployment().name, location),4)}-keyvault'
  params: {
    name: keyVaultName
    location: location
    tags: tags
    enableTelemetry: enableTelemetry
    sku: 'standard'
    networkAcls: enablePrivateEndpoint ? {
      bypass: 'AzureServices'
      defaultAction: 'Deny'
    } : {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: false
    publicNetworkAccess: enablePrivateEndpoint ? 'Disabled' : 'Enabled'
    enableRbacAuthorization: true
    enableVaultForDeployment: true
    roleAssignments: roleAssignments
    privateEndpoints: privateEndpointsConfig
    diagnosticSettings: [
      {
        name: diagnosticSettingsName
        workspaceResourceId: diagnosticWorkspaceId
        logCategoriesAndGroups: [
          { categoryGroup: 'allLogs' }
        ]
        metricCategories: [
          {
            category: 'AllMetrics'
          }
        ]
      }
    ]
  }
}

// ------------------
// OUTPUTS
// ------------------
@description('The resource ID of the key vault.')
output keyVaultResourceId string = keyvault.outputs.resourceId

@description('The name of the key vault.')
output keyVaultName string = keyvault.outputs.name
