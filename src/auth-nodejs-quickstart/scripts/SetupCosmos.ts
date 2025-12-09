import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import * as dotenv from 'dotenv';

dotenv.config();

async function setup() {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const databaseId = process.env.COSMOS_DATABASE || "MyDatabase";
  const containerId = process.env.COSMOS_CONTAINER || "Items";

  if (!endpoint) {
    console.error('Please define COSMOS_ENDPOINT in your .env file');
    process.exit(1);
  }

  console.log('🛠️  Setting up Cosmos DB...');
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Database: ${databaseId}`);
  console.log(`   Container: ${containerId}`);

  try {
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({ 
      endpoint, 
      aadCredentials: credential 
    });

    // 1. Create Database
    console.log(`\n1️⃣  Creating Database '${databaseId}' if not exists...`);
    const { database } = await client.databases.createIfNotExists({
      id: databaseId
    });
    console.log('   ✓ Database ready');

    // 2. Create Container with Hierarchical Partition Key
    console.log(`\n2️⃣  Creating Container '${containerId}' if not exists...`);
    // Note: We use Hierarchical Partition Keys based on the repository usage: [client_name, slug]
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: {
        paths: ['/client_name', '/slug'],
        version: 2, // Version 2 is required for hierarchical partition keys
        kind: 'MultiHash'
      }
    });
    console.log('   ✓ Container ready');
    console.log('   ✓ Partition Key: [/client_name, /slug]');

    console.log('\n✨ Setup completed successfully!');

  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setup();
