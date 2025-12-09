import { ICache, CachedUserProjects, CachedProjectAccess } from './CacheInterface';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MemoryCache implements ICache {
  private userProjectsCache = new Map<string, CacheEntry<CachedUserProjects>>();
  private accessCache = new Map<string, CacheEntry<CachedProjectAccess>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  async connect(): Promise<void> {        
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async disconnect(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.userProjectsCache.clear();
    this.accessCache.clear();
  }

  isConnected(): boolean {
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.userProjectsCache.entries()) {
      if (entry.expiresAt < now) {
        this.userProjectsCache.delete(key);
      }
    }
    
    for (const [key, entry] of this.accessCache.entries()) {
      if (entry.expiresAt < now) {
        this.accessCache.delete(key);
      }
    }
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return entry.expiresAt < Date.now();
  }

  async getUserProjects(userId: string): Promise<CachedUserProjects | null> {
    const entry = this.userProjectsCache.get(userId);
    if (!entry || this.isExpired(entry)) {
      this.userProjectsCache.delete(userId);
      return null;
    }
    return entry.data;
  }

  async setUserProjects(userId: string, projects: CachedUserProjects, ttl: number): Promise<void> {
    this.userProjectsCache.set(userId, {
      data: projects,
      expiresAt: Date.now() + ttl * 1000
    });
  }

  async invalidateUserProjects(userId: string): Promise<void> {
    this.userProjectsCache.delete(userId);
  }

  async getProjectAccess(userId: string, projectId: string): Promise<CachedProjectAccess | null> {
    const key = `${userId}:${projectId}`;
    const entry = this.accessCache.get(key);
    if (!entry || this.isExpired(entry)) {
      this.accessCache.delete(key);
      return null;
    }
    return entry.data;
  }

  async setProjectAccess(userId: string, projectId: string, access: CachedProjectAccess, ttl: number): Promise<void> {
    const key = `${userId}:${projectId}`;
    this.accessCache.set(key, {
      data: access,
      expiresAt: Date.now() + ttl * 1000
    });
  }

  async invalidateProjectAccess(userId: string, projectId: string): Promise<void> {
    const key = `${userId}:${projectId}`;
    this.accessCache.delete(key);
    this.userProjectsCache.delete(userId);
  }

  async invalidateProjectCache(projectId: string): Promise<void> {
    for (const key of this.accessCache.keys()) {
      if (key.endsWith(`:${projectId}`)) {
        this.accessCache.delete(key);
      }
    }
  }
}