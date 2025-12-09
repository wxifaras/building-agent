import { createClient, RedisClientType } from 'redis';
import { ICache, CachedUserProjects, CachedProjectAccess } from './CacheInterface';

export class RedisCache implements ICache {
  private client: RedisClientType | null = null;
  private connected: boolean = false;

  constructor(private redisUrl: string) {}

  async connect(): Promise<void> {
    try {
      this.client = createClient({
        url: this.redisUrl,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500)
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
        this.connected = true;
      });

      this.client.on('disconnect', () => {
        console.log('Redis Client Disconnected');
        this.connected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private getKey(type: string, ...parts: string[]): string {
    return `${type}:${parts.join(':')}`;
  }

  // User projects operations
  async getUserProjects(userId: string): Promise<CachedUserProjects | null> {
    if (!this.client || !this.connected) return null;
    
    try {
      const key = this.getKey('user-projects', userId);
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get user projects error:', error);
      return null;
    }
  }

  async setUserProjects(userId: string, projects: CachedUserProjects, ttl: number): Promise<void> {
    if (!this.client || !this.connected) return;
    
    try {
      const key = this.getKey('user-projects', userId);
      await this.client.setEx(key, ttl, JSON.stringify(projects));
    } catch (error) {
      console.error('Redis set user projects error:', error);
    }
  }

  async invalidateUserProjects(userId: string): Promise<void> {
    if (!this.client || !this.connected) return;
    
    try {
      const key = this.getKey('user-projects', userId);
      await this.client.del(key);
    } catch (error) {
      console.error('Redis invalidate user projects error:', error);
    }
  }

  // Project access operations
  async getProjectAccess(userId: string, projectId: string): Promise<CachedProjectAccess | null> {
    if (!this.client || !this.connected) return null;
    
    try {
      const key = this.getKey('access', userId, projectId);
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get project access error:', error);
      return null;
    }
  }

  async setProjectAccess(userId: string, projectId: string, access: CachedProjectAccess, ttl: number): Promise<void> {
    if (!this.client || !this.connected) return;
    
    try {
      const key = this.getKey('access', userId, projectId);
      await this.client.setEx(key, ttl, JSON.stringify(access));
    } catch (error) {
      console.error('Redis set project access error:', error);
    }
  }

  async invalidateProjectAccess(userId: string, projectId: string): Promise<void> {
    if (!this.client || !this.connected) return;
    
    try {
      await Promise.all([
        this.client.del(this.getKey('access', userId, projectId)),
        this.client.del(this.getKey('user-projects', userId))
      ]);
    } catch (error) {
      console.error('Redis invalidate project access error:', error);
    }
  }

  // Bulk operations
  async invalidateProjectCache(projectId: string): Promise<void> {
    if (!this.client || !this.connected) return;
    
    try {
      // Use SCAN instead of KEYS to avoid blocking Redis
      const pattern = this.getKey('access', '*', projectId);
      const keys: string[] = [];
      
      for await (const key of this.client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        if (typeof key === 'string') {
          keys.push(key);
        }
      }
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }

      // Also invalidate user project lists that might contain this project
      const userProjectPattern = this.getKey('user-projects', '*');
      const userKeys: string[] = [];
      
      for await (const key of this.client.scanIterator({ MATCH: userProjectPattern, COUNT: 100 })) {
        if (typeof key === 'string') {
          userKeys.push(key);
        }
      }
      
      if (userKeys.length > 0) {
        await this.client.del(userKeys);
      }
    } catch (error) {
      console.error('Redis invalidate project cache error:', error);
    }
  }
}