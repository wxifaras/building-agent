# Azure Container Apps Landing Zone - Infrastructure

This folder contains the Azure Developer CLI (azd) infrastructure definition for deploying a comprehensive Azure Container Apps Landing Zone aligned with the Cloud Adoption Framework.

## Architecture Overview

This infrastructure deploys a production-ready, secure Azure Container Apps environment with:

- **Hub-and-Spoke Network Topology** with VNet peering
- **Private DNS Zones** for all supporting services
- **Centralized Identity Management** with RBAC assignments
- **Optional Private Endpoints** for all services
- **Application Gateway** for public-facing workloads (optional)
- **Comprehensive Monitoring** with Log Analytics and Application Insights

## What It Provisions

### Core Infrastructure Files

#### **main.bicep**

The main subscription-level deployment orchestrator that:

- Calls the naming module to generate consistent resource names
- Creates the spoke resource group
- Orchestrates deployment of all modules (networking, supporting services, Container Apps, App Gateway)
- Manages dependencies between modules
- Provides all output values

#### **main.bicepparam**

Default parameters file for Azure Developer CLI (`azd`) deployments with:

- Environment variable substitution (`${AZURE_LOCATION}`, `${AZURE_ENV_NAME}`)
- Default network CIDR ranges for spoke VNet
- Common configuration values

### Networking (deploy.spoke-vnet.bicep)

- **Spoke Virtual Network** with 4 subnets:
  - Infrastructure Subnet (snet-aca) - Azure Container Apps
  - Private Endpoints Subnet (snet-pep) - Private endpoints for all services
  - Application Gateway Subnet (snet-agw) - Application Gateway (optional)
  - Jumpbox Subnet (snet-vm) - Optional Linux/Windows jumpbox
- **Network Security Groups** for each subnet with security rules
- **Route Table** for traffic management
- **Log Analytics Workspace** with geo-replication support
- **VNet Peering** to hub network (if hub VNet provided)

### Supporting Services (deploy.supporting-services.bicep)

- **Azure Container Registry (ACR)** with optional agent pool
- **Azure Key Vault** for secrets and certificates
- **Azure Storage Account** with blob storage
- **Azure Cosmos DB** (optional) - NoSQL database
- **Azure Cache for Redis Enterprise** (optional)
- **Centralized Managed Identity** for Azure Container Apps
- **Private DNS Zones** (5 zones):
  - privatelink.vaultcore.azure.net
  - privatelink.blob.*.storage
  - privatelink.azurecr.io
  - privatelink.documents.azure.com
  - privatelink.redisenterprise.cache.azure.net

### Container Apps (deploy.aca-environment.bicep)

- **Azure Container Apps Environment** with workload profiles
- **Application Insights** (optional)
- **Private DNS Zone** for ACA (*.internal.[env-id].[region].azurecontainerapps.io)
- **Sample Container App** (optional)

### Application Gateway (deploy.app-gateway.bicep - optional)

- **Application Gateway v2** with WAF
- **Public IP** with optional DDoS protection
- **TLS Certificate** management (Key Vault integration)
- **Dedicated Managed Identity** for certificate access

## Key Features

### Security

✅ All services support **optional private endpoints** (enabled by default)  
✅ **Centralized managed identity** with least-privilege RBAC  
✅ **Network isolation** with NSGs and private DNS  
✅ **TLS certificate management** via Key Vault  
✅ **WAF protection** with OWASP rule sets (when App Gateway enabled)

### Scalability

✅ **Zone redundancy** for supported resources  
✅ **Workload profiles** for Container Apps  
✅ **Auto-scaling** capabilities  

### Observability

✅ **Centralized logging** with Log Analytics  
✅ **Application Insights** integration  
✅ **Diagnostic settings** on all resources  

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `spokeVNetAddressPrefixes` | array | CIDR ranges for spoke VNet (e.g., `["10.1.0.0/16"]`) |
| `spokeInfraSubnetAddressPrefix` | string | CIDR for ACA subnet (e.g., `10.1.0.0/23`) |
| `spokePrivateEndpointsSubnetAddressPrefix` | string | CIDR for private endpoints subnet |
| `spokeApplicationGatewaySubnetAddressPrefix` | string | CIDR for App Gateway subnet |
| `applicationGatewayCertificateKeyName` | string | Name for certificate in Key Vault |

