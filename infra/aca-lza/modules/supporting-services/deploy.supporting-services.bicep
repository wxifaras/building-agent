targetScope = 'subscription'

// =================================================================================================
// PARAMETERS
// =================================================================================================

@description('Required. The resource names definition')
param resourcesNames object

@description('The location where the resources will be created.')
param location string

@description('Optional. The tags to be assigned to the created resources.')
param tags object = {}

@description('Required. Whether to enable deployment telemetry.')
param enableTelemetry bool

@description('The resource ID of the VNet to which the private endpoints will be connected.')
param spokeVNetResourceId string

@description('The resource id of the subnet in the VNet to which the private endpoints will be connected.')
param spokePrivateEndpointSubnetResourceId string

@description('Optional. The resource ID of the Hub Virtual Network.')
param hubVNetResourceId string = ''

@description('Required. Resource ID of the diagnostic log analytics workspace.')
param logAnalyticsWorkspaceId string

@description('Optional, default value is true. If true, any resources that support AZ will be deployed in all three AZ. However if the selected region is not supporting AZ, this parameter needs to be set to false.')
param deployZoneRedundantResources bool = true

@description('Optional. Deploy the agent pool for the container registry. Default value is true.')
param deployAgentPool bool = true

@description('Optional. Enable private endpoint for Key Vault. Default is true.')
param enableKeyVaultPrivateEndpoint bool = true

@description('Optional. Enable private endpoint for Storage Account. Default is true.')
param enableStoragePrivateEndpoint bool = true

@description('Optional. Enable private endpoint for Container Registry. Default is true.')
param enableAcrPrivateEndpoint bool = true

@description('Optional. Enable private endpoint for Cosmos DB. Default is true.')
param enableCosmosPrivateEndpoint bool = true

@description('Optional. Enable private endpoint for Redis. Default is true.')
param enableRedisPrivateEndpoint bool = true

@description('Optional. Enable private endpoint for App Configuration. Default is true.')
param enableAppConfigPrivateEndpoint bool = true

// =================================================================================================
// Private DNS Zones - Centralized for all supporting services
// =================================================================================================

module privateDnsZoneKeyVault 'br/public:avm/res/network/private-dns-zone:0.6.0' = {
  name: '${take(uniqueString(deployment().name, location),4)}-dns-keyvault'
  scope: resourceGroup(resourcesNames.resourceGroup)
  params: {
    name: 'privatelink.vaultcore.azure.net'
    location: 'global'
    tags: tags
    enableTelemetry: enableTelemetry
    virtualNetworkLinks: concat(
      [
        {
          virtualNetworkResourceId: spokeVNetResourceId
          registrationEnabled: false
        }
      ],
      !empty(hubVNetResourceId) ? [
        {
          virtualNetworkResourceId: hubVNetResourceId
          registrationEnabled: false
        }
      ] : []
    )
  }
}

module privateDnsZoneBlob 'br/public:avm/res/network/private-dns-zone:0.6.0' = {
  name: '${take(uniqueString(deployment().name, location),4)}-dns-blob'
  scope: resourceGroup(resourcesNames.resourceGroup)
  params: {
    name: 'privatelink.blob.${environment().suffixes.storage}'
    location: 'global'
    tags: tags
    enableTelemetry: enableTelemetry
    virtualNetworkLinks: concat(
      [
        {
          virtualNetworkResourceId: spokeVNetResourceId
          registrationEnabled: false
        }
      ],
      !empty(hubVNetResourceId) ? [
        {
          virtualNetworkResourceId: hubVNetResourceId
          registrationEnabled: false
        }
      ] : []
    )
  }
}

module privateDnsZoneFile 'br/public:avm/res/network/private-dns-zone:0.6.0' = {
  name: '${take(uniqueString(deployment().name, location),4)}-dns-file'
  scope: resourceGroup(resourcesNames.resourceGroup)
  params: {
    name: 'privatelink.file.${environment().suffixes.storage}'
    location: 'global'
    tags: tags
    enableTelemetry: enableTelemetry
    virtualNetworkLinks: concat(
      [
        {
          virtualNetworkResourceId: spokeVNetResourceId
          registrationEnabled: false
        }
      ],
      !empty(hubVNetResourceId) ? [
        {
          virtualNetworkResourceId: hubVNetResourceId
          registrationEnabled: false
        }
      ] : []
    )
  }
}

module privateDnsZoneAcr 'br/public:avm/res/network/private-dns-zone:0.6.0' = {
  name: '${take(uniqueString(deployment().name, location),4)}-dns-acr'
  scope: resourceGroup(resourcesNames.resourceGroup)
  params: {
    name: 'privatelink.azurecr.io'
    location: 'global'
    tags: tags
    enableTelemetry: enableTelemetry
    virtualNetworkLinks: concat(
      [
        {
          virtualNetworkResourceId: spokeVNetResourceId
          registrationEnabled: false
        }
      ],
      !empty(hubVNetResourceId) ? [
        {
          virtualNetworkResourceId: hubVNetResourceId
          registrationEnabled: false
        }
      ] : []
    )
  }
}

