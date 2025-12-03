// index.ts - Simple Azure App Configuration with Key Vault References Example
import { load } from "@azure/app-configuration-provider";
import { AppConfigurationClient } from "@azure/app-configuration";
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import 'dotenv/config';

/**
 * Example 1: Create configuration values with Key Vault references
 */
async function createConfigurationValues() {
  console.log("\n=== Creating Configuration Values ===\n");

  const endpoint = process.env.AZURE_APPCONFIG_ENDPOINT;
  if (!endpoint) {
    throw new Error("AZURE_APPCONFIG_ENDPOINT environment variable is required");
  }

  const keyVaultUrl = process.env.KEY_VAULT_ENDPOINT;
  if (!keyVaultUrl) {
    throw new Error("KEY_VAULT_ENDPOINT environment variable is required");
  }

  const credential = new DefaultAzureCredential();
  const appConfigClient = new AppConfigurationClient(endpoint, credential);
  const keyVaultClient = new SecretClient(keyVaultUrl, credential);

  console.log(`Connecting to App Configuration: ${endpoint}`);
  console.log(`Using Key Vault: ${keyVaultUrl}\n`);

  // Create 2 regular configuration values
  console.log("Creating regular configuration values...");
  
  const configSetting1 = await appConfigClient.addConfigurationSetting({
    key: "MyApp:Settings:AppName",
    value: "Building Agent Demo",
    label: "dev"
  });
  console.log(`✓ Created: ${configSetting1.key} = ${configSetting1.value}`);

  const configSetting2 = await appConfigClient.addConfigurationSetting({
    key: "MyApp:Settings:MaxRetries",
    value: "3",
    label: "dev"
  });

  console.log(`✓ Created: ${configSetting2.key} = ${configSetting2.value}\n`);

  // Create 2 secrets in Key Vault
  console.log("Creating secrets in Key Vault...");
  
  const secret1 = await keyVaultClient.setSecret("MoqSetting1", "moqvalue1");
  console.log(`✓ Created secret: ${secret1.name}`);

  const secret2 = await keyVaultClient.setSecret("MoqSetting2", "moqvalue2");
  console.log(`✓ Created secret: ${secret2.name}\n`);

  // Create 2 Key Vault references in App Configuration
  console.log("Creating Key Vault references in App Configuration...");
  
  const kvRef1 = await appConfigClient.addConfigurationSetting({
    key: "MyApp:Secrets:MoqSetting1",
    value: `{"uri":"${keyVaultUrl}secrets/MoqSetting1"}`,
    contentType: "application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8",
    label: "dev"
  });
  console.log(`✓ Created Key Vault reference: ${kvRef1.key} → MoqSetting1`);

  const kvRef2 = await appConfigClient.addConfigurationSetting({
    key: "MyApp:Secrets:MoqSetting2",
    value: `{"uri":"${keyVaultUrl}secrets/MoqSetting2"}`,
    contentType: "application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8",
    label: "dev"
  });
  console.log(`✓ Created Key Vault reference: ${kvRef2.key} → MoqSetting2\n`);

  console.log("✓ Successfully created 4 configuration values (2 regular + 2 Key Vault references)\n");
}

/**
 * Example 2: Read configuration settings from App Configuration
 * This will automatically resolve Key Vault references!
 */
