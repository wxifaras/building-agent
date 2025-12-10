import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

export interface CacheConfig {
  enabled: boolean;
  type: 'redis' | 'memory' | 'none';
  redisHost?: string;
  redisPort?: number;
  redisObjectId?: string;
  ttl: {
    user: number;
    projectAccess: number;
    userProjects: number;
  };
}

export const cacheConfig: CacheConfig = {
  enabled: process.env.CACHE_ENABLED !== 'false', // Default true
  type: (process.env.CACHE_TYPE as 'redis' | 'memory' | 'none') || 'memory',
  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 10000,
  redisObjectId: process.env.REDIS_OBJECT_ID,
  ttl: {
    user: parseInt(process.env.CACHE_TTL_USER || '3600'),
    projectAccess: parseInt(process.env.CACHE_TTL_PROJECT_ACCESS || '1800'),
    userProjects: parseInt(process.env.CACHE_TTL_USER_PROJECTS || '600'),
  }
};

// Validate configuration
if (cacheConfig.enabled && cacheConfig.type === 'redis' && !cacheConfig.redisHost) {
  console.warn('⚠️  Redis cache enabled but REDIS_HOST not configured. Falling back to memory cache.');
  cacheConfig.type = 'memory';
}