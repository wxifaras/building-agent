# Azure App Configuration with Key Vault References - Node.js Quickstart

This quickstart demonstrates how to use Azure App Configuration with Key Vault references in a Node.js application using TypeScript.

## What This Demo Does

This application shows you how to:

1. **Create configuration values** in Azure App Configuration (regular settings and Key Vault references)
2. **Store secrets** in Azure Key Vault
3. **Read configuration** from App Configuration (automatically resolves Key Vault references)
4. **Clean up resources** by deleting configuration values and secrets

## Prerequisites

- Node.js
- An Azure subscription
- An Azure App Configuration store
- An Azure Key Vault

## Required Azure RBAC Roles

### For Azure App Configuration

The role you need depends on what operations you'll perform:

**For this demo, you need:**
- **App Configuration Data Owner** - Required because the demo creates, reads, updates, and deletes configuration data

**For production applications (read-only access):**
- **App Configuration Data Reader** - Only reads configuration data (recommended for apps that just consume configuration)

**Summary of permissions:**

| Role | Read Config | Create/Update Config | Delete Config |
|------|-------------|---------------------|---------------|
| **App Configuration Data Reader** | ✅ | ❌ | ❌ |
| **App Configuration Data Owner** | ✅ | ✅ | ✅ |

[Learn more about App Configuration roles](https://learn.microsoft.com/azure/azure-app-configuration/concept-enable-rbac)

### For Azure Key Vault

The role you need depends on what operations you'll perform:

**For this demo, you need:**
- **Key Vault Secrets Officer** - Required because the demo creates, reads, deletes, and purges secrets

**For production applications (read-only access):**
- **Key Vault Secrets User** - Only reads secret values (recommended for apps that just consume secrets)

**Summary of permissions:**

| Role | Read Secrets | Create/Update Secrets | Delete Secrets | Purge Deleted Secrets |
|------|--------------|----------------------|----------------|----------------------|
| **Key Vault Secrets User** | ✅ | ❌ | ❌ | ❌ |
| **Key Vault Secrets Officer** | ✅ | ✅ | ✅ | ✅ |

[Learn more about Key Vault RBAC](https://learn.microsoft.com/azure/key-vault/general/rbac-guide)

### References
[Azure App Configuration Documentation](https://learn.microsoft.com/en-us/azure/azure-app-configuration/)

[Key Vault Documentation](https://learn.microsoft.com/en-us/azure/key-vault/general/)