async function readConfigurationValues() {
  console.log("\n=== Reading Configuration Values ===\n");

  const endpoint = process.env.AZURE_APPCONFIG_ENDPOINT;
  if (!endpoint) {
    throw new Error("AZURE_APPCONFIG_ENDPOINT environment variable is required");
  }

  const credential = new DefaultAzureCredential();

  console.log(`Connecting to App Configuration: ${endpoint}`);
  console.log("Loading configuration settings with dev label...\n");

  // Use the load function to get all settings with "dev" label
  // Key Vault references are automatically resolved!
  const settings = await load(endpoint, credential, {
    selectors: [{
      keyFilter: "*",
      labelFilter: "dev"
    }],
    keyVaultOptions: {
      credential: credential
    }
  });

  console.log(`✓ Successfully loaded ${settings.size} configuration settings\n`);

  // Display all configuration values
  console.log("Configuration Values:");
  console.log("─────────────────────────────────────────────────────────\n");

  // Display regular configuration values
  console.log("Regular Settings:");
  const appName = settings.get("MyApp:Settings:AppName");
  console.log(`  MyApp:Settings:AppName = ${appName}`);
  
  const maxRetries = settings.get("MyApp:Settings:MaxRetries");
  console.log(`  MyApp:Settings:MaxRetries = ${maxRetries}\n`);

  // Display Key Vault referenced values (automatically resolved!)
  console.log("Key Vault Referenced Secrets:");
  const moqSetting1 = settings.get("MyApp:Secrets:MoqSetting1");
  console.log(`  MyApp:Secrets:MoqSetting1 = ${moqSetting1}`);
  
  const moqSetting2 = settings.get("MyApp:Secrets:MoqSetting2");
  console.log(`  MyApp:Secrets:MoqSetting2 = ${moqSetting2}\n`);

  console.log("─────────────────────────────────────────────────────────\n");

  // You can also iterate through all settings
  console.log("All Settings (iteration):");
  for (const [key, value] of settings) {
    console.log(`  ${key} = ${value}`);
  }
  console.log();

  return settings;
}

/**
 * Example 3: Direct Key Vault access (optional)
 */
async function accessKeyVaultDirectly() {
  console.log("\n=== Direct Key Vault Access (Optional) ===\n");

  const keyVaultUrl = process.env.KEY_VAULT_ENDPOINT;
  if (!keyVaultUrl) {
    console.log("Skipping: KEY_VAULT_ENDPOINT not set in environment\n");
    return;
  }

  const credential = new DefaultAzureCredential();
  const client = new SecretClient(keyVaultUrl, credential);

  try {
    // Example: Retrieve a specific secret
    const secretName = "MyTestSecret";
    console.log(`Retrieving secret: ${secretName}`);
    
    const secret = await client.getSecret(secretName);
    console.log(`✓ Secret retrieved successfully`);
    console.log(`  Name: ${secret.name}`);
    console.log(`  Value: ***${secret.value?.slice(-4)}\n`);
  } catch (error: any) {
    console.log(`Note: Could not retrieve secret - ${error.message}\n`);
  }
}

/**
 * Example 4: Delete all created configuration values and Key Vault secrets
 */
