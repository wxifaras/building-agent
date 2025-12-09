// utils/cache/CacheFactory.ts
import { ICache } from './CacheInterface';
import { RedisCache } from './RedisCache';
import { MemoryCache } from './MemoryCache';
import { NoOpCache } from './NoOpCache';
import { cacheConfig } from '../../config/CacheConfig';

export class CacheFactory {
  static async createCache(): Promise<ICache> {
    if (!cacheConfig.enabled) {
      console.log('📦 Cache is disabled');
      return new NoOpCache();
    }

    let cache: ICache;

    switch (cacheConfig.type) {
      case 'redis':
        if (!cacheConfig.redisUrl) {
          console.warn('⚠️  Redis URL not configured, falling back to memory cache');
          cache = new MemoryCache();
        } else {
          console.log('📦 Initializing Redis cache...');
          cache = new RedisCache(cacheConfig.redisUrl);
        }
        break;

      case 'memory':
        console.log('📦 Initializing in-memory cache...');
        cache = new MemoryCache();
        break;

      case 'none':
        console.log('📦 Cache disabled via configuration');
        cache = new NoOpCache();
        break;

      default:
        console.warn(`⚠️  Unknown cache type: ${cacheConfig.type}, falling back to memory cache`);
        cache = new MemoryCache();
    }

    try {
      await cache.connect();
      console.log('✓ Cache initialized successfully');
      console.log(`  Type: ${cacheConfig.type}`);
      console.log(`  TTLs: User Projects=${cacheConfig.ttl.userProjects}s, Project Access=${cacheConfig.ttl.projectAccess}s`);
      return cache;
    } catch (error) {
      console.error('❌ Failed to initialize cache:', error);
      console.log('📦 Falling back to no-op cache');
      const noOpCache = new NoOpCache();
      await noOpCache.connect();
      return noOpCache;
    }
  }
}