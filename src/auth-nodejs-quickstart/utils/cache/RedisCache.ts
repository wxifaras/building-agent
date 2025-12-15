import { createClient, RedisClientType } from 'redis';
import { DefaultAzureCredential } from '@azure/identity';
import { ICache, CachedUserProjects, CachedProjectAccess } from './CacheInterface';
import { logger } from '../telemetry/logger';

export class RedisCache implements ICache {
  private client: RedisClientType | null = null;
  private connected: boolean = false;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private credential: DefaultAzureCredential | null = null;
  private redisHost: string;
  private redisPort: number;
  private objectId: string | null = null;
  private authType: 'entra-id' | 'access-key';
  private accessKey: string | null = null;

  constructor(host: string, port: number = 10000, accessKey?: string) {
    this.redisHost = host;
    this.redisPort = port;
    this.accessKey = accessKey || null;
    this.authType = accessKey ? 'access-key' : 'entra-id';
    
    // Only initialize credential if using Entra ID auth
    if (this.authType === 'entra-id') {
      this.credential = new DefaultAzureCredential();
    }
  }

  private async getEntraToken(): Promise<string> {
    if (!this.credential) {
      throw new Error('DefaultAzureCredential not initialized');
    }

    // Get token for Azure Redis scope
    const tokenResponse = await this.credential.getToken('https://redis.azure.com/.default');
    logger.debug('Redis: Entra token obtained', {
      tokenLength: tokenResponse.token.length,
      expires: new Date(tokenResponse.expiresOnTimestamp).toISOString()
    });
    return tokenResponse.token;
  }

  private parseObjectIdFromToken(token: string): string {
    try {
      // Decode the JWT token to get the Object ID (oid claim)
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return payload.oid || payload.sub;
    } catch (error) {
      throw new Error('Failed to parse Object ID from token');
    }
  }

  private async refreshEntraToken(): Promise<void> {
    if (!this.client || !this.objectId) return;

    try {
      const token = await this.getEntraToken();
      // Use AUTH command to update the token with the Object ID as username
      await this.client.sendCommand(['AUTH', this.objectId, token]);
      logger.debug('Redis: Token refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh Redis token', error as Error);
    }
  }

  private startTokenRefresh(): void {
    // Refresh token every 45 minutes (tokens are valid for 1 hour)
    this.tokenRefreshTimer = setInterval(() => {
      this.refreshEntraToken().catch(err => {
        logger.error('Token refresh error', err as Error);
      });
    }, 45 * 60 * 1000); // 45 minutes
  }

  private stopTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  async connect(): Promise<void> {
    try {
      if (this.authType === 'access-key') {
        // Access Key Authentication
        if (!this.accessKey) {
          throw new Error('Access key is required for access-key authentication');
        }

        this.client = createClient({
          socket: {
            host: this.redisHost,
            port: this.redisPort,
            tls: true,
            reconnectStrategy: (retries) => Math.min(retries * 50, 500)
          },
          password: this.accessKey
        });

        logger.info('Connecting to Azure Redis with Access Key', {
          host: this.redisHost,
          port: this.redisPort
        });
      } else {
        // Entra ID Authentication
        const token = await this.getEntraToken();
        
        // Extract Object ID from token to use as username
        this.objectId = this.parseObjectIdFromToken(token);
        logger.debug('Using Object ID as Redis username', { objectId: this.objectId });
        
        this.client = createClient({
          socket: {
            host: this.redisHost,
            port: this.redisPort,
            tls: true,
            reconnectStrategy: (retries) => Math.min(retries * 50, 500)
          },
          username: this.objectId,
          password: token
        });

        logger.info('Connecting to Azure Redis with Entra ID', {
          host: this.redisHost,
          port: this.redisPort
        });
      }

      this.client.on('error', (err) => {
        logger.error('Redis Client Error', err as Error);
        this.connected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
        this.connected = true;
      });

      this.client.on('disconnect', () => {
        logger.info('Redis Client Disconnected');
        this.connected = false;
      });

      await this.client.connect();

      // Start automatic token refresh only for Entra ID auth
      if (this.authType === 'entra-id') {
        this.startTokenRefresh();
      }
    } catch (error) {
      logger.error('Failed to connect to Redis', error as Error);
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.stopTokenRefresh();
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
      logger.error('Redis get user projects error', error as Error, { userId });
      return null;
    }
  }

  async setUserProjects(userId: string, projects: CachedUserProjects, ttl: number): Promise<void> {
    if (!this.client || !this.connected) return;
    
    try {
      const key = this.getKey('user-projects', userId);
      await this.client.setEx(key, ttl, JSON.stringify(projects));
    } catch (error) {
      logger.error('Redis set user projects error', error as Error, { userId, ttl });
    }
  }

  async invalidateUserProjects(userId: string): Promise<void> {
    if (!this.client || !this.connected) return;
    
    try {
      const key = this.getKey('user-projects', userId);
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis invalidate user projects error', error as Error, { userId });
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
      logger.error('Redis get project access error', error as Error, { userId, projectId });
      return null;
    }
  }

  async setProjectAccess(userId: string, projectId: string, access: CachedProjectAccess, ttl: number): Promise<void> {
    if (!this.client || !this.connected) return;
    
    try {
      const key = this.getKey('access', userId, projectId);
      await this.client.setEx(key, ttl, JSON.stringify(access));
    } catch (error) {
      logger.error('Redis set project access error', error as Error, { userId, projectId, ttl });
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
      logger.error('Redis invalidate project access error', error as Error, { userId, projectId });
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
      logger.error('Redis invalidate project cache error', error as Error, { projectId });
    }
  }
}