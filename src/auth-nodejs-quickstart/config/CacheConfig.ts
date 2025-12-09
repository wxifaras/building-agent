export interface CacheConfig {
  enabled: boolean;
  type: 'redis' | 'memory' | 'none';
  redisUrl?: string;
  ttl: {
    user: number;
    projectAccess: number;
    userProjects: number;
  };
}

export const cacheConfig: CacheConfig = {
  enabled: process.env.CACHE_ENABLED !== 'false', // Default true
  type: (process.env.CACHE_TYPE as 'redis' | 'memory' | 'none') || 'memory',
  redisUrl: process.env.REDIS_URL,
  ttl: {
    user: parseInt(process.env.CACHE_TTL_USER || '3600'),
    projectAccess: parseInt(process.env.CACHE_TTL_PROJECT_ACCESS || '1800'),
    userProjects: parseInt(process.env.CACHE_TTL_USER_PROJECTS || '600'),
  }
};

// Validate configuration
if (cacheConfig.enabled && cacheConfig.type === 'redis' && !cacheConfig.redisUrl) {
  console.warn('⚠️  Redis cache enabled but REDIS_URL not configured. Falling back to memory cache.');
  cacheConfig.type = 'memory';
}