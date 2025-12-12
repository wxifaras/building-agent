import { ICache, CachedUserProjects, CachedProjectAccess } from './CacheInterface';
import { cacheConfig } from './CacheConfig';
import { createLogger } from '../telemetry/logger';

const logger = createLogger({ context: 'CacheHelpers' });

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
    logger.debug('📦 Cache: BYPASS - cache not available');
    return await fetchFromDb();
  }

  // Try cache first
  const cached = await cacheInstance.getUserProjects(userId);
  if (cached) {
    logger.debug(`📦 Cache: HIT - User projects for userId=${userId.substring(0, 8)}...`);
    return cached.projects;
  }

  // Cache miss - fetch from database
  logger.debug(`📦 Cache: MISS - User projects for userId=${userId.substring(0, 8)}..., fetching from DB`);
  const projects = await fetchFromDb();
  
  const cacheData: CachedUserProjects = {
    userId,
    projects,
    cachedAt: Date.now()
  };
  
  await cacheInstance.setUserProjects(userId, cacheData, cacheConfig.ttl.userProjects);
  logger.debug(`📦 Cache: SET - User projects cached for userId=${userId.substring(0, 8)}... (TTL: ${cacheConfig.ttl.userProjects}s)`);

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
    logger.debug('📦 Cache: BYPASS - cache not available');
    return await fetchFromDb();
  }

  // Try cache first
  const cached = await cacheInstance.getProjectAccess(userId, projectId);
  if (cached) {
    logger.debug(`📦 Cache: HIT - Project access for userId=${userId.substring(0, 8)}..., projectId=${projectId.substring(0, 8)}...`);
    return cached;
  }

  // Cache miss - fetch from database
  logger.debug(`📦 Cache: MISS - Project access for userId=${userId.substring(0, 8)}..., projectId=${projectId.substring(0, 8)}..., fetching from DB`);
  const access = await fetchFromDb();
  
  if (access) {
    await cacheInstance.setProjectAccess(userId, projectId, access, cacheConfig.ttl.projectAccess);
    logger.debug(`📦 Cache: SET - Project access cached for userId=${userId.substring(0, 8)}..., projectId=${projectId.substring(0, 8)}... (TTL: ${cacheConfig.ttl.projectAccess}s)`);
  }

  return access;
}

/**
 * Invalidate user projects cache
 */
export async function invalidateUserProjectsCache(userId: string): Promise<void> {
  if (cacheInstance && cacheInstance.isConnected()) {
    await cacheInstance.invalidateUserProjects(userId);
    logger.debug(`📦 Cache: INVALIDATE - User projects for userId=${userId.substring(0, 8)}...`);
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
    logger.debug(`📦 Cache: INVALIDATE - Project access for userId=${userId.substring(0, 8)}..., projectId=${projectId.substring(0, 8)}...`);
  }
}

/**
 * Invalidate all access for a project
 */
export async function invalidateProjectCache(projectId: string): Promise<void> {
  if (cacheInstance && cacheInstance.isConnected()) {
    await cacheInstance.invalidateProjectCache(projectId);
    logger.debug(`📦 Cache: INVALIDATE - All cache entries for projectId=${projectId.substring(0, 8)}...`);
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