async function deleteConfigurationValues() {
  console.log("\n=== Deleting Configuration Values ===\n");

  const endpoint = process.env.AZURE_APPCONFIG_ENDPOINT;
  if (!endpoint) {
    throw new Error("AZURE_APPCONFIG_ENDPOINT environment variable is required");
  }

  const keyVaultUrl = process.env.KEY_VAULT_ENDPOINT;
  if (!keyVaultUrl) {
    throw new Error("KEY_VAULT_ENDPOINT environment variable is required");
  }

  const credential = new DefaultAzureCredential();
  const appConfigClient = new AppConfigurationClient(endpoint, credential);
  const keyVaultClient = new SecretClient(keyVaultUrl, credential);

  console.log(`Connecting to App Configuration: ${endpoint}`);
  console.log(`Using Key Vault: ${keyVaultUrl}\n`);

  // Delete Key Vault references from App Configuration
  console.log("Deleting Key Vault references from App Configuration...");
  
  try {
    await appConfigClient.deleteConfigurationSetting({
      key: "MyApp:Secrets:MoqSetting1",
      label: "dev"
    });
    console.log(`✓ Deleted Key Vault reference: MyApp:Secrets:MoqSetting1`);
  } catch (error: any) {
    console.log(`  Note: MyApp:Secrets:MoqSetting1 not found or already deleted`);
  }

  try {
    await appConfigClient.deleteConfigurationSetting({
      key: "MyApp:Secrets:MoqSetting2",
      label: "dev"
    });
    console.log(`✓ Deleted Key Vault reference: MyApp:Secrets:MoqSetting2\n`);
  } catch (error: any) {
    console.log(`  Note: MyApp:Secrets:MoqSetting2 not found or already deleted\n`);
  }

  // Delete regular configuration values from App Configuration
  console.log("Deleting regular configuration values from App Configuration...");
  
  try {
    await appConfigClient.deleteConfigurationSetting({
      key: "MyApp:Settings:AppName",
      label: "dev"
    });
    console.log(`✓ Deleted setting: MyApp:Settings:AppName`);
  } catch (error: any) {
    console.log(`  Note: MyApp:Settings:AppName not found or already deleted`);
  }

  try {
    await appConfigClient.deleteConfigurationSetting({
      key: "MyApp:Settings:MaxRetries",
      label: "dev"
    });
    console.log(`✓ Deleted setting: MyApp:Settings:MaxRetries\n`);
  } catch (error: any) {
    console.log(`  Note: MyApp:Settings:MaxRetries not found or already deleted\n`);
  }

 // Delete and purge secrets from Key Vault
  console.log("Deleting and purging secrets from Key Vault...");
  
  try {
    const deletePoller1 = await keyVaultClient.beginDeleteSecret("MoqSetting1");
    await deletePoller1.pollUntilDone();
    console.log(`✓ Deleted secret: MoqSetting1`);
    
    // Purge the secret permanently
    await keyVaultClient.purgeDeletedSecret("MoqSetting1");
    console.log(`✓ Purged secret: MoqSetting1 (permanently removed)`);
  } catch (error: any) {
    if (error.message.includes("currently in a deleted but recoverable state")) {
      console.log(`  Purging existing deleted secret: MoqSetting1`);
      try {
        await keyVaultClient.purgeDeletedSecret("MoqSetting1");
        console.log(`✓ Purged secret: MoqSetting1 (permanently removed)`);
      } catch (purgeError: any) {
        console.log(`  Note: Could not purge MoqSetting1 - ${purgeError.message}`);
      }
    } else {
      console.log(`  Note: MoqSetting1 - ${error.message}`);
    }
  }

  try {
    const deletePoller2 = await keyVaultClient.beginDeleteSecret("MoqSetting2");
    await deletePoller2.pollUntilDone();
    console.log(`✓ Deleted secret: MoqSetting2`);
    
    // Purge the secret permanently
    await keyVaultClient.purgeDeletedSecret("MoqSetting2");
    console.log(`✓ Purged secret: MoqSetting2 (permanently removed)\n`);
  } catch (error: any) {
    if (error.message.includes("currently in a deleted but recoverable state")) {
      console.log(`  Purging existing deleted secret: MoqSetting2`);
      try {
        await keyVaultClient.purgeDeletedSecret("MoqSetting2");
        console.log(`✓ Purged secret: MoqSetting2 (permanently removed)\n`);
      } catch (purgeError: any) {
        console.log(`  Note: Could not purge MoqSetting2 - ${purgeError.message}\n`);
      }
    } else {
      console.log(`  Note: MoqSetting2 - ${error.message}\n`);
    }
  }
}

/**
 * Main function - Run all examples
 */
async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  Azure App Configuration with Key Vault References Demo  ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  try {
    
    // Example 1: Create configuration values (uncomment to run)
      await createConfigurationValues();

    // Example 2: Read configuration values (uncomment to run)
      await readConfigurationValues();

    // Example 3: Direct Key Vault access (uncomment to run)
    // await accessKeyVaultDirectly();

    // Example 4: Delete configuration values (uncomment to run)
      await deleteConfigurationValues();

    console.log("✓ All examples completed successfully!");
    
  } catch (error: any) {
    console.error("\n✗ Error:", error.message);
    console.error("\nTroubleshooting tips:");
    console.error("1. Ensure AZURE_APPCONFIG_ENDPOINT is set in .env file");
    console.error("2. Run 'az login' to authenticate locally");
    console.error("3. Verify you have 'App Configuration Data Reader' role");
    console.error("4. If using Key Vault references, verify 'Key Vault Secrets User' role");
    process.exit(1);
  }
}

// Run the main function
main();