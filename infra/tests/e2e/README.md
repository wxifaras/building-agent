# End-to-End Tests

This directory contains end-to-end (e2e) tests for the Azure Container Apps Landing Zone infrastructure deployment. Each test scenario validates different deployment configurations.

## Test Scenarios

### 1. defaults/

**Basic deployment with minimal configuration**

- No hub VNet peering
- No Application Gateway (internal only)
- No jumpbox VM
- Sample application deployed
- ACR agent pool disabled (for speed)

**Use case**: Quick validation of core infrastructure components

```bash
az deployment sub create \
  --location eastus \
  --template-file tests/e2e/defaults/main.test.bicep
```

### 2. hub-spoke/

**Hub-and-spoke topology with VNet peering**

- Deploys test hub VNet
- Configures VNet peering
- Tests DNS integration across hub and spoke
- Internal-only access (no App Gateway)

**Use case**: Validate hub-spoke networking and DNS resolution

```bash
az deployment sub create \
  --location eastus \
  --template-file tests/e2e/hub-spoke/main.test.bicep
```

### 3. with-app-gateway/

**Public-facing deployment with Application Gateway**

- Application Gateway with WAF
- Self-signed certificate (auto-generated)
- Public IP with routing to Container Apps
- Zone-redundant disabled for faster deployment

**Use case**: Validate public access pattern and App Gateway integration

```bash
az deployment sub create \
  --location eastus \
  --template-file tests/e2e/with-app-gateway/main.test.bicep
```

### 4. with-jumpbox/

**Internal deployment with Linux jumpbox**

- Linux VM with password authentication
- Tests internal network access from jumpbox
- No Application Gateway (VPN-style access)

**Use case**: Validate internal access pattern and VM deployment

```bash
az deployment sub create \
  --location eastus \
  --template-file tests/e2e/with-jumpbox/main.test.bicep \
  --parameters vmAdminPassword="YourSecurePassword123!"
```

## Test Infrastructure

Each test:

- ✅ Deploys isolated infrastructure (no conflicts with other tests)
- ✅ Uses unique resource naming via `uniqueString(deployment().name)`
- ✅ Includes comprehensive outputs for validation
- ✅ Disables telemetry for clean test runs
- ✅ Uses cost-optimized settings where possible

## Running Tests

### Prerequisites

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "<subscription-id>"
```

### Run All Tests

```bash
# Run each test scenario
for test in defaults hub-spoke with-app-gateway with-jumpbox; do
  echo "Running test: $test"
  az deployment sub create \
    --location eastus \
    --template-file "tests/e2e/$test/main.test.bicep" \
    --name "test-$test-$(date +%Y%m%d-%H%M%S)"
done
```

### Validate Test Results

```bash
# Check deployment status
az deployment sub show \
  --name "test-defaults-<timestamp>" \
  --query "properties.provisioningState"

# Get outputs
az deployment sub show \
  --name "test-defaults-<timestamp>" \
  --query "properties.outputs"
```

### Cleanup Test Resources

```bash
# List test resource groups
az group list \
  --query "[?starts_with(name, 'rg-aca-e2e')].name" \
  --output tsv

# Delete specific test resources
az group delete --name "rg-aca-e2e-test-eastus" --yes --no-wait
```

## Test Validation

After deployment, validate:

### 1. Network Connectivity

```bash
# Get ACA environment details
RG_NAME=$(az deployment sub show -n <deployment-name> --query "properties.outputs.resourceGroupName.value" -o tsv)
ACA_ENV=$(az deployment sub show -n <deployment-name> --query "properties.outputs.containerAppsEnvironmentName.value" -o tsv)

# Check ACA environment status
az containerapp env show \
  --name $ACA_ENV \
  --resource-group $RG_NAME \
  --query "properties.provisioningState"
```

### 2. Private DNS Resolution (hub-spoke test)

```bash
# From jumpbox or VPN-connected machine
nslookup myapp.internal.<env-id>.eastus.azurecontainerapps.io
```

### 3. Application Gateway Health (with-app-gateway test)

```bash
# Check backend health
az network application-gateway show-backend-health \
  --name <agw-name> \
  --resource-group $RG_NAME
```

### 4. Sample App Access

```bash
# Get sample app FQDN
az containerapp show \
  --name ca-simple-hello \
  --resource-group $RG_NAME \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv
```

## Expected Results

| Test Scenario | Resources Deployed | Deployment Time | Cost (USD/day) |
|---------------|-------------------|-----------------|----------------|
| defaults | ~15 resources | ~10 min | ~$5 |
| hub-spoke | ~20 resources | ~12 min | ~$6 |
| with-app-gateway | ~25 resources | ~15 min | ~$10 |
| with-jumpbox | ~18 resources | ~12 min | ~$7 |

*Cost estimates are approximate and based on East US region*

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on:
  pull_request:
    paths:
      - 'infra/**'
  workflow_dispatch:

jobs:
  test-defaults:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Run Default Test
        run: |
          az deployment sub create \
            --location eastus \
            --template-file tests/e2e/defaults/main.test.bicep \
            --name "test-${{ github.run_number }}"
      
      - name: Cleanup
        if: always()
        run: |
          RG_NAME=$(az deployment sub show -n "test-${{ github.run_number }}" --query "properties.outputs.resourceGroupName.value" -o tsv)
          az group delete --name $RG_NAME --yes --no-wait
```

## Troubleshooting

### Deployment Fails with Quota Error

Reduce zone redundancy:

```bicep
deployZoneRedundantResources: false
```

### Hub VNet Peering Fails

Ensure non-overlapping address spaces:

- Hub: 10.0.0.0/16
- Spoke: 10.1.0.0/16

### Application Gateway Backend Unhealthy

Check NSG rules on ACA subnet allow traffic from App Gateway subnet.

## Contributing

When adding new tests:

1. Create new folder under `tests/e2e/<scenario-name>/`
2. Add `main.test.bicep` with clear documentation
3. Update this README with the new test scenario
4. Ensure test uses cost-optimized settings
5. Validate test runs successfully end-to-end
