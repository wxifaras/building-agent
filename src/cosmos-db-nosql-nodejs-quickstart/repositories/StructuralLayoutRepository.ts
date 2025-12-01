// repositories/StructuralLayoutRepository.ts
import { Container } from "@azure/cosmos";
import { StructuralLayout } from "../models/StructuralLayout";

export class StructuralLayoutRepository {
  constructor(private container: Container) {}

  async create(layout: StructuralLayout): Promise<StructuralLayout> {
    const { resource } = await this.container.items.create(layout);
    
    return resource as unknown as StructuralLayout;
  }

  async getByFloorId(floorId: string, slug: string): Promise<StructuralLayout | undefined> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.floorId = @floorId AND c.slug = @slug AND c.doc_type = @docType",
      parameters: [
        { name: "@floorId", value: floorId },
        { name: "@slug", value: slug },
        { name: "@docType", value: "structural_layout" }
      ]
    };

    const { resources } = await this.container.items.query<StructuralLayout>(querySpec).fetchAll();
    return resources[0];
  }

  async getBySlug(slug: string): Promise<StructuralLayout[]> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.slug = @slug AND c.doc_type = @docType",
      parameters: [
        { name: "@slug", value: slug },
        { name: "@docType", value: "structural_layout" }
      ]
    };

    const { resources } = await this.container.items.query<StructuralLayout>(querySpec).fetchAll();
    return resources;
  }

  async update(floorId: string, slug: string, updates: Partial<StructuralLayout>): Promise<StructuralLayout> {
    const existing = await this.getByFloorId(floorId, slug);
    if (!existing) {
      throw new Error(`StructuralLayout for floorId ${floorId} and slug ${slug} not found`);
    }

    const updated: StructuralLayout = {
      ...existing,
      ...updates
    };

    const { resource } = await this.container.items.upsert(updated);

    return resource as unknown as StructuralLayout;
  }

  async delete(id: string, clientName: string, slug: string): Promise<void> {
    await this.container.item(id, [clientName, slug]).delete();
  }

  async listAll(): Promise<StructuralLayout[]> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.doc_type = @docType",
      parameters: [{ name: "@docType", value: "structural_layout" }]
    };

    const { resources } = await this.container.items.query<StructuralLayout>(querySpec).fetchAll();
    return resources;
  }
}
