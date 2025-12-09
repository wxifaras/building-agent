import { ICache, CachedUserProjects, CachedProjectAccess } from './CacheInterface';

export class NoOpCache implements ICache {
  async connect(): Promise<void> {
    // Caching disabled - no-op implementation
  }

  async disconnect(): Promise<void> {}

  isConnected(): boolean {
    return false;
  }

  async getUserProjects(userId: string): Promise<CachedUserProjects | null> {
    return null;
  }

  async setUserProjects(userId: string, projects: CachedUserProjects, ttl: number): Promise<void> {}

  async invalidateUserProjects(userId: string): Promise<void> {}

  async getProjectAccess(userId: string, projectId: string): Promise<CachedProjectAccess | null> {
    return null;
  }

  async setProjectAccess(userId: string, projectId: string, access: CachedProjectAccess, ttl: number): Promise<void> {}

  async invalidateProjectAccess(userId: string, projectId: string): Promise<void> {}

  async invalidateProjectCache(projectId: string): Promise<void> {}
}