module privateDnsZoneCosmos 'br/public:avm/res/network/private-dns-zone:0.6.0' = {
  name: '${take(uniqueString(deployment().name, location),4)}-dns-cosmos'
  scope: resourceGroup(resourcesNames.resourceGroup)
  params: {
    name: 'privatelink.documents.azure.com'
    location: 'global'
    tags: tags
    enableTelemetry: enableTelemetry
    virtualNetworkLinks: concat(
      [
        {
          virtualNetworkResourceId: spokeVNetResourceId
          registrationEnabled: false
        }
      ],
      !empty(hubVNetResourceId) ? [
        {
          virtualNetworkResourceId: hubVNetResourceId
          registrationEnabled: false
        }
      ] : []
    )
  }
}

module privateDnsZoneRedis 'br/public:avm/res/network/private-dns-zone:0.6.0' = {
  name: '${take(uniqueString(deployment().name, location),4)}-dns-redis'
  scope: resourceGroup(resourcesNames.resourceGroup)
  params: {
    name: 'privatelink.redisenterprise.cache.azure.net'
    location: 'global'
    tags: tags
    enableTelemetry: enableTelemetry
    virtualNetworkLinks: concat(
      [
        {
          virtualNetworkResourceId: spokeVNetResourceId
          registrationEnabled: false
        }
      ],
      !empty(hubVNetResourceId) ? [
        {
          virtualNetworkResourceId: hubVNetResourceId
          registrationEnabled: false
        }
      ] : []
    )
  }
}

// =================================================================================================
// Managed Identities
// =================================================================================================

// Create user-assigned managed identity for Azure Container Apps
module acaUserAssignedIdentity 'br/public:avm/res/managed-identity/user-assigned-identity:0.4.0' = {
  name: '${take(uniqueString(deployment().name, location),4)}-aca-identity'
  scope: resourceGroup(resourcesNames.resourceGroup)
  params: {
    name: resourcesNames.acaUserAssignedIdentity
    location: location
    tags: tags
    enableTelemetry: enableTelemetry
  }
}

// =================================================================================================
// Supporting Services
// =================================================================================================


module keyVault './modules/key-vault.bicep' = {
  name: '${take(uniqueString(deployment().name, location),4)}-keyvault'
  scope: resourceGroup(resourcesNames.resourceGroup)
  params: {
    location: location
    keyVaultName: resourcesNames.keyVault
    keyVaultPrivateEndpointName: resourcesNames.keyVaultPep
    tags: tags
    enableTelemetry: enableTelemetry
    enablePrivateEndpoint: enableKeyVaultPrivateEndpoint
    spokePrivateEndpointSubnetResourceId: spokePrivateEndpointSubnetResourceId
    diagnosticWorkspaceId: logAnalyticsWorkspaceId
    diagnosticSettingsName: 'keyvault-diagnosticSettings'
    managedIdentityPrincipalId: acaUserAssignedIdentity.outputs.principalId
    privateDnsZoneResourceId: privateDnsZoneKeyVault.outputs.resourceId
  }
}

module storage './modules/storage.bicep' = {
  name: '${take(uniqueString(deployment().name, location),4)}-storage'
  scope: resourceGroup(resourcesNames.resourceGroup)
  params: {
    location: location
    storageAccountName: resourcesNames.storageAccount
    storagePrivateEndpointName: resourcesNames.storageAccountPep
    tags: tags
    enableTelemetry: enableTelemetry
    enablePrivateEndpoint: enableStoragePrivateEndpoint
    spokePrivateEndpointSubnetResourceId: spokePrivateEndpointSubnetResourceId
    diagnosticWorkspaceId: logAnalyticsWorkspaceId
    diagnosticSettingsName: 'storage-diagnosticSettings'
    managedIdentityPrincipalId: acaUserAssignedIdentity.outputs.principalId
    privateDnsZoneResourceId: privateDnsZoneBlob.outputs.resourceId
    fileSharePrivateDnsZoneResourceId: privateDnsZoneFile.outputs.resourceId
  }
}

