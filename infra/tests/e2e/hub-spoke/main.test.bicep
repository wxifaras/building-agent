metadata name = 'With Hub-Spoke Networking.'
metadata description = 'This instance deploys the module with hub-spoke network topology and VNet peering.'

targetScope = 'subscription'

// ========== //
// Parameters //
// ========== //

@description('A short identifier for the kind of deployment. Should be kept short to not run into resource-name length-constraints.')
param serviceShort string = 'cahub'

@description('Optional. Unique suffix for resource names to avoid conflicts.')
param uniqueSuffix string = ''

@description('The password to leverage for the login.')
@secure()
param password string = newGuid()

@description('The location to deploy resources to.')
param location string = deployment().location

// ============== //
// Test Execution //
// ============== //

// Step 1: Deploy hub VNet
module hubVNet './deploy.hub.bicep' = {
  name: '${uniqueString(deployment().name, location)}-hub-${serviceShort}'
  params: {
    location: location
    environment: 'test'
    hubVNetAddressPrefix: '10.0.0.0/16'
    hubGatewaySubnetAddressPrefix: '10.0.0.0/24'
  }
}

// Step 2: Deploy ACA Landing Zone with hub peering
module testDeployment '../../../main.bicep' = {
  name: '${uniqueString(deployment().name, location)}-test-${serviceShort}'
  params: {
    workloadName: '${serviceShort}${uniqueSuffix}'
    tags: {
      environment: 'test'
    }
    location: location
    vmSize: 'Standard_B1s'
    vmAdminPassword: password
    vmAuthenticationType: 'sshPublicKey'
    vmJumpboxOSType: 'none'
    vmJumpBoxSubnetAddressPrefix: '10.1.2.32/27'
    hubVirtualNetworkResourceId: hubVNet.outputs.hubVNetId
    spokeVNetAddressPrefixes: [
      '10.1.0.0/21'
    ]
    spokeInfraSubnetAddressPrefix: '10.1.0.0/23'
    spokePrivateEndpointsSubnetAddressPrefix: '10.1.2.0/27'
    spokeApplicationGatewaySubnetAddressPrefix: '10.1.3.0/24'
    deploymentSubnetAddressPrefix: '10.1.4.0/24'
    exposeContainerAppsWith: 'none'
    deploySampleApplication: true
    enableApplicationInsights: true    
    deployAgentPool: false
    routeSpokeTrafficInternally: false
  }
}

output testDeploymentOutputs object = testDeployment.outputs
