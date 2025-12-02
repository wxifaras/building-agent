# Azure Container Apps Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying your application to Azure Container Apps using a Dockerfile. Azure Container Apps is a serverless container platform that allows you to run containerized applications without managing infrastructure.

## Prerequisites

### 1. Required Tools

- **Azure CLI** (version 2.37.0 or higher)
  - Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
  - Verify installation: `az --version`

- **Docker Desktop** (if building locally)
  - Install from: https://www.docker.com/products/docker-desktop
  - Verify installation: `docker --version`

- **Git** (for version control)
  - Install from: https://git-scm.com/downloads

### 2. Azure Requirements

- Active Azure subscription
- Appropriate permissions to create resources
- Resource group (or permissions to create one)

### 3. Azure CLI Extensions

Install the Container Apps extension:

```bash
az extension add --name containerapp --upgrade
```

Register required providers:

```bash
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

## Project Structure

Your project should have at minimum:

```
your-project/
├── Dockerfile
├── .dockerignore (recommended)
├── src/
│   └── (your application files)
└── README.md
```

## Deployment Steps

### Step 1: Login to Azure

```bash
az login
```

Set your subscription (if you have multiple):

```bash
az account set --subscription "Your-Subscription-Name"
```

Verify the active subscription:

```bash
az account show
```

### Step 2: Create Resource Group

Create a new resource group or use an existing one:

```bash
az group create \
  --name myResourceGroup \
  --location eastus
```

### Step 3: Create Azure Container Registry (ACR)

Create a container registry to store your Docker images:

```bash
az acr create \
  --name mycontainerregistry \
  --resource-group myResourceGroup \
  --sku Basic \
  --admin-enabled true
```

**Note:** ACR names must be globally unique and contain only alphanumeric characters.

### Step 4: Build and Push Docker Image to ACR

#### Option A: Build in ACR (Recommended)

Build the image directly in ACR without requiring Docker locally:

```bash
az acr build \
  --registry mycontainerregistry \
  --image myapp:v1 \
  --file Dockerfile \
  .
```

#### Option B: Build Locally and Push

If you prefer to build locally:

```bash
# Login to ACR
az acr login --name mycontainerregistry

# Build the image
docker build -t mycontainerregistry.azurecr.io/myapp:v1 .

# Push to ACR
docker push mycontainerregistry.azurecr.io/myapp:v1
```

### Step 5: Create Container Apps Environment

Create an environment for your container apps:

```bash
az containerapp env create \
  --name myContainerAppEnv \
  --resource-group myResourceGroup \
  --location eastus
```

### Step 6: Deploy Container App

#### Get ACR Credentials

```bash
ACR_USERNAME=$(az acr credential show --name mycontainerregistry --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name mycontainerregistry --query passwords[0].value --output tsv)
```

#### Create the Container App

```bash
az containerapp create \
  --name myapp \
  --resource-group myResourceGroup \
  --environment myContainerAppEnv \
  --image mycontainerregistry.azurecr.io/myapp:v1 \
  --target-port 80 \
  --ingress external \
  --registry-server mycontainerregistry.azurecr.io \
  --registry-username $ACR_USERNAME \
  --registry-password $ACR_PASSWORD \
  --cpu 0.5 \
  --memory 1Gi \
  --min-replicas 1 \
  --max-replicas 3
```

**Key Parameters:**

- `--target-port`: The port your application listens on
- `--ingress`: `external` (public) or `internal` (private within VNet)
- `--cpu`: CPU cores (0.25, 0.5, 0.75, 1.0, 1.25, etc.)
- `--memory`: Memory in Gi (0.5Gi, 1Gi, 1.5Gi, 2Gi, etc.)
- `--min-replicas` / `--max-replicas`: Auto-scaling configuration

### Step 7: Get Application URL

Retrieve the application's FQDN:

```bash
az containerapp show \
  --name myapp \
  --resource-group myResourceGroup \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

## Updating Your Application

### Option 1: Update with New Image

Build and push a new version:

```bash
az acr build \
  --registry mycontainerregistry \
  --image myapp:v2 \
  .
```

Update the container app:

```bash
az containerapp update \
  --name myapp \
  --resource-group myResourceGroup \
  --image mycontainerregistry.azurecr.io/myapp:v2
```

### Option 2: Enable Continuous Deployment

Set up revision mode for zero-downtime deployments:

```bash
az containerapp revision set-mode \
  --name myapp \
  --resource-group myResourceGroup \
  --mode multiple
```

## Configuration Options

### Environment Variables

Add environment variables to your app:

```bash
az containerapp update \
  --name myapp \
  --resource-group myResourceGroup \
  --set-env-vars "KEY1=value1" "KEY2=value2"
```