### Optional Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `workloadName` | `aca-lza` | Workload name (2-10 chars) |
| `environment` | `test` | Environment name (e.g., dev, test, prod) |
| `location` | deployment location | Azure region |
| `hubVirtualNetworkResourceId` | empty | Hub VNet resource ID for peering |
| `bastionResourceId` | empty | Azure Bastion resource ID |
| `networkApplianceIpAddress` | empty | Network appliance IP for traffic routing |
| `exposeContainerAppsWith` | `applicationGateway` | Options: `applicationGateway`, `none` |
| `deploySampleApplication` | `false` | Deploy sample hello-world app |
| `enableApplicationInsights` | `true` | Enable Application Insights |
| `deployZoneRedundantResources` | `true` | Deploy zone-redundant resources |
| `deployAgentPool` | `true` | Deploy ACR agent pool |
| `vmJumpboxOSType` | `none` | Options: `linux`, `windows`, `none` |

## Usage

### Prerequisites

1. **Azure Developer CLI (azd)** installed - [Install azd](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
2. **Azure subscription** with required permissions
3. **Hub VNet** (optional) - If deploying as spoke in hub-and-spoke topology

### Basic Deployment

```bash
# Initialize environment
azd init

# Set environment variables
azd env set AZURE_LOCATION eastus

# Provision infrastructure
azd provision
```

### Custom Deployment with Hub VNet

```bash
# Set hub VNet resource ID
azd env set HUB_VNET_RESOURCE_ID "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Network/virtualNetworks/<vnet-name>"

# Set network parameters
azd env set SPOKE_VNET_ADDRESS_PREFIX "10.1.0.0/16"
azd env set SPOKE_INFRA_SUBNET_PREFIX "10.1.0.0/23"
azd env set SPOKE_PEP_SUBNET_PREFIX "10.1.2.0/24"
azd env set SPOKE_AGW_SUBNET_PREFIX "10.1.3.0/24"

# Provision
azd provision
```

### Deploy Without Application Gateway

```bash
# For internal-only workloads accessible via VPN
azd env set EXPOSE_CONTAINER_APPS_WITH "none"
azd provision
```

### Deploy with Jumpbox

```bash
# Deploy Linux jumpbox
azd env set VM_JUMPBOX_OS_TYPE "linux"
azd env set VM_ADMIN_PASSWORD "YourSecurePassword123!"

# Or Windows jumpbox
azd env set VM_JUMPBOX_OS_TYPE "windows"
azd env set VM_ADMIN_PASSWORD "YourSecurePassword123!"

azd provision
```

## Outputs

After successful deployment, key outputs include:

- `resourceGroupName` - Name of the resource group
- `containerRegistryLoginServer` - ACR login server URL
- `containerAppsEnvironmentName` - ACA environment name
- `keyVaultName` - Key Vault name
- `applicationGatewayPublicIp` - App Gateway public IP (if deployed)
- `logAnalyticsWorkspaceResourceId` - Log Analytics workspace ID

View all outputs:

```bash
azd show
```

## Architecture Decisions

### Centralized DNS Zones

Private DNS zones are created at the supporting services level and linked to both hub and spoke VNets. This follows Azure Landing Zone best practices for DNS integration at scale.

### Centralized Managed Identity

A single user-assigned managed identity is created for Azure Container Apps with specific RBAC role assignments:

- Key Vault Secrets User
- Storage Blob Data Contributor
- ACR Pull (AcrPull)
- Redis Enterprise Cache Contributor (conditional)
- App Configuration Data Reader (conditional)

### Optional Private Endpoints

All services support `enablePrivateEndpoint` parameter (defaults to `true`). When disabled (for dev/test), resources remain publicly accessible, reducing deployment time and cost.

### Hub VNet Not Created

This deployment assumes a hub VNet already exists (typical in Azure Landing Zone architectures). The spoke VNet peers with the hub when `hubVirtualNetworkResourceId` is provided.

## Network Access Patterns

### With Application Gateway

- **Public Access**: Internet → App Gateway → Container Apps
- **VPN Access**: VPN → Hub VNet → Spoke VNet → Container Apps

### Without Application Gateway (exposeContainerAppsWith = 'none')

- **VPN Access Only**: VPN → Hub VNet → Spoke VNet → Container Apps
- **Internal FQDN**: `myapp.internal.<env-id>.<region>.azurecontainerapps.io`

## Cost Optimization

- Disable Application Gateway for dev/test: `exposeContainerAppsWith = "none"`
- Disable ACR agent pool: `deployAgentPool = false`
- Disable private endpoints: Modify `enablePrivateEndpoint` in supporting services
- Skip jumpbox VM: `vmJumpboxOSType = "none"` (default)
- Disable Application Insights: `enableApplicationInsights = false`
- Deploy in non-zone-redundant regions: `deployZoneRedundantResources = false`

## Troubleshooting

### Check Deployment Errors

```bash
azd show
az deployment sub show -n <deployment-name>
```

### Validate Network Connectivity

```bash
# From jumpbox or VPN-connected machine
nslookup myapp.internal.<env-id>.<region>.azurecontainerapps.io
curl https://myapp.internal.<env-id>.<region>.azurecontainerapps.io
```

### View Container Apps Logs

```bash
az containerapp logs show \
  --name <app-name> \
  --resource-group <rg-name> \
  --follow
```

## Module Documentation

### Module Directory Structure

```
aca-lza/
├── main.bicep                          # Main subscription-level orchestrator
├── main.bicepparam                     # Default parameters for azd
├── README.md                           # This file
├── modules/
│   ├── common/
│   │   ├── naming.bicep                # Resource naming convention generator
│   │   └── naming-rules.json           # Naming abbreviations & region codes
│   ├── networking/
│   │   ├── deploy.spoke-vnet.bicep     # Spoke VNet, subnets, NSGs, routes
│   │   └── log-analytics.bicep         # Log Analytics workspace
│   ├── supporting-services/
│   │   ├── deploy.supporting-services.bicep    # Main supporting services orchestrator
│   │   ├── README.md                   # Supporting services documentation
│   │   └── modules/                    # Individual service modules
│   │       ├── app-config.bicep        # App Configuration service
│   │       ├── container-registry.bicep        # Azure Container Registry
│   │       ├── cosmos-document-db.bicep        # Azure Cosmos DB
│   │       ├── key-vault.bicep         # Azure Key Vault
│   │       ├── redis-managed.bicep     # Azure Cache for Redis Enterprise
│   │       └── storage.bicep           # Azure Storage Account
│   ├── container-apps/
│   │   ├── deploy.aca-environment.bicep        # ACA environment & workload profiles
│   │   ├── deploy.sample-application.bicep     # Sample hello-world container app
│   │   └── README.md                   # Container Apps documentation
│   ├── application-gateway/
│   │   ├── deploy.app-gateway.bicep            # App Gateway orchestrator
│   │   ├── app-gateway.module.bicep            # App Gateway configuration module
│   │   └── app-gateway-cert.bicep              # Certificate & Key Vault integration
│   └── compute/
│       ├── linux-vm.bicep              # Linux jumpbox (Ubuntu 22.04)
│       └── windows-vm.bicep            # Windows jumpbox (Server 2022)
├── scripts/
│   ├── generate-appgw-cert.ps1         # PowerShell script to generate self-signed cert
│   └── run-tests.ps1                   # Test automation script
└── tests/
    └── e2e/                            # End-to-end test scenarios
```

### Detailed Module Descriptions

#### **modules/common/naming.bicep**

Generates consistent, CAF-aligned resource names based on:

- Workload name
- Environment (dev/test/prod)
- Location
- Unique suffix (based on subscription ID)
- Resource type abbreviations from `naming-rules.json`

**Example output**: `rg-acalza-spoke-test-wus2`, `kv-acalza-test-wus2-abc123`

#### **modules/networking/deploy.spoke-vnet.bicep**

Creates the spoke virtual network with:

- Virtual network with customizable address space
- 5 subnets: Infrastructure, Private Endpoints, App Gateway, Jumpbox, Deployment
- Network Security Groups for each subnet with security rules
- Route table for traffic management
- Hub-spoke peering (when hub VNet provided)
- Log Analytics workspace integration

#### **modules/networking/log-analytics.bicep**

Deploys Log Analytics workspace with:

- Configurable retention period
- Optional geo-replication
- Diagnostic settings for network resources

#### **modules/supporting-services/deploy.supporting-services.bicep**

Orchestrates deployment of:

- Azure Container Registry with optional agent pool
- Azure Key Vault for secrets/certificates
- Azure Storage Account with blob containers
- Centralized managed identity with RBAC assignments
- Private DNS zones (5 zones)
- Private endpoints for all services (optional)
- Optional services: Cosmos DB, Redis Enterprise

**RBAC Assignments Created**:

- Key Vault Secrets User → Managed Identity
- Storage Blob Data Contributor → Managed Identity
- ACR Pull → Managed Identity
- (Conditional) Redis/Cosmos/App Config permissions

#### **modules/container-apps/deploy.aca-environment.bicep**

Creates the Container Apps environment with:

- Consumption + Dedicated workload profiles
- Integration with spoke infrastructure subnet
- Private DNS zone for internal FQDNs
- Optional Application Insights integration
- Diagnostic settings

#### **modules/container-apps/deploy.sample-application.bicep**

Deploys a sample "hello world" container app for testing:

- Uses `mcr.microsoft.com/k8se/quickstart:latest`
- Demonstrates managed identity usage
- HTTP ingress configuration
- Environment variable injection

#### **modules/application-gateway/deploy.app-gateway.bicep**

Subscription-level orchestrator that:

- Creates user-assigned managed identity for App Gateway
- Deploys TLS certificate management via `app-gateway-cert.bicep`
- Creates public IP address (standard SKU, zone-redundant)
- Calls `app-gateway.module.bicep` for App Gateway configuration
- Creates WAF (Web Application Firewall) policy with OWASP rules

#### **modules/application-gateway/app-gateway.module.bicep**

Configures Application Gateway v2 with:

- WAF_v2 SKU with configurable instance count (default: 3)
- Backend pool pointing to Container Apps environment
- HTTPS listener with TLS certificate from Key Vault
- HTTP health probe configuration
- SSL/TLS policy (minimum TLS 1.2, secure ciphers)
- Zone redundancy across availability zones
- Request/response rules for header manipulation

#### **modules/application-gateway/app-gateway-cert.bicep**

Manages TLS certificate storage and integration:

- Accepts PFX certificate data and password
- Stores certificate in Key Vault as secret
- Creates RBAC role assignment (Key Vault Secrets User) for App Gateway identity
- Outputs versioned Key Vault secret URI for App Gateway reference
- Handles cross-resource deployment (certificate managed at spoke level)
- Supports both self-signed (dev/test) and production certificates

#### **modules/compute/linux-vm.bicep**

Deploys Linux jumpbox VM with:

- Ubuntu 22.04 LTS latest image
- System-assigned managed identity
- SSH public key or password authentication
- Network interface in jumpbox subnet
- NSG with SSH (port 22) access rules
- Optional Azure Bastion integration
- Optional public IP address
- Cloud-init user data script support

#### **modules/compute/windows-vm.bicep**

Deploys Windows jumpbox VM with:

- Windows Server 2022 latest image
- System-assigned managed identity
- Password authentication (no SSH)
- Network interface in jumpbox subnet
- NSG with RDP (port 3389) access rules
- Optional Azure Bastion integration (recommended)
- Optional public IP address
- Custom script extension support (PowerShell/batch)

## Test Scenarios

End-to-end test scenarios are located in `tests/e2e/` and validate various deployment configurations:

### **tests/e2e/defaults/**

Basic deployment with minimal required resources:

- Spoke VNet only (no hub peering)
- All supporting services (ACR, Key Vault, Storage)
- Container Apps environment with consumption profile
- No jumpbox VM
- No Application Gateway
- No optional services (Cosmos, Redis, App Config)
- **Use case**: Quick validation, dev/test environments

### **tests/e2e/hub-spoke/**

Hub-and-spoke topology deployment:

- Spoke VNet with hub VNet peering
- Optional network appliance routing
- All supporting services with private endpoints
- Container Apps environment
- Optional Azure Bastion integration
- No jumpbox or App Gateway
- **Use case**: Enterprise network architectures, multi-spoke deployments

### **tests/e2e/with-jumpbox/**

Deployment including Linux jumpbox:

- Spoke VNet with Linux VM jumpbox
- SSH access for private resource troubleshooting
- All supporting services with private endpoints
- Container Apps environment
- Optional public IP on jumpbox for direct SSH access
- **Use case**: Private network access, SSH-based administration

### **tests/e2e/with-app-gateway/**

Full production-like deployment with Application Gateway:

- Spoke VNet with all subnets
- Application Gateway with WAF (v2 SKU)
- Self-signed TLS certificate (for testing)
- Public HTTPS endpoint to Container Apps
- All supporting services with private endpoints
- Application Insights enabled
- Zone-redundant resources (where supported)
- **Use case**: Public-facing applications, production validation

### Test Execution

Each test scenario includes:

- `main.test.bicep` or `main.bicepparam` - Test-specific parameters
- Parameter values optimized for validation (smaller SKUs, reduced costs)
- Separate deployment run from main infrastructure
- Diagnostic settings for troubleshooting

Run tests individually or via automation:

```powershell
# Run all tests
.\scripts\run-tests.ps1

# Run specific scenario
azd provision --config azure.yaml
```

---

## Related Documentation

- [Supporting Services](modules/supporting-services/README.md) - Detailed documentation on ACR, App Config, Key Vault, Storage, Redis, Cosmos
- [Container Apps](modules/container-apps/README.md) - Container Apps environment and app deployment
- [Networking](modules/networking/) - VNet, subnets, NSGs, routing
- [Application Gateway](modules/application-gateway/) - App Gateway, WAF, certificates

## Contributing

This infrastructure follows:

- **CAF Naming Convention** via naming.bicep
- **Azure Verified Modules (AVM)** where possible
- **Consistent deployment naming**: `${take(uniqueString(deployment().name, location),4)}-<resource-type>`
- **Standardized comment sections**: PARAMETERS, VARIABLES, RESOURCES, OUTPUTS

## License

See [LICENSE](../LICENSE) for details.
