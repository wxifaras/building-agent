import { ICache } from './CacheInterface';
import { RedisCache } from './RedisCache';
import { MemoryCache } from './MemoryCache';
import { NoOpCache } from './NoOpCache';
import { cacheConfig } from './CacheConfig';
import { createLogger } from '../telemetry/logger';

const logger = createLogger({ context: 'CacheFactory' });

export class CacheFactory {
  static async createCache(): Promise<ICache> {
    if (!cacheConfig.enabled) {
      logger.info('📦 Cache is disabled');
      return new NoOpCache();
    }

    let cache: ICache;

    switch (cacheConfig.type) {
      case 'redis':
        if (!cacheConfig.redisHost) {
          logger.warn('⚠️  Redis host not configured, falling back to memory cache');
          cache = new MemoryCache();
        } else {
          const authMethod = cacheConfig.redisAccessKey ? 'Access Key' : 'Entra ID';
          logger.info(`📦 Initializing Azure Redis with ${authMethod} authentication...`);
          cache = new RedisCache(
            cacheConfig.redisHost, 
            cacheConfig.redisPort, 
            cacheConfig.redisAccessKey
          );
        }
        break;

      case 'memory':
        logger.info('📦 Initializing in-memory cache...');
        cache = new MemoryCache();
        break;

      case 'none':
        logger.info('📦 Cache disabled via configuration');
        cache = new NoOpCache();
        break;

      default:
        logger.warn(`⚠️  Unknown cache type: ${cacheConfig.type}, falling back to memory cache`);
        cache = new MemoryCache();
    }

    try {
      await cache.connect();
      logger.info('✓ Cache initialized successfully', { 
        type: cacheConfig.type,
        ttls: {
          userProjects: cacheConfig.ttl.userProjects,
          projectAccess: cacheConfig.ttl.projectAccess
        }
      });
      return cache;
    } catch (error) {
      logger.error('❌ Failed to initialize cache', error as Error);
      logger.info('📦 Falling back to no-op cache');
      const noOpCache = new NoOpCache();
      await noOpCache.connect();
      return noOpCache;
    }
  }
}