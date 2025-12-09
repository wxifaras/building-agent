import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import * as dotenv from 'dotenv';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { ProjectMemberRepository } from '../repositories/ProjectMemberRepository';
import { Project } from '../models/Project';

dotenv.config();

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return (index > -1 && index + 1 < process.argv.length) ? process.argv[index + 1] : undefined;
}

async function seed() {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const databaseId = process.env.COSMOS_DATABASE || "MyDatabase";
  const containerId = process.env.COSMOS_CONTAINER || "Items";

  if (!endpoint) {
    console.error('Please define COSMOS_ENDPOINT in your .env file');
    process.exit(1);
  }

  // Parse arguments
  const ownerId = getArg('--owner-id');
  const ownerEmail = getArg('--owner-email') || 'owner@example.com';

  if (!ownerId) {
    console.error('Error: Please provide an owner ID.');
    console.log('Usage: ts-node SeedCosmos.ts --owner-id <id> [--owner-email <email>]');
    process.exit(1);
  }

  console.log('🌱 Seeding Cosmos DB...');

  const credential = new DefaultAzureCredential();
  const client = new CosmosClient({ 
    endpoint, 
    aadCredentials: credential 
  });
  const database = client.database(databaseId);
  const container = database.container(containerId);

  const projectRepo = new ProjectRepository(container);
  const memberRepo = new ProjectMemberRepository(container);

  // Sample Project Data
  const projectId = 'proj_maidstone_001'; // Deterministic ID for testing
  const now = new Date().toISOString();
  
  const projectData: Omit<Project, 'docType'> = {
    id: projectId,
    client_name: "NWS",
    slug: "maidstone_depot",
    name: "Maidstone Depot",
    address: "Field Mill Road, Stonebridge Green, Ashford, TN27 9AU, United Kingdom",
    icon: "Factory",
    lat: 51.5074,
    lon: -0.1278,
    client: "NWS",
    projectNumber: "787-B4533",
    author: "System",
    buildingType: "Factory",
    constructionDate: "2024",
    country: "UK",
    ownerId: ownerId || 'owner-123',
    createdAt: now,
    updatedAt: now,
    details: {
      projectNumber: "787-B4533",
      name: "Maidstone Depot",
      client: "NWS",
      author: "System",
      constructionDate: "2024",
      country: "UK",
      buildingType: "Factory",
      authorEmail: "system@example.com"
    },
    extra: {
      floorPartition: projectId,
      location: "Field Mill Road, Stonebridge Green, Ashford, TN27 9AU, United Kingdom",
      uploads: `/uploads/maidstone_depot`
    }
  };

  try {
    // 1. Create Project
    console.log(`Creating project: ${projectData.name}...`);
    // Check if exists first to avoid duplicates/errors if run multiple times
    const existingProject = await projectRepo.getById(projectData.id, projectData.client_name, projectData.slug);
    
    let project: Project;
    if (existingProject) {
      console.log('Project already exists, skipping creation.');
      project = existingProject;
    } else {
      project = await projectRepo.create(projectData);
      console.log('✅ Project created:', project.id);
    }

    // 2. Add Owner
    if (ownerId) {
      console.log(`Adding owner: ${ownerEmail} (${ownerId})...`);
      try {
        const member = await memberRepo.addMember(
          project.id,
          ownerId,
          ownerEmail,
          'Owner User',
          'owner',
          project.client_name,
          project.slug
        );
        console.log('✅ Owner added:', member.id);
      } catch (error: any) {
        if (error.message === 'User is already a member of this project') {
          console.log('Owner already exists, skipping.');
        } else {
          throw error;
        }
      }
    }

    console.log('\n✨ Seeding completed successfully!');
    console.log(`\nTest with:\nGET /api/projects/${project.client_name}/${project.slug}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
