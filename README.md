# Azure Container Apps Landing Zone Accelerator

This repository contains an enterprise-ready **Azure Container Apps Landing Zone** implementation using **Azure Verified Modules (AVM)** patterns, deployed with **Azure Developer CLI** (`azd`) and **Bicep**.

## Overview

This solution deploys a production-ready Azure Container Apps environment with:

- **Hub-Spoke Network Topology** (optional)
- **Private Endpoints** for all supporting services
- **DNS Private Zones** for Azure services
- **Application Gateway with WAF** (optional)
- **Jump Box** VM for secure access (optional)
- **Azure Firewall** routing support (optional)

## Architecture

The infrastructure follows the [Azure Container Apps Landing Zone Accelerator (ACA-LZA)](https://aka.ms/aca-lza) pattern with:

- **Spoke VNet** with dedicated subnets (infrastructure, private endpoints, application gateway, deployment scripts)
- **Azure Container Registry** with managed identity access
- **Key Vault** for secrets and certificates
- **Log Analytics Workspace** for monitoring
- **Application Insights** for application telemetry (optional)
- **Storage Account** for deployment scripts
- **Sample Container App** deployment (optional)

## Prerequisites

- **Azure CLI** (`az`) - [Install](https://learn.microsoft.com/cli/azure/install-azure-cli)
- **Azure Developer CLI** (`azd`) - [Install](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
- **Azure Subscription** with Contributor access
- **PowerShell 7+** (for E2E tests on Windows)

## Quick Start

### 1. Deploy with Azure Developer CLI

```powershell
# Clone the repository
git clone <repo-url>
cd building-agent

# Login to Azure
azd auth login

# Create a new environment
azd env new <environment-name>
# Example: azd env new aca-test-eastus2

# Deploy infrastructure
azd up
```

The `azd up` command will:

1. Prompt for Azure location (e.g., eastus2)
2. Create a resource group
3. Deploy all infrastructure using Bicep
4. Output deployment results

### 2. Configuration

Edit [azure.yaml](azure.yaml) to customize:

- **Network CIDRs**: Spoke VNet and subnet address spaces
- **Features**: Application Gateway, Application Insights, Jump Box, Sample App
- **Zone Redundancy**: Multi-AZ deployment for supported regions
- **Workload Name**: Up to 10 characters for resource naming

Key parameters:

```yaml
parameters:
  workloadName: "aca-lza"               # Resource naming prefix
  environment: "dev"                    # Environment tag (dev/test/prod)
  spokeVNetAddressPrefixes: ["10.1.0.0/21"]
  deploySampleApplication: true         # Deploy hello-world container
  exposeContainerAppsWith: "none"       # "applicationGateway" or "none"
  vmJumpboxOSType: "none"               # "linux", "windows", or "none"
```

## Testing

### End-to-End Tests

The repository includes comprehensive E2E infrastructure tests in `infra/tests/e2e/`:

**Test Scenarios:**

- `defaults` - Minimal deployment without ingress
- `hub-spoke` - Hub-spoke topology with VNet peering
- `with-app-gateway` - Application Gateway with self-signed TLS certificate
- `with-jumpbox` - Linux jump box VM

**Run tests:**

```powershell
cd infra/tests/e2e

# Run specific scenario (certificate auto-generated for app-gateway tests)
.\run-tests.ps1 -Location westus2 -TestScenario defaults -TimeoutMinutes 20

# Run all scenarios
.\run-tests.ps1 -Location westus2 -TestScenario all -TimeoutMinutes 60

# Auto-cleanup after test
.\run-tests.ps1 -Location westus2 -TestScenario defaults -Cleanup
```

**Note:** The test script automatically generates a self-signed certificate for scenarios that deploy Application Gateway. No manual certificate generation needed.

## What Gets Deployed

### Core Infrastructure

| Resource | Purpose |
|----------|---------|
| **Resource Group** | Container for all resources |
| **Spoke VNet** | Isolated virtual network with 4 subnets |
| **Log Analytics Workspace** | Centralized logging and monitoring |
| **DNS Private Zones** | Private DNS for Key Vault, ACR, Storage, Cosmos DB, Redis |

### Supporting Services

| Resource | Purpose |
|----------|---------|
| **Azure Container Registry** | Private container image registry |
| **Key Vault** | Secrets, keys, and certificate management |
| **Storage Account** | Deployment scripts and data storage |
| **Managed Identity** | Secure access to ACR from Container Apps |

### Container Apps Platform

| Resource | Purpose |
|----------|---------|
| **Container Apps Environment** | Managed Kubernetes environment |
| **Sample Container App** | Hello-world application (optional) |
| **Application Insights** | APM and distributed tracing (optional) |

### Optional Components

| Resource | Purpose | Parameter |
|----------|---------|-----------|
| **Application Gateway** | WAF + ingress controller | `exposeContainerAppsWith: "applicationGateway"` |
| **Jump Box VM** | Secure admin access | `vmJumpboxOSType: "linux"` or `"windows"` |
| **Hub VNet Peering** | Connect to hub network | `hubVirtualNetworkResourceId: "<hub-vnet-id>"` |
| **Azure Firewall Routing** | Centralized egress | `networkApplianceIpAddress: "<firewall-ip>"` |

## Resource Naming

Resources follow Azure naming best practices with this pattern:

```
{resourceType}-{workloadName}-{component}-{environment}-{region}
```

Example:

- Resource Group: `rg-aca-lza-spoke-dev-eus2`
- Container Registry: `cracalzadeveus2`
- Key Vault: `kv-aca-lza-dev-eus2`

## Network Configuration

### Default Network Layout

```
Spoke VNet: 10.1.0.0/21 (2,048 IPs)
├── Infrastructure Subnet: 10.1.0.0/23 (512 IPs) - Container Apps
├── Private Endpoints Subnet: 10.1.2.0/27 (32 IPs) - Private endpoints
├── App Gateway Subnet: 10.1.3.0/24 (256 IPs) - Application Gateway
└── Deployment Subnet: 10.1.4.0/24 (256 IPs) - Deployment scripts
```

### Hub-Spoke Topology (Optional)

When `hubVirtualNetworkResourceId` is provided:

- Spoke VNet peers with Hub VNet
- DNS zones linked to both hub and spoke
- Optional routing through Azure Firewall
- Bastion access support for Jump Box

## Project Structure

```
building-agent/
├── azure.yaml                    # azd configuration
├── infra/
│   ├── main.bicep                # Main entry point
│   ├── modules/
│   │   ├── common/               # Naming conventions
│   │   ├── networking/           # VNet, subnets, NSGs, route tables
│   │   ├── supporting-services/  # ACR, Key Vault, Storage, DNS
│   │   ├── container-apps/       # ACA environment and sample app
│   │   └── application-gateway/  # App Gateway with WAF
│   ├── tests/
│   │   └── e2e/                  # End-to-end test scenarios
│   └── scripts/                  # Helper scripts
└── src/                             # Application source code
    ├── auth-nodejs-quickstart/      # Node.js API with Cosmos DB
    ├── auth-reactmsal-quickstart/   # React frontend with MSAL
    └── cosmos-db-nosql-nodejs-quickstart/  # Cosmos DB examples
```

## Next Steps

After deployment:

1. **View outputs**: `azd env get-values` or check Azure Portal
2. **Deploy applications**: Build and push images to ACR, deploy to Container Apps
3. **Configure DNS**: Point custom domain to Application Gateway (if deployed)
4. **Set up monitoring**: Configure alerts in Log Analytics and Application Insights
5. **Review security**: Validate NSG rules, private endpoints, and Key Vault access policies

## Documentation

- [ACA Landing Zone Accelerator](https://aka.ms/aca-lza)
- [Azure Verified Modules](https://aka.ms/avm)
- [Container Apps Documentation](https://learn.microsoft.com/azure/container-apps/)
- [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/)

## Troubleshooting

### Common Issues

**Azure CLI "content already consumed" error:**

- Update Azure CLI: `az upgrade`
- Use `azd` instead of `az` for deployments
- Use parameter files instead of inline parameters

**Quota limits:**

- Check regional quota: `az vm list-usage --location <region>`
- Request quota increase if needed
- Use regions with available capacity (eastus2, westus2)

**Deployment timeouts:**

- Verify all required parameters are provided
- Check Bicep file validation: `az bicep build --file infra/main.bicep`
- Review deployment logs in Azure Portal

## Contributing

Contributions welcome! Please:

1. Test changes with E2E tests
2. Update documentation
3. Follow Azure naming conventions
4. Validate Bicep files before committing

## License

See [LICENSE](LICENSE) file.
