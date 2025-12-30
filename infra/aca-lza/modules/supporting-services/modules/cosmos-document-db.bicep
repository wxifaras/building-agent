targetScope = 'resourceGroup'

// =================================================================================================
// PARAMETERS
// =================================================================================================

@description('Required. The name of the Cosmos DB account.')
param name string

@description('Optional. Location for the Cosmos DB account. Defaults to resource group location.')
param location string = resourceGroup().location

@description('Optional. Tags to apply to the Cosmos DB account.')
param tags object = {}

@description('Optional. Whether to enable telemetry.')
param enableTelemetry bool = true

@description('Optional. Disable local (key-based) authentication. Default is true for enhanced security.')
param disableLocalAuthentication bool = true

@description('Optional. The default consistency level for the Cosmos DB account.')
param defaultConsistencyLevel string = 'Session'

@description('Optional. Enable automatic failover for multi-region accounts.')
param automaticFailover bool = false

@description('Optional. Diagnostic settings configuration.')
param diagnosticSettings array = []

@description('Optional. SQL databases to create.')
param sqlDatabases array = []

@description('Optional. Role assignments for data plane access.')
param roleAssignments array = []

@description('Optional. Enable private endpoint for Cosmos DB. When true, public network access is disabled. Default is false.')
param enablePrivateEndpoint bool = false

@description('Optional. The resource id of the subnet in the VNet to which the private endpoint will be connected.')
param spokePrivateEndpointSubnetResourceId string = ''

@description('Optional. The name of the private endpoint to be created for Cosmos DB.')
param cosmosPrivateEndpointName string = 'cosmos-pep'

@description('Optional. Resource ID of the existing private DNS zone for Cosmos DB.')
param privateDnsZoneResourceId string = ''

// =================================================================================================
// VARIABLES
// =================================================================================================

// Private endpoint configuration using centralized DNS zone
var privateEndpointsToUse = (enablePrivateEndpoint && !empty(spokePrivateEndpointSubnetResourceId) && !empty(privateDnsZoneResourceId))
  ? [
      {
        name: cosmosPrivateEndpointName
        service: 'Sql'
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

// =================================================================================================
// RESOURCES
// =================================================================================================

module inner 'br/public:avm/res/document-db/database-account:0.16.0' = {
  name: '${take(uniqueString(deployment().name, location),4)}-cosmos-db'
  params: {
    name: name
    location: location
    automaticFailover: automaticFailover
    defaultConsistencyLevel: defaultConsistencyLevel
    diagnosticSettings: diagnosticSettings
    disableLocalAuthentication: disableLocalAuthentication
    enableTelemetry: enableTelemetry
    networkRestrictions: {
      publicNetworkAccess: enablePrivateEndpoint ? 'Disabled' : 'Enabled'
    }
    privateEndpoints: !empty(privateEndpointsToUse) ? privateEndpointsToUse : null
    roleAssignments: roleAssignments
    sqlDatabases: sqlDatabases
    tags: tags
  }
}

// =================================================================================================
// OUTPUTS
// =================================================================================================

@description('The resource ID of the Cosmos DB account.')
output resourceId string = inner.outputs.resourceId

@description('The name of the Cosmos DB account.')
output name string = inner.outputs.name

@description('The location where the Cosmos DB account is deployed.')
output location string = inner.outputs.location

@description('The name of the resource group where the Cosmos DB account is deployed.')
output resourceGroupName string = inner.outputs.resourceGroupName

@description('The principal ID of the system-assigned managed identity (if enabled).')
output systemAssignedMIPrincipalId string = inner.outputs.?systemAssignedMIPrincipalId ?? ''

@description('The endpoint for the Cosmos DB account.')
output endpoint string = inner.outputs.endpoint

@description('The private endpoints created for the Cosmos DB account.')
output privateEndpoints array = inner.outputs.?privateEndpoints ?? []
