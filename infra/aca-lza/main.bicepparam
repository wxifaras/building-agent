using './main.bicep'

// Location and naming
param location = readEnvironmentVariable('AZURE_LOCATION', 'westus2')
param workloadName = readEnvironmentVariable('workloadName', 'aca-lza')
param environment = readEnvironmentVariable('environment', 'dev')

// Network configuration
param spokeVNetAddressPrefixes = ['10.1.0.0/21']
param spokeInfraSubnetAddressPrefix = '10.1.0.0/23'
param spokePrivateEndpointsSubnetAddressPrefix = '10.1.2.0/27'
param spokeApplicationGatewaySubnetAddressPrefix = '10.1.3.0/24'
param vmJumpBoxSubnetAddressPrefix = '10.1.2.32/27'

// Virtual machine configuration
param vmJumpboxOSType = readEnvironmentVariable('vmJumpboxOSType', 'none')
param vmSize = readEnvironmentVariable('vmSize', 'Standard_D2s_v3')
param storageAccountType = readEnvironmentVariable('storageAccountType', 'Standard_LRS')

// Routing and networking options
param routeSpokeTrafficInternally = bool(readEnvironmentVariable('routeSpokeTrafficInternally', 'false'))

// Application configuration
param enableApplicationInsights = bool(readEnvironmentVariable('enableApplicationInsights', 'true'))
param applicationGatewayCertificateKeyName = readEnvironmentVariable('applicationGatewayCertificateKeyName', 'appgwcert')

// Deployment options
param deployZoneRedundantResources = bool(readEnvironmentVariable('deployZoneRedundantResources', 'true'))
param exposeContainerAppsWith = readEnvironmentVariable('exposeContainerAppsWith', 'none')
param deploySampleApplication = bool(readEnvironmentVariable('deploySampleApplication', 'false'))
param enableDdosProtection = bool(readEnvironmentVariable('enableDdosProtection', 'false'))
param deployAgentPool = bool(readEnvironmentVariable('deployAgentPool', 'true'))
param enableTelemetry = bool(readEnvironmentVariable('enableTelemetry', 'true'))

// Tags
param tags = {
  'azd-env-name': readEnvironmentVariable('AZURE_ENV_NAME', '')
}
