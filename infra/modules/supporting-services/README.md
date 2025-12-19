# Supporting Services

This module deploys all supporting services required by the Azure Container Apps landing zone. These resources have a lifecycle longer than any of your application platform components and serve as dependencies for Azure Container Apps and applications.

## Overview

The supporting services module follows Azure best practices by centralizing shared infrastructure components that multiple application stamps may use. All resources are deployed to the spoke resource group.

## Resources Deployed

### Infrastructure Components

- **Azure Container Registry (ACR)** - Container image storage with optional private endpoint
- **Azure Key Vault** - Secrets and certificate management with optional private endpoint
- **Azure Storage Account** - Blob storage with optional private endpoint
- **Azure Cosmos DB** (Optional) - NoSQL database with optional private endpoint
- **Azure Cache for Redis Enterprise** (Optional) - Managed Redis cache with optional private endpoint
- **Azure App Configuration** (Optional) - Centralized configuration management

### Networking

- **Private DNS Zones** (Centralized):
  - `privatelink.vaultcore.azure.net` (Key Vault)
  - `privatelink.blob.*.storage` (Storage Account)
  - `privatelink.azurecr.io` (Container Registry)
  - `privatelink.documents.azure.com` (Cosmos DB)
  - `privatelink.redisenterprise.cache.azure.net` (Redis)
- **Private Endpoints** - For each supporting service (optional, enabled by default)
- **VNet Links** - DNS zones linked to both hub and spoke VNets

### Identity & Access

- **Centralized User-Assigned Managed Identity** - Single identity for Azure Container Apps with RBAC assignments:
  - Key Vault Secrets User
  - Storage Blob Data Contributor
  - ACR Pull (AcrPull)
  - Redis Enterprise Cache Contributor (conditional)
  - App Configuration Data Reader (conditional)

## Architecture Decisions

### Centralized DNS Zones

Private DNS zones are created in the supporting services module and linked to both hub and spoke VNets. This follows Azure Landing Zone best practices for DNS integration at scale while keeping the implementation simple.

### Centralized Identity

A single user-assigned managed identity is created for Azure Container Apps to access all supporting services. This reduces complexity and follows the principle of least privilege through specific RBAC role assignments.

### Optional Private Endpoints

All services support the `enablePrivateEndpoint` parameter (defaults to `true`). When enabled:

- Private endpoints are created in the spoke private endpoint subnet
- `publicNetworkAccess` is set to `Disabled`
- Network ACLs are configured to deny public access

When disabled (for development/testing):

- Resources remain publicly accessible
- No private endpoints are created
- Reduces deployment time and cost

## Module Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `resourcesNames` | object | Yes | - | Resource naming configuration from naming module |
| `location` | string | Yes | - | Azure region for resource deployment |
| `tags` | object | No | `{}` | Tags to apply to all resources |
| `enableTelemetry` | bool | Yes | - | Enable/disable deployment telemetry |
| `spokePrivateEndpointSubnetResourceId` | string | Yes | - | Subnet for private endpoints |
| `spokeVNetResourceId` | string | Yes | - | Spoke VNet resource ID for DNS zone linking |
| `hubVNetResourceId` | string | Yes | - | Hub VNet resource ID for DNS zone linking |
| `logAnalyticsWorkspaceId` | string | Yes | - | Log Analytics workspace for diagnostics |
| `deployAgentPool` | bool | No | `true` | Deploy ACR agent pool for internal builds |

## Module Outputs

| Output | Type | Description |
|--------|------|-------------|
| `acaUserAssignedIdentityId` | string | Resource ID of centralized ACA managed identity |
| `acaUserAssignedIdentityPrincipalId` | string | Principal ID of centralized ACA managed identity |
| `keyVaultResourceId` | string | Resource ID of Key Vault |
| `keyVaultName` | string | Name of Key Vault |
| `containerRegistryId` | string | Resource ID of Container Registry |
| `containerRegistryName` | string | Name of Container Registry |
| `containerRegistryLoginServer` | string | Login server URL for Container Registry |
| `containerRegistryAgentPoolName` | string | Name of ACR agent pool (if deployed) |
| `storageAccountResourceId` | string | Resource ID of Storage Account |
| `storageAccountName` | string | Name of Storage Account |

## Dependencies

This module depends on:

- **Networking Module** - Spoke VNet with private endpoint subnet
- **Naming Module** - CAF-compliant resource naming

## Usage Example

```bicep
module supportingServices 'modules/supporting-services/deploy.supporting-services.bicep' = {
  name: '${take(uniqueString(deployment().name, location),4)}-supportingServices'
  params: {
    resourcesNames: naming.outputs.resourcesNames
    location: location
    tags: tags
    enableTelemetry: true
    spokePrivateEndpointSubnetResourceId: spoke.outputs.spokePrivateEndpointsSubnetResourceId
    spokeVNetResourceId: spoke.outputs.spokeVNetId
    hubVNetResourceId: hubVirtualNetworkResourceId
    logAnalyticsWorkspaceId: spoke.outputs.logAnalyticsWorkspaceId
    deployAgentPool: true
  }
}
```

## Conditional Deployments

### Cosmos DB

Cosmos DB is deployed conditionally based on the `enableCosmosDb` variable in the module (currently set to `false` by default).

### Redis Enterprise

Redis is deployed conditionally based on the `enableRedis` variable in the module (currently set to `false` by default).

### App Configuration

App Configuration can be enabled by modifying the module parameters.

## Security Features

### Private Endpoints

- All supporting services support optional private endpoints
- Private endpoints are deployed to the spoke private endpoint subnet
- DNS resolution handled through centralized private DNS zones

### Network Isolation

- When private endpoints are enabled:
  - `publicNetworkAccess` set to `Disabled`
  - Network ACLs configured to deny public access
  - Access only through private endpoints within VNet

### RBAC

- Centralized managed identity with least-privilege RBAC assignments
- Service-specific roles (Key Vault Secrets User, ACR Pull, etc.)
- No shared secrets or connection strings needed

## Cost Optimization

- ACR agent pool is optional (`deployAgentPool` parameter)
- Cosmos DB and Redis are conditionally deployed
- Private endpoints can be disabled for dev/test environments
- Zone-redundant storage configurable per environment

## Best Practices Implemented

✅ **CAF Naming Convention** - All resources follow Azure naming standards
✅ **Private DNS Zones** - Centralized at supporting services level
✅ **Hub-Spoke Topology** - DNS zones linked to both hub and spoke
✅ **Least Privilege** - Single identity with specific RBAC roles
✅ **Optional Private Endpoints** - Flexibility for different environments
✅ **Diagnostic Settings** - Logging enabled for all services
✅ **Zone Redundancy** - Support for availability zones where applicable