### Secrets

Store sensitive data as secrets:

```bash
az containerapp secret set \
  --name myapp \
  --resource-group myResourceGroup \
  --secrets "db-password=MySecurePassword123"
```

Reference secrets in environment variables:

```bash
az containerapp update \
  --name myapp \
  --resource-group myResourceGroup \
  --set-env-vars "DB_PASSWORD=secretref:db-password"
```

### Custom Domains

Add a custom domain:

```bash
az containerapp hostname add \
  --hostname www.example.com \
  --name myapp \
  --resource-group myResourceGroup
```

### Health Probes

Configure liveness and readiness probes:

```bash
az containerapp update \
  --name myapp \
  --resource-group myResourceGroup \
  --liveness-probe-type http \
  --liveness-probe-path /health \
  --readiness-probe-type http \
  --readiness-probe-path /ready
```

## Monitoring and Troubleshooting

### View Logs

Stream live logs:

```bash
az containerapp logs show \
  --name myapp \
  --resource-group myResourceGroup \
  --follow
```

### Check Revisions

List all revisions:

```bash
az containerapp revision list \
  --name myapp \
  --resource-group myResourceGroup \
  --output table
```

### View Metrics

Open in Azure Portal for detailed metrics:

```bash
az containerapp show \
  --name myapp \
  --resource-group myResourceGroup \
  --query id \
  --output tsv
```

## Scaling Configuration

### Manual Scaling

Set specific replica count:

```bash
az containerapp update \
  --name myapp \
  --resource-group myResourceGroup \
  --min-replicas 2 \
  --max-replicas 5
```

### Auto-scaling Rules

Scale based on HTTP requests:

```bash
az containerapp update \
  --name myapp \
  --resource-group myResourceGroup \
  --scale-rule-name http-rule \
  --scale-rule-type http \
  --scale-rule-http-concurrency 50
```

## Best Practices

1. **Use .dockerignore**: Exclude unnecessary files from Docker build context
2. **Multi-stage builds**: Use multi-stage Dockerfiles to reduce image size
3. **Tag images properly**: Use semantic versioning (v1.0.0, v1.0.1, etc.)
4. **Enable managed identity**: Use managed identities instead of passwords when possible
5. **Set resource limits**: Define appropriate CPU and memory limits
6. **Use secrets**: Never hardcode sensitive information in your Dockerfile
7. **Implement health checks**: Add health endpoints to your application
8. **Monitor logs**: Set up log analytics workspace for centralized logging
9. **Enable HTTPS**: Always use HTTPS for production applications
10. **Test locally**: Test Docker images locally before deploying

## Sample Dockerfile Examples

### Node.js Application

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

FROM node:18-alpine
WORKDIR /app
COPY --from=build /app .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Python Application

```dockerfile
FROM python:3.11-slim AS build
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

FROM python:3.11-slim
WORKDIR /app
COPY --from=build /app .
EXPOSE 8000
CMD ["python", "app.py"]
```

### .NET Application

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["MyApp.csproj", "./"]
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 80
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

## Cleanup Resources

To delete all resources:

```bash
az group delete --name myResourceGroup --yes --no-wait
```

To delete specific container app:

```bash
az containerapp delete \
  --name myapp \
  --resource-group myResourceGroup \
  --yes
```

## Common Issues and Solutions

### Issue: Image Pull Failed

**Solution:** Verify ACR credentials and ensure the registry is accessible:

```bash
az acr check-health --name mycontainerregistry
```

### Issue: Application Not Responding

**Solution:** Check if the target port matches your application's listening port and verify logs for errors.

### Issue: Build Failed in ACR

**Solution:** Review build logs:

```bash
az acr task logs --registry mycontainerregistry
```

### Issue: Environment Variables Not Loading

**Solution:** Ensure environment variables are properly set and restart the app:

```bash
az containerapp revision restart \
  --name myapp \
  --resource-group myResourceGroup
```

## Additional Resources

- [Azure Container Apps Documentation](https://docs.microsoft.com/en-us/azure/container-apps/)
- [Azure Container Registry Documentation](https://docs.microsoft.com/en-us/azure/container-registry/)
- [Docker Documentation](https://docs.docker.com/)
- [Azure CLI Reference](https://docs.microsoft.com/en-us/cli/azure/)

## Cost Optimization Tips

1. Use appropriate resource sizing (don't over-provision)
2. Set minimum replicas to 0 for dev/test environments
3. Use Basic SKU for ACR in non-production
4. Delete unused revisions regularly
5. Use consumption-based pricing tier for variable workloads

---

**Note:** Replace placeholders like `myResourceGroup`, `mycontainerregistry`, and `myapp` with your actual resource names throughout this guide.
