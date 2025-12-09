import { Container } from "@azure/cosmos";
import { Repository } from "./Repository";
import { Project } from "../models/Project";

export class ProjectRepository extends Repository<Project> {
  constructor(container: Container) {
    super(container, "project");
  }

  /**
   * Get project by client and slug
   */
  async getProjectsByClientAndSlug(
    clientName: string,
    slug: string
  ): Promise<Project | undefined> {
    const querySpec = {
      query: `
        SELECT * FROM c 
        WHERE c.docType = @docType 
        AND c.client_name = @clientName
        AND c.slug = @slug
      `,
      parameters: [
        { name: "@docType", value: "project" },
        { name: "@clientName", value: clientName },
        { name: "@slug", value: slug }
      ]
    };

    const results = await this.query(querySpec);
    return results[0];
  }

  /**
   * Get all projects for a client
   */
  async getProjectsByClient(
    clientName: string,
    slug: string
  ): Promise<Project[]> {
    const querySpec = {
      query: `
        SELECT * FROM c 
        WHERE c.docType = @docType 
        AND c.client_name = @clientName
        AND c.slug = @slug
      `,
      parameters: [
        { name: "@docType", value: "project" },
        { name: "@clientName", value: clientName },
        { name: "@slug", value: slug }
      ]
    };

    return await this.query(querySpec);
  }
