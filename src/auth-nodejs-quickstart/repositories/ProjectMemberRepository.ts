// repositories/ProjectMemberRepository.ts
import { Container } from "@azure/cosmos";
import { Repository } from "./Repository";
import { ProjectMember, ProjectRole, CachedProjectAccess } from "../models/ProjectMember";

export class ProjectMemberRepository extends Repository<ProjectMember> {
  constructor(container: Container) {
    super(container, "projectMember");
  }

  /**
   * Get member by userId and projectId
   */
  async getMember(
    userId: string,
    projectId: string,
    clientName: string,
    projectSlug: string
  ): Promise<ProjectMember | undefined> {
    const querySpec = {
      query: `
        SELECT * FROM c 
        WHERE c.docType = @docType 
        AND c.userId = @userId 
        AND c.projectId = @projectId
        AND c.client_name = @clientName
        AND c.slug = @slug
      `,
      parameters: [
        { name: "@docType", value: "projectMember" },
        { name: "@userId", value: userId },
        { name: "@projectId", value: projectId },
        { name: "@clientName", value: clientName },
        { name: "@slug", value: projectSlug }
      ]
    };

    const results = await this.query(querySpec);
    return results[0];
  }

  /**
   * Get all members for a project (within same partition)
   */
  async getProjectMembers(
    clientName: string,
    projectSlug: string
  ): Promise<ProjectMember[]> {
    const querySpec = {
      query: `
        SELECT * FROM c 
        WHERE c.docType = @docType 
        AND c.client_name = @clientName
        AND c.slug = @slug
      `,
      parameters: [
        { name: "@docType", value: "projectMember" },
        { name: "@clientName", value: clientName },
        { name: "@slug", value: projectSlug }
      ]
    };

    return await this.query(querySpec);
  }

  /**
   * Get all projects for a user by userId (cross-partition query)
   * Returns data ready for caching
   */
  async getUserProjects(userId: string): Promise<CachedProjectAccess[]> {
    const querySpec = {
      query: `
        SELECT * FROM c 
        WHERE c.docType = @docType 
        AND c.userId = @userId
      `,
      parameters: [
        { name: "@docType", value: "projectMember" },
        { name: "@userId", value: userId }
      ]
    };

    const members = await this.query(querySpec);
    
    // Transform to CachedProjectAccess format
    return members.map((m: ProjectMember) => ({
      userId: m.userId,
      projectId: m.projectId,
      role: m.role,
      client_name: m.client_name,
      slug: m.slug,
      cachedAt: Date.now()
    }));
  }

  /**
   * Check if user has access to a project by email (for lookups)
   */
  async getMemberByEmail(
    email: string,
    projectId: string,
    clientName: string,
    projectSlug: string
  ): Promise<ProjectMember | undefined> {
    const querySpec = {
      query: `
        SELECT * FROM c 
        WHERE c.docType = @docType 
        AND c.email = @email 
        AND c.projectId = @projectId
        AND c.client_name = @clientName
        AND c.slug = @slug
      `,
      parameters: [
        { name: "@docType", value: "projectMember" },
        { name: "@email", value: email },
        { name: "@projectId", value: projectId },
        { name: "@clientName", value: clientName },
        { name: "@slug", value: projectSlug }
      ]
    };

    const results = await this.query(querySpec);
    return results[0];
  }

  /**
   * Add member to project
   */
  async addMember(
    projectId: string,
    userId: string,
    email: string,
    userName: string,
    role: ProjectRole,
    clientName: string,
    projectSlug: string
  ): Promise<ProjectMember> {
    // Check if member already exists
    const existing = await this.getMember(userId, projectId, clientName, projectSlug);
    if (existing) {
      throw new Error('User is already a member of this project');
    }

    const member: Omit<ProjectMember, 'docType'> = {
      id: `member_${projectId}_${userId}_${Date.now()}`,
      client_name: clientName,
      slug: projectSlug,
      projectId,
      userId,
      email,
      userName,
      role
    };

    return await this.create(member);
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    userId: string,
    projectId: string,
    clientName: string,
    projectSlug: string,
    newRole: ProjectRole
  ): Promise<ProjectMember> {
    const member = await this.getMember(userId, projectId, clientName, projectSlug);
    
    if (!member) {
      throw new Error('Member not found');
    }

    return await this.update(member.id, clientName, projectSlug, {
      role: newRole
    } as any);
  }

  /**
   * Remove member from project
   */
  async removeMember(
    userId: string,
    projectId: string,
    clientName: string,
    projectSlug: string
  ): Promise<void> {
    const member = await this.getMember(userId, projectId, clientName, projectSlug);
    
    if (!member) {
      throw new Error('Member not found');
    }

    await this.delete(member.id, clientName, projectSlug);
  }

  /**
   * Check if project has at least one owner
   */
  async hasOwners(
    projectId: string,
    clientName: string,
    projectSlug: string
  ): Promise<boolean> {
    const members = await this.getProjectMembers(clientName, projectSlug);
    return members.some(m => m.role === 'owner');
  }

  /**
   * Get member count for a project
   */
  async getMemberCount(
    projectId: string,
    clientName: string,
    projectSlug: string
  ): Promise<number> {
    const members = await this.getProjectMembers(clientName, projectSlug);
    return members.length;
  }
}