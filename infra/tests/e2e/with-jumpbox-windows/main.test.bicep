metadata name = 'With Windows Jumpbox.'
metadata description = 'This instance deploys the module with a Windows jumpbox VM for internal access.'

targetScope = 'subscription'

// ========== //
// Parameters //
// ========== //

@description('A short identifier for the kind of deployment. Should be kept short to not run into resource-name length-constraints.')
param serviceShort string = 'cajbxw'

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

module testDeployment '../../../main.bicep' = {
  name: '${uniqueString(deployment().name, location)}-test-${serviceShort}'
  params: {
    workloadName: '${serviceShort}${uniqueSuffix}'
    tags: {
      environment: 'test'
    }
    location: location
    vmSize: 'Standard_D2s_v3'
    vmAdminPassword: password
    vmAuthenticationType: 'password'
    vmJumpboxOSType: 'windows'
    deployZoneRedundantResources: false    
    vmJumpBoxSubnetAddressPrefix: '10.1.2.32/27'
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
  }
}

// ========== //
// Outputs //
// ========== //
