targetScope = 'resourceGroup'

@description('Required. The name of the App Configuration store.')
param name string

@description('Optional. Location for the App Configuration store. Defaults to resource group location.')
param location string = resourceGroup().location

@description('Optional. Tags to apply to the App Configuration store.')
param tags object = {}

@description('Optional. Whether to enable telemetry.')
param enableTelemetry bool

@description('Optional. Private endpoints configuration.')
param privateEndpoints array = []

@description('Optional. Resource ID of the spoke VNet. If provided and private endpoints are configured, a private DNS zone for App Configuration will be created and linked to this VNet.')
param spokeVNetResourceId string = ''

@description('Optional. Resource ID of the hub VNet. If provided alongside spokeVNetResourceId and private endpoints are configured, the private DNS zone will also be linked to this VNet.')
param hubVNetResourceId string = ''

@description('Optional. Principal ID of the user-assigned managed identity used by Azure Container Apps to access App Configuration. If provided, an RBAC assignment (App Configuration Data Reader) will be added to the configuration store.')
param acaUserAssignedIdentityPrincipalId string = ''

var hasPrivateEndpoints = length(privateEndpoints) > 0
var deployPrivateDnsZone = hasPrivateEndpoints && !empty(spokeVNetResourceId)

var virtualNetworkLinks = concat(
  !empty(spokeVNetResourceId)
    ? [
        {
          virtualNetworkResourceId: spokeVNetResourceId
          registrationEnabled: false
        }
      ]
    : [],
  !empty(hubVNetResourceId)
    ? [
        {
          virtualNetworkResourceId: hubVNetResourceId
          registrationEnabled: false
        }
      ]
    : []
)

var appConfigPrivateDnsZoneName = 'privatelink.azconfig.io'

module appConfigDnsZone 'br/public:avm/res/network/private-dns-zone:0.7.0' = if (deployPrivateDnsZone) {
  name: '${take(uniqueString(deployment().name, location),4)}-appconfig-dns'
  params: {
    name: appConfigPrivateDnsZoneName
    location: 'global'
    tags: tags
    enableTelemetry: enableTelemetry
    virtualNetworkLinks: virtualNetworkLinks
  }
}

var appConfigPrivateDnsZoneResourceId = deployPrivateDnsZone
  ? resourceId('Microsoft.Network/privateDnsZones', appConfigPrivateDnsZoneName)
  : ''

var computedPrivateEndpoints = hasPrivateEndpoints
  ? map(privateEndpoints, pe => union(pe, (deployPrivateDnsZone && pe.?privateDnsZoneGroup == null)
      ? {
          privateDnsZoneGroup: {
            privateDnsZoneGroupConfigs: [
              {
                privateDnsZoneResourceId: appConfigPrivateDnsZoneResourceId
              }
            ]
          }
        }
      : {}))
  : []

var effectivePublicNetworkAccess = hasPrivateEndpoints ? 'Disabled' : 'Enabled'

var acaRoleAssignments = (!empty(acaUserAssignedIdentityPrincipalId))
  ? [
      {
        principalId: acaUserAssignedIdentityPrincipalId
        roleDefinitionIdOrName: 'App Configuration Data Reader'
      }
    ]
  : []
var effectiveRoleAssignments = acaRoleAssignments

module configurationStore 'br/public:avm/res/app-configuration/configuration-store:0.9.2' = {
  name: '${take(uniqueString(deployment().name, location),4)}-appconfig'
  params: {
    name: name
    location: location
    enableTelemetry: enableTelemetry
    tags: tags
    privateEndpoints: computedPrivateEndpoints
    publicNetworkAccess: effectivePublicNetworkAccess
    roleAssignments: effectiveRoleAssignments
  }
}

@description('The resource ID of the configuration store.')
output resourceId string = configurationStore.outputs.resourceId

@description('The name of the configuration store.')
output name string = configurationStore.outputs.name

@description('The location the resource was deployed into.')
output location string = configurationStore.outputs.location

@description('The resource group the configuration store was deployed into.')
output resourceGroupName string = configurationStore.outputs.resourceGroupName

@description('The endpoint of the configuration store.')
output endpoint string = configurationStore.outputs.endpoint

@description('The system-assigned managed identity principal ID.')
output systemAssignedMIPrincipalId string = configurationStore.outputs.?systemAssignedMIPrincipalId! ?? ''