module acr './modules/container-registry.bicep' = {
  name: '${take(uniqueString(deployment().name, location),4)}-acr'
  scope: resourceGroup(resourcesNames.resourceGroup)
  params: {
    location: location
    containerRegistryName: resourcesNames.containerRegistry
    containerRegistryPrivateEndpointName: resourcesNames.containerRegistryPep
    managedIdentityPrincipalId: acaUserAssignedIdentity.outputs.principalId
    tags: tags
    enableTelemetry: enableTelemetry
    enablePrivateEndpoint: enableAcrPrivateEndpoint
    spokePrivateEndpointSubnetResourceId: spokePrivateEndpointSubnetResourceId
    diagnosticWorkspaceId: logAnalyticsWorkspaceId
    deployZoneRedundantResources: deployZoneRedundantResources
    deployAgentPool: deployAgentPool
    privateDnsZoneResourceId: privateDnsZoneAcr.outputs.resourceId
  }
}

module cosmosDb './modules/cosmos-document-db.bicep' = if (contains(resourcesNames, 'cosmosDb')) {
  name: '${take(uniqueString(deployment().name, location),4)}-cosmos'
  scope: resourceGroup(resourcesNames.resourceGroup)
  params: {
    name: resourcesNames.cosmosDb
    location: location
    tags: tags
    enableTelemetry: enableTelemetry
    disableLocalAuthentication: true
    defaultConsistencyLevel: 'Session'
    automaticFailover: true
    diagnosticSettings: [
      {
        name: 'cosmos-diagnostics'
        workspaceResourceId: logAnalyticsWorkspaceId
        logCategoriesAndGroups: [
          { categoryGroup: 'allLogs' }
        ]
        metricCategories: [
          { category: 'AllMetrics' }
        ]
      }
    ]
    enablePrivateEndpoint: enableCosmosPrivateEndpoint
    spokePrivateEndpointSubnetResourceId: spokePrivateEndpointSubnetResourceId
    cosmosPrivateEndpointName: resourcesNames.cosmosDbNoSqlPep
    privateDnsZoneResourceId: privateDnsZoneCosmos.outputs.resourceId
  }
}

module redis './modules/redis-managed.bicep' = if (contains(resourcesNames, 'redis')) {
  name: '${take(uniqueString(deployment().name, location),4)}-redis'
  scope: resourceGroup(resourcesNames.resourceGroup)
  params: {
    name: resourcesNames.redis
    location: location
    tags: tags
    enableTelemetry: enableTelemetry
    enablePrivateEndpoint: enableRedisPrivateEndpoint
    managedIdentityPrincipalId: acaUserAssignedIdentity.outputs.principalId
    spokePrivateEndpointSubnetResourceId: spokePrivateEndpointSubnetResourceId
    redisPrivateEndpointName: resourcesNames.redisCachePep
    privateDnsZoneResourceId: privateDnsZoneRedis.outputs.resourceId
    skuName: 'Balanced_B5'
    capacity: 2
  }
}

module appConfig './modules/app-config.bicep' = if (contains(resourcesNames, 'appConfig')) {
  name: '${take(uniqueString(deployment().name, location),4)}-appconfig'
  scope: resourceGroup(resourcesNames.resourceGroup)
  params: {
    name: resourcesNames.appConfig
    location: location
    tags: tags
    enableTelemetry: enableTelemetry
    acaUserAssignedIdentityPrincipalId: acaUserAssignedIdentity.outputs.principalId
    spokeVNetResourceId: spokeVNetResourceId
    hubVNetResourceId: hubVNetResourceId
    privateEndpoints: enableAppConfigPrivateEndpoint && !empty(spokePrivateEndpointSubnetResourceId) ? [
      {
        name: resourcesNames.appConfigPep
        service: 'configurationStores'
        subnetResourceId: spokePrivateEndpointSubnetResourceId
      }
    ] : []
  }
}

// =================================================================================================
// OUTPUTS
// =================================================================================================

@description('The resource ID of the container registry.')
output containerRegistryId string = acr.outputs.containerRegistryId

@description('The name of the container registry.')
output containerRegistryName string = acr.outputs.containerRegistryName

@description('The name of the container registry login server.')
output containerRegistryLoginServer string = acr.outputs.containerRegistryLoginServer

@description('The name of the internal agent pool for the container registry.')
output containerRegistryAgentPoolName string = acr.outputs.containerRegistryAgentPoolName

@description('The resource ID of the user assigned managed identity for Azure Container Apps.')
output acaUserAssignedIdentityId string = acaUserAssignedIdentity.outputs.resourceId

@description('The principal ID of the user assigned managed identity for Azure Container Apps.')
output acaUserAssignedIdentityPrincipalId string = acaUserAssignedIdentity.outputs.principalId

@description('The resource ID of the key vault.')
output keyVaultResourceId string = keyVault.outputs.keyVaultResourceId

@description('The name of the Azure key vault.')
output keyVaultName string = keyVault.outputs.keyVaultName

@description('The name of the storage account.')
output storageAccountName string = storage.outputs.storageAccountName

@description('The resource ID of the storage account.')
output storageAccountResourceId string = storage.outputs.storageAccountResourceId
