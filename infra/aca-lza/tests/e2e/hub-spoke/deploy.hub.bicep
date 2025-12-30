// E2E Test: Hub VNet Deployment
// This creates a minimal hub VNet for testing hub-spoke topology

targetScope = 'subscription'

// ------------------
// PARAMETERS
// ------------------

@description('The location for the hub deployment')
param location string = deployment().location

@description('The hub VNet address prefix')
param hubVNetAddressPrefix string = '10.0.0.0/16'

@description('The hub gateway subnet address prefix')
param hubGatewaySubnetAddressPrefix string = '10.0.0.0/24'

@description('The environment name')
param environment string = 'test'

// ------------------
// VARIABLES
// ------------------

var hubResourceGroupName = 'rg-hub-${environment}-${location}'
var hubVNetName = 'vnet-hub-${environment}-${location}'

// ------------------
// RESOURCES
// ------------------

module hubResourceGroup 'br/public:avm/res/resources/resource-group:0.4.0' = {
  name: 'deploy-hub-rg-${uniqueString(deployment().name)}'
  params: {
    name: hubResourceGroupName
    location: location
    enableTelemetry: false
  }
}

module hubVNet 'br/public:avm/res/network/virtual-network:0.5.2' = {
  name: 'deploy-hub-vnet-${uniqueString(deployment().name)}'
  scope: resourceGroup(hubResourceGroupName)
  params: {
    name: hubVNetName
    location: location
    addressPrefixes: [hubVNetAddressPrefix]
    subnets: [
      {
        name: 'GatewaySubnet'
        addressPrefix: hubGatewaySubnetAddressPrefix
      }
    ]
    enableTelemetry: false
  }
  dependsOn: [
    hubResourceGroup
  ]
}

// ------------------
// OUTPUTS
// ------------------

@description('The resource ID of the hub VNet')
output hubVNetId string = hubVNet.outputs.resourceId

@description('The name of the hub resource group')
output hubResourceGroupName string = hubResourceGroupName

@description('The name of the hub VNet')
output hubVNetName string = hubVNetName
