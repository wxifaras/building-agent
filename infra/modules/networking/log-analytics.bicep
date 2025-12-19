targetScope = 'resourceGroup'

// =================================================================================================
// PARAMETERS
// =================================================================================================

@description('Required. The resource names definition')
param resourcesNames object

@description('The location where the resources will be created. This should be the same region as the hub.')
param location string

@description('Optional. The tags to be assigned to the created resources.')
param tags object = {}

// =================================================================================================
// VARIABLES
// =================================================================================================

// =================================================================================================
// RESOURCES
// =================================================================================================

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2025-02-01' = {
  name: resourcesNames.logAnalyticsWorkspace
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      searchVersion: '2'
    }
  }
}

// =================================================================================================
// OUTPUTS
// =================================================================================================

output resourceId string = logAnalyticsWorkspace.id
