export interface TokenUser {
  userId: string;
  email: string;
  name: string;
  tenantId: string;
}

export interface CachedProjectAccess {
  userId: string;
  projectId: string;
  role: string;
  client_name: string;
  slug: string;
  cachedAt: number;
}

export interface CachedUserProjects {
  userId: string;
  projects: CachedProjectAccess[];
  cachedAt: number;
}

export interface ICache {
  // User projects operations (cache entire project list per user)
  getUserProjects(userId: string): Promise<CachedUserProjects | null>;
  setUserProjects(userId: string, projects: CachedUserProjects, ttl: number): Promise<void>;
  invalidateUserProjects(userId: string): Promise<void>;

  // Project access operations
  getProjectAccess(userId: string, projectId: string): Promise<CachedProjectAccess | null>;
  setProjectAccess(userId: string, projectId: string, access: CachedProjectAccess, ttl: number): Promise<void>;
  invalidateProjectAccess(userId: string, projectId: string): Promise<void>;

  // Bulk operations
  invalidateProjectCache(projectId: string): Promise<void>;

  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}