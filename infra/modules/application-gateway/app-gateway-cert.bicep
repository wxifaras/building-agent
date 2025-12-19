
targetScope = 'resourceGroup'

// ------------------
//    PARAMETERS
// ------------------
@description('The name of the key vault where the certificate will be stored.')
param keyVaultName string

@description('The application gateway principal id that needs access to key vault to read the certificate.')
param appGatewayUserAssignedIdentityPrincipalId string

@description('The certificate key name to be used in the key vault.')
param appGatewayCertificateKeyName string

@description('Required. The base64-encoded PFX certificate data to be stored in the key vault.')
@secure()
param appGatewayCertificateData string

@description('Optional. The tags to be assigned to the created resources.')
param tags object = {}

// ------------------
// VARIABLES
// ------------------
var keyVaultSecretUserRoleGuid = '4633458b-17de-408a-b874-0445c86b69e6'

// ------------------
// RESOURCES
// ------------------

resource keyVault 'Microsoft.KeyVault/vaults@2024-04-01-preview' existing = {
  name: keyVaultName
}

resource sslCertSecret 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = {
  parent: keyVault
  name: appGatewayCertificateKeyName
  tags: tags
  properties: {
    value: appGatewayCertificateData
    contentType: 'application/x-pkcs12'
    attributes: {
      enabled: true
    }
  }
}

// Assign the App Gateway user assigned identity the role to read the secret
resource keyvaultSecretUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(subscription().id, keyVault.id, appGatewayUserAssignedIdentityPrincipalId, 'KeyVaultSecretUser')
  scope: keyVault
  properties: {
    principalId: appGatewayUserAssignedIdentityPrincipalId
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretUserRoleGuid)
    principalType: 'ServicePrincipal'
  }
}

// Use secretUriWithVersion for proper authentication - App Gateway needs the versioned URI
output SecretUri string = sslCertSecret.properties.secretUriWithVersion
