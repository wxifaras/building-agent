// repositories/ProjectRepository.ts
import { Container } from "@azure/cosmos";
import { Project } from "../models/Project";

export class ProjectRepository {
  constructor(private container: Container) {}

  async create(project: Omit<Project, "createdAt" | "updatedAt">): Promise<Project> {
    const now = new Date().toISOString();
    const newProject: Project = {
      ...project,
      docType: "project",
      createdAt: now,
      updatedAt: now
    };
    
    const { resource } = await this.container.items.create(newProject);
    
    return resource as unknown as Project;
  }

  async getById(id: string, clientName: string, slug: string): Promise<Project | undefined> {
    try {
      const { resource } = await this.container.item(id, [clientName, slug]).read<Project>();
      return resource;
    } catch (error: any) {
      if (error.code === 404) return undefined;
      throw error;
    }
  }

  async getBySlug(slug: string): Promise<Project[]> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.slug = @slug AND c.docType = @docType",
      parameters: [
        { name: "@slug", value: slug },
        { name: "@docType", value: "project" }
      ]
    };

    const { resources } = await this.container.items.query<Project>(querySpec).fetchAll();
    return resources;
  }

  async getByClientName(clientName: string): Promise<Project[]> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.client_name = @clientName AND c.docType = @docType",
      parameters: [
        { name: "@clientName", value: clientName },
        { name: "@docType", value: "project" }
      ]
    };

    const { resources } = await this.container.items.query<Project>(querySpec).fetchAll();
    return resources;
  }

  async update(id: string, clientName: string, slug: string, updates: Partial<Omit<Project, "id" | "slug" | "client_name" | "createdAt">>): Promise<Project> {
    const existing = await this.getById(id, clientName, slug);
    if (!existing) {
      throw new Error(`Project with id ${id}, client_name ${clientName}, and slug ${slug} not found`);
    }

    const updated: Project = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const { resource } = await this.container.items.upsert(updated);

    return resource as unknown as Project;
  }

  async delete(id: string, clientName: string, slug: string): Promise<void> {
    await this.container.item(id, [clientName, slug]).delete();
  }

  async listAll(): Promise<Project[]> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.docType = @docType",
      parameters: [{ name: "@docType", value: "project" }]
    };

    const { resources } = await this.container.items.query<Project>(querySpec).fetchAll();
    return resources;
  }
}