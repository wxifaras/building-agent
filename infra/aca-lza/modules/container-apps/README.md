# Azure Container Apps Environment

This module deploys the Azure Container Apps Environment along with supporting infrastructure for logging and observability.

## Expected Results

The application platform, Azure Container Apps, and its logging integration within Azure Monitor will be deployed. This includes:

- **Container Apps Environment** with workload profiles (consumption and dedicated)
- **Log Analytics Workspace** integration for centralized logging
- **Application Insights** (optional) for advanced monitoring
- **Private DNS Zone** for internal Container Apps FQDN resolution

### Resources Deployed

- Container Apps Environment
- Log Analytics Workspace (linked)
- Application Insights (optional)
- Private DNS Zone for Container Apps internal domain

## Module Files

- **deploy.aca-environment.bicep** - Main module orchestrator
- **deploy.sample-application.bicep** - Optional sample hello-world container app

## Parameters

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `location` | string | Azure region for deployment |
| `spokeVNetName` | string | Name of the spoke VNet |
| `spokeResourceGroupName` | string | Name of the spoke resource group |
| `spokeInfraSubnetId` | string | Resource ID of the infrastructure subnet |
| `logAnalyticsWorkspaceId` | string | Resource ID of Log Analytics workspace |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `workloadName` | string | `aca-lza` | Workload identifier (2-10 chars) |
| `environment` | string | `test` | Environment name (dev, test, prod) |
| `enableApplicationInsights` | bool | `true` | Deploy Application Insights |
| `deploySampleApplication` | bool | `false` | Deploy sample hello-world app |
| `containerAppsEnvironmentName` | string | generated | Custom environment name |

## Usage

This module is called by the main orchestrator (`main.bicep`) with all necessary parameters. To deploy independently:

```bash
# Set variables
LOCATION="eastus"
SPOKE_RG="rg-aca-lza-spoke-test"
SPOKE_VNET="vnet-aca-lza-spoke"
INFRA_SUBNET_ID="/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Network/virtualNetworks/{vnet}/subnets/snet-aca"
LAW_ID="/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{workspace}"

# Deploy
az deployment group create \
  --resource-group $SPOKE_RG \
  --template-file deploy.aca-environment.bicep \
  --parameters \
    location=$LOCATION \
    spokeVNetName=$SPOKE_VNET \
    spokeResourceGroupName=$SPOKE_RG \
    spokeInfraSubnetId=$INFRA_SUBNET_ID \
    logAnalyticsWorkspaceId=$LAW_ID \
    enableApplicationInsights=true \
    deploySampleApplication=true
```

## Sample Application

If `deploySampleApplication=true`, a sample container app is deployed:

- **Image**: `mcr.microsoft.com/k8se/quickstart:latest`
- **FQDN**: `myapp.internal.<env-id>.<region>.azurecontainerapps.io`
- **Ingress**: HTTP enabled, publicly accessible within VNet
- **Identity**: Uses centralized managed identity from supporting services

## Outputs

| Output | Type | Description |
|--------|------|-------------|
| `containerAppsEnvironmentId` | string | Resource ID of the ACA environment |
| `containerAppsEnvironmentName` | string | Name of the ACA environment |
| `containerAppsEnvironmentDefaultDomain` | string | Default domain (*.internal.<env-id>.<region>.azurecontainerapps.io) |
| `containerAppsEnvironmentStaticIp` | string | Static IP address of the environment |

## Workload Profiles

The module creates both consumption and dedicated workload profiles:

- **Consumption Profile** (`consumption`) - Pay-per-use, suitable for variable workloads
- **Dedicated Profile** (`dedicated`) - Reserved compute, suitable for stable workloads

## Logging & Monitoring

### Log Analytics Integration

- All Container Apps logs automatically stream to Log Analytics workspace
- Queryable via KQL (Kusto Query Language)
- Retention period inherited from workspace configuration

### Application Insights (Optional)

When enabled, Application Insights provides:

- Application performance monitoring (APM)
- Dependency tracking
- Exception tracking
- Custom metrics

Query Application Insights:

```bash
az monitor app-insights query \
  --resource-group $SPOKE_RG \
  --app $APP_INSIGHTS_NAME \
  --analytics-query "traces | where message contains 'error' | count"
```

## Best Practices

- ✅ Use private DNS zones for internal app communication
- ✅ Enable Application Insights for production workloads
- ✅ Configure appropriate workload profiles based on resource requirements
- ✅ Use managed identities for app authentication
- ✅ Enable diagnostic settings for comprehensive logging
- ✅ Regularly review Log Analytics queries for insights

## Troubleshooting

### Container App Cannot Reach Internal FQDN

Ensure private DNS zone is linked to spoke VNet and firewall rules allow DNS queries.

### High Memory Usage

Check workload profile allocation and container memory limits.

### Slow Startup Times

Verify Application Insights connection and network latency to Log Analytics workspace.

## Related Documentation

- [Container Apps documentation](https://learn.microsoft.com/azure/container-apps/)
- [Log Analytics workspace](https://learn.microsoft.com/azure/azure-monitor/logs/log-analytics-workspace-overview)
- [Application Insights](https://learn.microsoft.com/azure/azure-monitor/app/app-insights-overview)
