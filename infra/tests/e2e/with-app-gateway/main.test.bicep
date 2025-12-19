metadata name = 'Deployment with Application Gateway.'
metadata description = 'This instance deploys the module with Application Gateway and a self-signed TLS certificate.'

targetScope = 'subscription'

// ========== //
// Parameters //
// ========== //

@description('The short identifier for the kind of deployment. Should be kept short to not run into resource-name length-constraints.')
param serviceShort string = 'cagw'

@description('Optional. Unique suffix for resource names to avoid conflicts.')
param uniqueSuffix string = ''

@description('The password to leverage for the login.')
@secure()
param password string = newGuid()

@description('The location to deploy resources to.')
param location string = deployment().location

@description('The base64-encoded self-signed certificate for Application Gateway testing.')
@secure()
param base64Certificate string

// ============== //
// Test Execution //
// ============== //

var certificateName = 'appgwcert'

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
    vmAuthenticationType: 'password'
    vmJumpboxOSType: 'none'
    vmJumpBoxSubnetAddressPrefix: '10.1.2.32/27'
    spokeVNetAddressPrefixes: [
      '10.1.0.0/21'
    ]
    spokeInfraSubnetAddressPrefix: '10.1.0.0/23'
    spokePrivateEndpointsSubnetAddressPrefix: '10.1.2.0/27'
    spokeApplicationGatewaySubnetAddressPrefix: '10.1.3.0/24'
    deploymentSubnetAddressPrefix: '10.1.4.0/24'
    enableApplicationInsights: true
    exposeContainerAppsWith: 'applicationGateway'
    base64Certificate: base64Certificate
    applicationGatewayCertificateKeyName: certificateName
  }
}

output testDeploymentOutputs object = testDeployment.outputs
