import dotenv from 'dotenv';
import { createLogger } from '../telemetry/logger';

const logger = createLogger({ context: 'CacheConfig' });

// Load environment variables first
dotenv.config();

export interface CacheConfig {
  enabled: boolean;
  type: 'redis' | 'memory' | 'none';
  redisHost?: string;
  redisPort?: number;
  redisAccessKey?: string;
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
  redisAccessKey: process.env.REDIS_ACCESS_KEY || undefined,
  ttl: {
    user: parseInt(process.env.CACHE_TTL_USER || '3600'),
    projectAccess: parseInt(process.env.CACHE_TTL_PROJECT_ACCESS || '1800'),
    userProjects: parseInt(process.env.CACHE_TTL_USER_PROJECTS || '600'),
  }
};

// Validate configuration
if (cacheConfig.enabled && cacheConfig.type === 'redis' && !cacheConfig.redisHost) {
  logger.warn('Redis cache enabled but REDIS_HOST not configured. Falling back to memory cache.');
  cacheConfig.type = 'memory';
}