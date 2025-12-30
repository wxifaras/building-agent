targetScope = 'subscription'

@minLength(2)
@maxLength(10)
@description('The name of the workloard that is being deployed. Up to 10 characters long.')
param workloadName string

@description('The name of the resource group where the resources will be deployed.')
param spokeResourceGroupName string = ''

@description('The name of the environment (e.g. "dev", "test", "prod", "uat", "dr", "qa") Up to 8 characters long.')
@maxLength(8)
param environment string

@description('Location for all Resources.')
param location string

@description('a unique ID that can be appended (or prepended) in azure resource names that require some kind of uniqueness')
param uniqueId string


var naming = json(loadTextContent('./naming-rules.json'))

// get arbitary 5 first characters (instead of something like 5yj4yjf5mbg72), to save string length.
var uniqueIdShort = substring(uniqueId, 0, 5)
var resourceTypeToken = 'RES_TYPE'

// Define and adhere to a naming convention, such as: https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming
var namingBase = '${resourceTypeToken}-${workloadName}-${environment}-${naming.regionAbbreviations[toLower(location)]}'
var namingBaseUnique = '${resourceTypeToken}-${workloadName}-${uniqueIdShort}-${environment}-${naming.regionAbbreviations[toLower(location)]}'

// Used for hub resources - should be shared across different workloads
var namingBaseNoWorkloadName = '${resourceTypeToken}-${environment}-${naming.regionAbbreviations[toLower(location)]}'

var resourceTypeAbbreviations = naming.resourceTypeAbbreviations

var keyVaultName = take(replace(namingBaseUnique, resourceTypeToken, naming.resourceTypeAbbreviations.keyVault), 24)

var resourceNames = {
  resourceGroup: !empty(spokeResourceGroupName)
    ? spokeResourceGroupName
    : '${naming.resourceTypeAbbreviations.resourceGroup}-${workloadName}-spoke-${environment}-${naming.regionAbbreviations[toLower(location)]}'
  vnetSpoke: '${replace(namingBase, resourceTypeToken, naming.resourceTypeAbbreviations.virtualNetwork)}-spoke'
  vnetHub: '${replace(namingBaseNoWorkloadName, resourceTypeToken, naming.resourceTypeAbbreviations.virtualNetwork)}-hub'
  applicationGateway: replace(namingBase, resourceTypeToken, naming.resourceTypeAbbreviations.applicationGateway)
  applicationGatewayPip: '${naming.resourceTypeAbbreviations.publicIpAddress}-${replace(namingBase, resourceTypeToken, naming.resourceTypeAbbreviations.applicationGateway)}'
  applicationGatewayUserAssignedIdentity: '${naming.resourceTypeAbbreviations.managedIdentity}-${replace(namingBase, resourceTypeToken, naming.resourceTypeAbbreviations.applicationGateway)}-KeyVaultSecretUser'
  applicationGatewayNsg: '${naming.resourceTypeAbbreviations.networkSecurityGroup}-${replace(namingBase, resourceTypeToken, naming.resourceTypeAbbreviations.applicationGateway)}'
  pepNsg: '${naming.resourceTypeAbbreviations.networkSecurityGroup}-${replace(namingBase, resourceTypeToken, naming.resourceTypeAbbreviations.privateEndpoint)}'
  applicationInsights: replace(namingBase, resourceTypeToken, naming.resourceTypeAbbreviations.applicationInsights)
  containerAppsEnvironment: replace(
    namingBase,
    resourceTypeToken,
    naming.resourceTypeAbbreviations.containerAppsEnvironment
  )
  containerAppsEnvironmentNsg: '${naming.resourceTypeAbbreviations.networkSecurityGroup}-${replace(namingBase, resourceTypeToken, naming.resourceTypeAbbreviations.containerAppsEnvironment)}'
  containerRegistry: take(
    toLower(replace(
      replace(namingBaseUnique, resourceTypeToken, naming.resourceTypeAbbreviations.containerRegistry),
      '-',
      ''
    )),
    50
  )
  containerRegistryPep: '${naming.resourceTypeAbbreviations.privateEndpoint}-${toLower( replace ( replace(namingBaseUnique, resourceTypeToken, naming.resourceTypeAbbreviations.containerRegistry), '-', '' ) )}'
  acaUserAssignedIdentity: '${naming.resourceTypeAbbreviations.managedIdentity}-aca-${workloadName}-${environment}-${naming.regionAbbreviations[toLower(location)]}'
  redisCache: replace(namingBase, resourceTypeToken, naming.resourceTypeAbbreviations.redisCache)
  redisCachePep: '${naming.resourceTypeAbbreviations.privateEndpoint}-${replace ( namingBaseUnique, resourceTypeToken, naming.resourceTypeAbbreviations.redisCache )}'
  cosmosDbNoSql: toLower(take(
    replace(namingBaseUnique, resourceTypeToken, naming.resourceTypeAbbreviations.cosmosDbNoSql),
    44
  ))
  cosmosDbNoSqlPep: '${naming.resourceTypeAbbreviations.privateEndpoint}-${toLower( take(replace(namingBaseUnique, resourceTypeToken, naming.resourceTypeAbbreviations.cosmosDbNoSql), 44) )}'
  keyVault: endsWith(keyVaultName, '-') ? take(keyVaultName, 23) : keyVaultName
  keyVaultPep: '${naming.resourceTypeAbbreviations.privateEndpoint}-${replace ( namingBaseUnique, resourceTypeToken, naming.resourceTypeAbbreviations.keyVault )}'
  logAnalyticsWorkspace: replace(namingBase, resourceTypeToken, naming.resourceTypeAbbreviations.logAnalyticsWorkspace)
  routeTable: replace(namingBase, resourceTypeToken, naming.resourceTypeAbbreviations.routeTable)
  storageAccount: toLower(take(
    replace(replace(namingBaseUnique, resourceTypeToken, naming.resourceTypeAbbreviations.storageAccount), '-', ''),
    24
  ))
  storageAccountPep: '${naming.resourceTypeAbbreviations.privateEndpoint}-${toLower( replace(namingBaseUnique, resourceTypeToken, naming.resourceTypeAbbreviations.storageAccount))}'
  vmJumpBox: replace(namingBaseNoWorkloadName, resourceTypeToken, naming.resourceTypeAbbreviations.virtualMachine)
  vmJumpBoxNsg: '${naming.resourceTypeAbbreviations.networkSecurityGroup}-${replace(namingBase, resourceTypeToken, naming.resourceTypeAbbreviations.virtualMachine)}'
  vmJumpBoxNic: '${naming.resourceTypeAbbreviations.networkInterface}-${replace(namingBaseNoWorkloadName, resourceTypeToken, naming.resourceTypeAbbreviations.virtualMachine)}'
  workloadCertificate: '${workloadName}-cert'
  acrDeploymentPoolNsg: '${naming.resourceTypeAbbreviations.networkSecurityGroup}-${replace(namingBase, resourceTypeToken, 'deploymentpool')}'
}

output resourcesNames object = resourceNames
output resourceTypeAbbreviations object = resourceTypeAbbreviations
