// examples/usage.ts
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { ProjectRepository, FloorRepository, StructuralLayoutRepository } from "../repositories";
import { Project } from "../models/Project";
import { Floor } from "../models/Floor";
import { StructuralLayout } from "../models/StructuralLayout";
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

// Initialize repositories
const projectRepo = new ProjectRepository(container);
const floorRepo = new FloorRepository(container);
const layoutRepo = new StructuralLayoutRepository(container);

async function exampleUsage() {
  try {
    // === PROJECT CRUD OPERATIONS ===
    
    // Create a project
    const newProject: Omit<Project, "createdAt" | "updatedAt"> = {
      id: "05bf9b7c-8be3-4543-afc4-0efa47343e08",
      docType: "project",
      client_name: "NWS",
      slug: "moq_depot",
      name: "moq Depot",
      address: "Field Mill Road, Stonebridge Green, Ashford, TN27 9AU, United Kingdom",
      icon: "Factory",
      lat: 51.2013037501244,
      lon: 0.741202035493586,
      client: "NWS",
      projectNumber: "787-B4533",
      author: "moq name",
      buildingType: "Factory",
      constructionDate: "2000-10-17T23:00:00.000Z",
      country: "United Kingdom",
      ownerId: "anon",
      details: {
        projectNumber: "787-B4533",
        name: "moq Depot",
        client: "NWS",
        author: "moq name",
        constructionDate: "2000-10-17T23:00:00.000Z",
        country: "United Kingdom",
        buildingType: "Factory",
        authorEmail: "moq@email.com"
      },
      extra: {
        floorPartition: "05bf9b7c-8be3-4543-afc4-0efa47343e08",
        location: "{\"lat\":51.201303750124396,\"lon\":0.7412020354935862,\"address\":\"Field Mill Road, Stonebridge Green, Ashford, TN27 9AU, United Kingdom\",\"country\":\"United Kingdom\",\"skipped\":false}",
        uploads: "[\"projects/moq_depot/Input/1761137097274_HMRC-ground.jpeg\"]"
      }
    };

    const createdProject = await projectRepo.create(newProject);
    console.log("Created project:", createdProject);

    // Read a project
    const project = await projectRepo.getById(createdProject.id, createdProject.client_name, createdProject.slug);
    console.log("Retrieved project:", project);

    // Update a project
    const updatedProject = await projectRepo.update(createdProject.id, createdProject.client_name, createdProject.slug, {
      name: "moq Depot - Updated"
    });
    console.log("Updated project:", updatedProject);

    // Get all projects by slug
    const projectsBySlug = await projectRepo.getBySlug("moq_depot");
    console.log("Projects by slug:", projectsBySlug);

    // Get all projects by client name
    const projectsByClient = await projectRepo.getByClientName("NWS");
    console.log("Projects by client:", projectsByClient);

    // === FLOOR CRUD OPERATIONS ===
    
    // Create a floor
    const newFloor: Floor = {
      id: "2c7a7aa1-349f-496d-9de5-ffeac52a9760",
      docType: "floor",
      client_name: "NWS",
      slug: "moq_depot",
      name: "Ground floor",
      planUrl: "projects/moq_depot/Input/1761137097274_HMRC-ground.jpeg",
      images: ["projects/moq_depot/Input/1761137097274_HMRC-ground.jpeg"],
      metrics: {},
      paperSize: "A0",
      editorStateUrl: "/api/uploads/projects%2Fmoq_depot%2Feditor%2F2c7a7aa1-349f-496d-9de5-ffeac52a9760%2Flatest.json",
      imageWidth: 2384,
      imageHeight: 1684
    };

    const createdFloor = await floorRepo.create(newFloor);
    console.log("Created floor:", createdFloor);

    // Read a floor
    const floor = await floorRepo.getById(createdFloor.id, createdFloor.client_name, createdFloor.slug);
    console.log("Retrieved floor:", floor);

    // Update a floor
    const updatedFloor = await floorRepo.update(createdFloor.id, createdFloor.client_name, createdFloor.slug, {
      name: "Ground floor - Updated"
    });
    console.log("Updated floor:", updatedFloor);

    // Get all floors by slug (for a project)
    const floorsBySlug = await floorRepo.getBySlug("moq_depot");
    console.log("Floors for project:", floorsBySlug);

    // === STRUCTURAL LAYOUT CRUD OPERATIONS ===
    
    // Create a structural layout
    const newLayout: StructuralLayout = {
      doc_type: "structural_layout",
      client_name: "NWS",
      slug: "moq_depot",
      floorId: "2c7a7aa1-349f-496d-9de5-ffeac52a9760",
      mode: "columns",
      basemaps: [{
        id: "FOLD 1006",
        url: "/uploads/basemaps/FOLD 1006.jpg",
        width: 13831,
        height: 9721
      }],
      activeBasemap: 0,
      columns: [{
        id: "col_f1z6opvl",
        x: 3915.215,
        y: 1733.31,
        size: 106.63
      }],
      beams: [],
      polygons: [{
        id: "poly_ezhjarab",
        kind: "floorplate",
        points: [
          { x: 2354.03, y: 1686.1 },
          { x: 2354.03, y: 1948.14 }
        ]
      }]
    };

    const createdLayout = await layoutRepo.create(newLayout);
    console.log("Created layout:", createdLayout);

    // Read a layout by floor ID
    const layout = await layoutRepo.getByFloorId(newLayout.floorId, newLayout.slug);
    console.log("Retrieved layout:", layout);

    // Update a layout
    const updatedLayout = await layoutRepo.update(newLayout.floorId, newLayout.slug, {
      mode: "beams"
    });
    console.log("Updated layout:", updatedLayout);

    // === CLEANUP (optional) ===
    // Uncomment to delete created items
    // await projectRepo.delete(createdProject.id, createdProject.client_name, createdProject.slug);
    // await floorRepo.delete(createdFloor.id, createdFloor.client_name, createdFloor.slug);
    // await layoutRepo.delete(id, client_name, slug); // Pass appropriate id, client_name, and slug

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

// Run the example
exampleUsage();