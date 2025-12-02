// examples/usage.ts
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { Repository } from "../repositories";
import { Project } from "../models/Project";
import { Floor } from "../models/Floor";
import { StructuralLayout } from "../models/StructuralLayout";
import { randomUUID } from "crypto";
import 'dotenv/config';

// Initialize Cosmos client
const endpoint = process.env.COSMOS_ENDPOINT;
if (!endpoint) {
  throw new Error("Environment variable COSMOS_ENDPOINT must be set");
}

const credential = new DefaultAzureCredential();
const client = new CosmosClient({
  endpoint,
  aadCredentials: credential
});

const databaseId = process.env.COSMOS_DATABASE_ID || "MyDatabase";
const containerId = process.env.COSMOS_CONTAINER_ID || "Items";
const container = client.database(databaseId).container(containerId);

// Initialize repositories with the generic Repository class
const projectRepo = new Repository<Project>(container, "project");
const floorRepo = new Repository<Floor>(container, "floor");
const layoutRepo = new Repository<StructuralLayout>(container, "structural_layout");

async function exampleUsage() {
  try {
    // === CREATE MULTIPLE PROJECTS WITH FLOORS AND LAYOUTS ===
    
    const projectsData = [
      {
        client_name: "NWS",
        slug: "maidstone_depot",
        name: "Maidstone Depot",
        address: "Field Mill Road, Stonebridge Green, Ashford, TN27 9AU, United Kingdom",
        icon: "Factory",
        projectNumber: "787-B4533",
        buildingType: "Factory",
        floorCount: 4
      },
      {
        client_name: "ABC",
        slug: "london_office",
        name: "London Office Tower",
        address: "123 City Road, London, EC1V 1AA, United Kingdom",
        icon: "Building",
        projectNumber: "ABC-2024-001",
        buildingType: "Office",
        floorCount: 3
      },
      {
        client_name: "XYZ",
        slug: "manchester_warehouse",
        name: "Manchester Warehouse",
        address: "456 Industrial Park, Manchester, M1 1AA, United Kingdom",
        icon: "Warehouse",
        projectNumber: "XYZ-2024-007",
        buildingType: "Warehouse",
        floorCount: 2
      }
    ];

    const allProjects: Project[] = [];
    const allFloors: Floor[] = [];
    const allLayouts: StructuralLayout[] = [];

    for (const projectData of projectsData) {
      console.log(`\n📁 Creating project: ${projectData.name}...`);
      
      const projectId = randomUUID();
      const now = new Date().toISOString();
      
      const project: Omit<Project, 'docType'> = {
        id: projectId,
        client_name: projectData.client_name,
        slug: projectData.slug,
        name: projectData.name,
        address: projectData.address,
        icon: projectData.icon,
        lat: 51.5074,
        lon: -0.1278,
        client: projectData.client_name,
        projectNumber: projectData.projectNumber,
        author: "System",
        buildingType: projectData.buildingType,
        constructionDate: "2024",
        country: "UK",
        ownerId: "owner-123",
        createdAt: now,
        updatedAt: now,
        details: {
          projectNumber: projectData.projectNumber,
          name: projectData.name,
          client: projectData.client_name,
          author: "System",
          constructionDate: "2024",
          country: "UK",
          buildingType: projectData.buildingType,
          authorEmail: "system@example.com"
        },
        extra: {
          floorPartition: projectId,
          location: projectData.address,
          uploads: `/uploads/${projectData.slug}`
        }
      };

      const createdProject = await projectRepo.create(project);
      allProjects.push(createdProject);
      console.log(`  ✅ Project created: ${createdProject.name}`);

      // Create floors for this project
      const floorNames = ["Ground Floor", "First Floor", "Second Floor", "Third Floor", "Roof"];
      const projectFloors: Floor[] = [];

      for (let i = 0; i < projectData.floorCount; i++) {
        const floorId = randomUUID();
        const floorName = floorNames[i];
        
        const floor: Omit<Floor, 'docType'> = {
          id: floorId,
          client_name: projectData.client_name,
          slug: projectData.slug,
          name: floorName,
          planUrl: `/plans/${projectData.slug}/${floorName.toLowerCase().replace(' ', '-')}.pdf`,
          images: [
            `/images/${projectData.slug}/${floorName.toLowerCase().replace(' ', '-')}-1.jpg`,
            `/images/${projectData.slug}/${floorName.toLowerCase().replace(' ', '-')}-2.jpg`
          ],
          metrics: {},
          paperSize: "A1",
          editorStateUrl: `/editor-states/${projectData.slug}/${floorId}.json`,
          imageWidth: 2000,
          imageHeight: 1500
        };

        const createdFloor = await floorRepo.create(floor);
        projectFloors.push(createdFloor);
        allFloors.push(createdFloor);
        console.log(`  📐 Floor created: ${createdFloor.name}`);

        // Create structural layout for this floor
        const layout: Omit<StructuralLayout, 'docType'> = {
          id: randomUUID(),
          client_name: projectData.client_name,
          slug: projectData.slug,
          floorId: createdFloor.id,
          mode: "structural",
          basemaps: [
            {
              id: `basemap-${floorId}`,
              url: `/basemaps/${projectData.slug}/${floorId}.png`,
              width: 2000,
              height: 1500
            }
          ],
          activeBasemap: 0,
          columns: [
            { id: "col-1", x: 100, y: 100, size: 300 },
            { id: "col-2", x: 500, y: 100, size: 300 }
          ],
          beams: [],
          polygons: [
            {
              id: "floorplate-1",
              kind: "floorplate",
              points: [
                { x: 0, y: 0 },
                { x: 2000, y: 0 },
                { x: 2000, y: 1500 },
                { x: 0, y: 1500 }
              ]
            }
          ]
        };

        const createdLayout = await layoutRepo.create(layout);
        allLayouts.push(createdLayout);
        console.log(`  🏗️  Layout created for ${createdFloor.name}`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total Projects Created: ${allProjects.length}`);
    console.log(`Total Floors Created: ${allFloors.length}`);
    console.log(`Total Layouts Created: ${allLayouts.length}`);

    // === QUERY EXAMPLES ===
    console.log("\n" + "=".repeat(60));
    console.log("🔍 QUERY EXAMPLES");
    console.log("=".repeat(60));

    // Query by client
    const nwsProjects = await projectRepo.getByClientName("NWS");
    console.log(`\nProjects for client 'NWS': ${nwsProjects.length}`);
    nwsProjects.forEach(p => console.log(`  - ${p.name}`));

    // Query by slug
    const maidstoneFloors = await floorRepo.getBySlug("maidstone_depot");
    console.log(`\nFloors for 'maidstone_depot': ${maidstoneFloors.length}`);
    maidstoneFloors.forEach(f => console.log(`  - ${f.name}`));

    // Get specific project
    if (allProjects.length > 0) {
      const firstProject = allProjects[0];
      const retrieved = await projectRepo.getById(
        firstProject.id,
        firstProject.client_name,
        firstProject.slug
      );
      console.log(`\nRetrieved project: ${retrieved?.name}`);
    }

    // === CLEANUP (commented out - uncomment to delete created items) ===
    /*
    console.log("\n" + "=".repeat(60));
    console.log("🗑️  CLEANUP");
    console.log("=".repeat(60));

    for (const layout of allLayouts) {
      await layoutRepo.delete(layout.id, layout.client_name, layout.slug);
      console.log(`Deleted layout for floor ${layout.floorId}`);
    }

    for (const floor of allFloors) {
      await floorRepo.delete(floor.id, floor.client_name, floor.slug);
      console.log(`Deleted floor: ${floor.name}`);
    }

    for (const project of allProjects) {
      await projectRepo.delete(project.id, project.client_name, project.slug);
      console.log(`Deleted project: ${project.name}`);
    }

    console.log("\n✅ All items cleaned up!");
    */

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

// Run the example
exampleUsage()
  .then(() => console.log("\n✅ Example completed successfully!"))
  .catch((error) => {
    console.error("\n❌ Example failed:", error);
    process.exit(1);
  });