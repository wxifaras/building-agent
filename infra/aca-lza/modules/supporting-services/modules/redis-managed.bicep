targetScope = 'resourceGroup'

// =================================================================================================
// PARAMETERS
// =================================================================================================

@description('Required. The name of the Redis Cache resource.')
param name string

@description('Optional. Location for the Redis Cache. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Optional. Tags to apply to the Redis Cache.')
param tags object = {}

@description('Optional. Enable/Disable usage telemetry for module. Default is true.')
param enableTelemetry bool = true

@description('Optional. Enable private endpoint for Redis. Default is true.')
param enablePrivateEndpoint bool = true

@description('Optional. The type of Redis cluster to deploy (Redis Enterprise or Azure Managed Redis). Default is Balanced_B5.')
param skuName string = 'Balanced_B5'

@description('Optional. The size/capacity of the cluster. Only supported on Enterprise SKUs: Enterprise and EnterpriseFlash. Default is 2.')
@allowed([
	2
	3
	4
	6
	8
	9
	10
])
param capacity int = 2

@description('Optional. Principal ID of the managed identity to access Redis. If provided, an RBAC assignment (Redis Enterprise Cache Contributor) will be added.')
param managedIdentityPrincipalId string = ''

@description('Optional. The resource id of the subnet in the VNet to which the private endpoint will be connected.')
param spokePrivateEndpointSubnetResourceId string = ''

@description('Optional. The name of the private endpoint to be created for Redis.')
param redisPrivateEndpointName string = 'redis-pep'

@description('Optional. Resource ID of the existing private DNS zone for Redis.')
param privateDnsZoneResourceId string = ''

// =================================================================================================
// VARIABLES
// =================================================================================================

// Role assignment for ACA managed identity to access Redis
// Using Redis Enterprise Cache Contributor for read/write access
var acaRoleAssignments = (!empty(managedIdentityPrincipalId))
  ? [
      {
        principalId: managedIdentityPrincipalId
        roleDefinitionIdOrName: 'Redis Enterprise Cache Contributor'
        principalType: 'ServicePrincipal'
      }
    ]
  : []

var skuSupportsCapacity = startsWith(skuName, 'Enterprise')

// Private endpoint configuration using centralized DNS zone
var privateEndpointsConfig = (enablePrivateEndpoint && !empty(spokePrivateEndpointSubnetResourceId) && !empty(privateDnsZoneResourceId))
  ? [
      {
        name: redisPrivateEndpointName
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

module redis 'br/public:avm/res/cache/redis-enterprise:0.5.0' = {
	name: '${take(uniqueString(deployment().name, location),4)}-redis'
	params: {
		name: name
		location: location
		tags: tags
		enableTelemetry: enableTelemetry

		skuName: skuName
		capacity: skuSupportsCapacity ? capacity : null

		privateEndpoints: privateEndpointsConfig
		roleAssignments: acaRoleAssignments
	}
}

// =================================================================================================
// OUTPUTS
// =================================================================================================

@description('The resource ID of the Redis Cache.')
output resourceId string = redis.outputs.resourceId

@description('The name of the Redis Cache.')
output redisName string = redis.outputs.name

@description('Redis hostname.')
output hostName string = redis.outputs.hostName

@description('Redis port.')
output port int = redis.outputs.port

@description('Private endpoints created for the Redis Cache (if any).')
output privateEndpoints array = redis.outputs.privateEndpoints
