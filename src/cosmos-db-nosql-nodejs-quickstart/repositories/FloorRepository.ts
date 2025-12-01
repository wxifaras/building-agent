// repositories/FloorRepository.ts
import { Container } from "@azure/cosmos";
import { Floor } from "../models/Floor";

export class FloorRepository {
  constructor(private container: Container) {}

  async create(floor: Floor): Promise<Floor> {
    const { resource } = await this.container.items.create(floor);
    
    return resource as unknown as Floor;
  }

  async getById(id: string, clientName: string, slug: string): Promise<Floor | undefined> {
    try {
      const { resource } = await this.container.item(id, [clientName, slug]).read<Floor>();
      return resource;
    } catch (error: any) {
      if (error.code === 404) return undefined;
      throw error;
    }
  }

  async getBySlug(slug: string): Promise<Floor[]> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.slug = @slug AND c.docType = @docType",
      parameters: [
        { name: "@slug", value: slug },
        { name: "@docType", value: "floor" }
      ]
    };

    const { resources } = await this.container.items.query<Floor>(querySpec).fetchAll();
    return resources;
  }

  async getByClientName(clientName: string): Promise<Floor[]> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.client_name = @clientName AND c.docType = @docType",
      parameters: [
        { name: "@clientName", value: clientName },
        { name: "@docType", value: "floor" }
      ]
    };

    const { resources } = await this.container.items.query<Floor>(querySpec).fetchAll();
    return resources;
  }

  async update(id: string, clientName: string, slug: string, updates: Partial<Omit<Floor, "id" | "slug" | "client_name">>): Promise<Floor> {
    const existing = await this.getById(id, clientName, slug);
    if (!existing) {
      throw new Error(`Floor with id ${id}, client_name ${clientName}, and slug ${slug} not found`);
    }

    const updated: Floor = {
      ...existing,
      ...updates
    };

    const { resource } = await this.container.items.upsert(updated);

    return resource as unknown as Floor;
  }

  async delete(id: string, clientName: string, slug: string): Promise<void> {
    await this.container.item(id, [clientName, slug]).delete();
  }

  async listAll(): Promise<Floor[]> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.docType = @docType",
      parameters: [{ name: "@docType", value: "floor" }]
    };

    const { resources } = await this.container.items.query<Floor>(querySpec).fetchAll();
    return resources;
  }
}
