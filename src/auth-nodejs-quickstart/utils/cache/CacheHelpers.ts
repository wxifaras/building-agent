// utils/cache/cacheHelpers.ts
import { ICache, CachedUserProjects, CachedProjectAccess } from './CacheInterface';
import { cacheConfig } from '../../config/CacheConfig';

let cacheInstance: ICache | null = null;

export function setCacheInstance(cache: ICache): void {
  cacheInstance = cache;
}

export function getCacheInstance(): ICache | null {
  return cacheInstance;
}

/**
 * Get user's projects from cache or fetch from database
 */
export async function getCachedUserProjects(
  userId: string,
  fetchFromDb: () => Promise<CachedProjectAccess[]>
): Promise<CachedProjectAccess[]> {
  if (!cacheInstance || !cacheInstance.isConnected()) {
    return await fetchFromDb();
  }

  // Try cache first
  const cached = await cacheInstance.getUserProjects(userId);
  if (cached) {
    return cached.projects;
  }

  // Cache miss - fetch from database
  const projects = await fetchFromDb();
  
  const cacheData: CachedUserProjects = {
    userId,
    projects,
    cachedAt: Date.now()
  };
  
  await cacheInstance.setUserProjects(userId, cacheData, cacheConfig.ttl.userProjects);

  return projects;
}

/**
 * Get project access from cache or fetch from database
 */
export async function getCachedProjectAccess(
  userId: string,
  projectId: string,
  fetchFromDb: () => Promise<CachedProjectAccess | null>
): Promise<CachedProjectAccess | null> {
  if (!cacheInstance || !cacheInstance.isConnected()) {
    return await fetchFromDb();
  }

  // Try cache first
  const cached = await cacheInstance.getProjectAccess(userId, projectId);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from database
  const access = await fetchFromDb();
  
  if (access) {
    await cacheInstance.setProjectAccess(userId, projectId, access, cacheConfig.ttl.projectAccess);
  }

  return access;
}

/**
 * Invalidate user projects cache
 */
export async function invalidateUserProjectsCache(userId: string): Promise<void> {
  if (cacheInstance && cacheInstance.isConnected()) {
    await cacheInstance.invalidateUserProjects(userId);
  }
}

/**
 * Invalidate project access cache
 */
export async function invalidateProjectAccessCache(
  userId: string,
  projectId: string
): Promise<void> {
  if (cacheInstance && cacheInstance.isConnected()) {
    await cacheInstance.invalidateProjectAccess(userId, projectId);
  }
}

/**
 * Invalidate all access for a project
 */
export async function invalidateProjectCache(projectId: string): Promise<void> {
  if (cacheInstance && cacheInstance.isConnected()) {
    await cacheInstance.invalidateProjectCache(projectId);
  }
}

/**
 * Get cache statistics (for monitoring/debugging)
 */
export function getCacheStats() {
  return {
    enabled: cacheConfig.enabled,
    type: cacheConfig.type,
    connected: cacheInstance?.isConnected() || false,
    ttl: cacheConfig.ttl
  };
}
