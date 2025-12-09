// repositories/Repository.ts
import { Container } from "@azure/cosmos";

export interface BaseEntity {
  id: string;
  client_name: string;
  slug: string;
  docType: string;
}

export class Repository<T extends BaseEntity> {
  constructor(
    private container: Container,
    private docType: string
  ) {}

  /**
   * Create a new entity in the container
   */
  async create(entity: Omit<T, 'docType'> & Partial<Pick<T, 'docType'>>): Promise<T> {
    const entityWithDocType = {
      ...entity,
      docType: this.docType
    } as T;
    
    const { resource } = await this.container.items.create(entityWithDocType);
    return resource as T;
  }

  /**
   * Get an entity by ID using the hierarchical partition key
   */
  async getById(id: string, clientName: string, slug: string): Promise<T | undefined> {
    try {
      const { resource } = await this.container
        .item(id, [clientName, slug])
        .read<T>();
      return resource;
    } catch (error: any) {
      if (error.code === 404) return undefined;
      throw error;
    }
  }

  /**
   * Query entities by slug
   */
  async getBySlug(slug: string): Promise<T[]> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.slug = @slug AND c.docType = @docType",
      parameters: [
        { name: "@slug", value: slug },
        { name: "@docType", value: this.docType }
      ]
    };

    const { resources } = await this.container.items.query<T>(querySpec).fetchAll();
    return resources;
  }

  /**
   * Query entities by client name
   */
  async getByClientName(clientName: string): Promise<T[]> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.client_name = @clientName AND c.docType = @docType",
      parameters: [
        { name: "@clientName", value: clientName },
        { name: "@docType", value: this.docType }
      ]
    };

    const { resources } = await this.container.items.query<T>(querySpec).fetchAll();
    return resources;
  }

  /**
   * Update an entity
   */
  async update(
    id: string, 
    clientName: string, 
    slug: string, 
    updates: Partial<Omit<T, "id" | "slug" | "client_name" | "docType">>
  ): Promise<T> {
    const existing = await this.getById(id, clientName, slug);
    if (!existing) {
      throw new Error(
        `${this.docType} with id ${id}, client_name ${clientName}, and slug ${slug} not found`
      );
    }

    const updated: T = {
      ...existing,
      ...updates
    } as T;

    const { resource } = await this.container.items.upsert(updated);
    return resource as unknown as T;
  }

  /**
   * Delete an entity
   */
  async delete(id: string, clientName: string, slug: string): Promise<void> {
    await this.container.item(id, [clientName, slug]).delete();
  }

  /**
   * List all entities of this type
   */
  async listAll(): Promise<T[]> {
    const querySpec = {
      query: "SELECT * FROM c WHERE c.docType = @docType",
      parameters: [{ name: "@docType", value: this.docType }]
    };

    const { resources } = await this.container.items.query<T>(querySpec).fetchAll();
    return resources;
  }

  /**
   * Execute a custom query
   */
  async query(querySpec: { query: string; parameters?: Array<{ name: string; value: any }> }): Promise<T[]> {
    const { resources } = await this.container.items.query<T>(querySpec).fetchAll();
    return resources;
  }
}
