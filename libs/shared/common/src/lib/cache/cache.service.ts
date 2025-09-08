import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string; // Cache namespace
  tags?: string[]; // Tags for cache invalidation
  compressed?: boolean; // Whether to compress the data
  serialize?: boolean; // Whether to serialize objects
  skipCache?: boolean; // Skip cache for specific operations
}

export interface CacheKey {
  key: string;
  namespace?: string;
  version?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage?: number;
}

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;
  private memoryCache: Map<string, { value: any; expiry: number; tags: string[] }> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
    totalKeys: 0,
  };
  
  private readonly defaultTTL = 3600; // 1 hour
  private readonly maxMemoryCacheSize = 1000;
  private cleanupInterval: NodeJS.Timer;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeRedis();
    this.startMemoryCacheCleanup();
  }

  private async initializeRedis() {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
      const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
      const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

      if (redisUrl) {
        this.redis = new Redis(redisUrl);
      } else {
        this.redis = new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
      }

      await this.redis.ping();
      this.logger.log('Redis connection established');
    } catch (error) {
      this.logger.warn('Redis connection failed, falling back to memory cache only', error.message);
      this.redis = null;
    }
  }

  private startMemoryCacheCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanExpiredMemoryCache();
    }, 60000); // Cleanup every minute
  }

  private cleanExpiredMemoryCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiry > 0 && entry.expiry < now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    // Enforce max size by removing oldest entries
    if (this.memoryCache.size > this.maxMemoryCacheSize) {
      const entries = Array.from(this.memoryCache.entries());
      const toRemove = this.memoryCache.size - this.maxMemoryCacheSize;
      
      for (let i = 0; i < toRemove; i++) {
        this.memoryCache.delete(entries[i][0]);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired/overflow entries from memory cache`);
    }
  }

  private buildCacheKey(key: string | CacheKey, namespace?: string): string {
    if (typeof key === 'string') {
      const ns = namespace || 'default';
      return `${ns}:${key}`;
    }

    const ns = key.namespace || namespace || 'default';
    const version = key.version ? `:v${key.version}` : '';
    return `${ns}:${key.key}${version}`;
  }

  private serializeValue(value: any, options: CacheOptions = {}): string {
    if (options.serialize === false) {
      return value;
    }

    let serialized = JSON.stringify(value);
    
    if (options.compressed && serialized.length > 1000) {
      // In a real implementation, you'd use compression like gzip
      // For now, we'll just flag it for compression
      serialized = `__compressed__${serialized}`;
    }

    return serialized;
  }

  private deserializeValue(value: string, options: CacheOptions = {}): any {
    if (options.serialize === false) {
      return value;
    }

    try {
      if (value.startsWith('__compressed__')) {
        // In a real implementation, you'd decompress here
        value = value.substring('__compressed__'.length);
      }
      
      return JSON.parse(value);
    } catch (error) {
      this.logger.warn('Failed to deserialize cache value', error);
      return value;
    }
  }

  async get<T = any>(key: string | CacheKey, options: CacheOptions = {}): Promise<T | null> {
    const cacheKey = this.buildCacheKey(key, options.namespace);
    
    try {
      // Try memory cache first
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry) {
        if (memoryEntry.expiry === 0 || memoryEntry.expiry > Date.now()) {
          this.stats.hits++;
          this.updateHitRate();
          return memoryEntry.value;
        } else {
          this.memoryCache.delete(cacheKey);
        }
      }

      // Try Redis if available
      if (this.redis) {
        const value = await this.redis.get(cacheKey);
        if (value !== null) {
          const deserialized = this.deserializeValue(value, options);
          
          // Store in memory cache for faster access
          this.setMemoryCache(cacheKey, deserialized, options);
          
          this.stats.hits++;
          this.updateHitRate();
          return deserialized;
        }
      }

      this.stats.misses++;
      this.updateHitRate();
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${cacheKey}:`, error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  async set(
    key: string | CacheKey,
    value: any,
    options: CacheOptions = {}
  ): Promise<void> {
    const cacheKey = this.buildCacheKey(key, options.namespace);
    const ttl = options.ttl || this.defaultTTL;
    
    try {
      const serialized = this.serializeValue(value, options);
      
      // Store in memory cache
      this.setMemoryCache(cacheKey, value, options, ttl);
      
      // Store in Redis if available
      if (this.redis) {
        if (ttl > 0) {
          await this.redis.setex(cacheKey, ttl, serialized);
        } else {
          await this.redis.set(cacheKey, serialized);
        }
        
        // Store tags for invalidation
        if (options.tags && options.tags.length > 0) {
          await this.storeCacheTags(cacheKey, options.tags);
        }
      }

      this.stats.sets++;
      this.logger.debug(`Cached ${cacheKey} with TTL ${ttl}s`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${cacheKey}:`, error);
    }
  }

  private setMemoryCache(
    cacheKey: string,
    value: any,
    options: CacheOptions,
    ttlSeconds?: number
  ) {
    const ttl = ttlSeconds || options.ttl || this.defaultTTL;
    const expiry = ttl > 0 ? Date.now() + (ttl * 1000) : 0;
    
    this.memoryCache.set(cacheKey, {
      value,
      expiry,
      tags: options.tags || [],
    });
  }

  private async storeCacheTags(cacheKey: string, tags: string[]): Promise<void> {
    if (!this.redis) return;

    const pipeline = this.redis.pipeline();
    
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      pipeline.sadd(tagKey, cacheKey);
      pipeline.expire(tagKey, 86400); // Tags expire in 24 hours
    }
    
    await pipeline.exec();
  }

  async delete(key: string | CacheKey, options: CacheOptions = {}): Promise<void> {
    const cacheKey = this.buildCacheKey(key, options.namespace);
    
    try {
      // Remove from memory cache
      this.memoryCache.delete(cacheKey);
      
      // Remove from Redis if available
      if (this.redis) {
        await this.redis.del(cacheKey);
      }

      this.stats.deletes++;
      this.logger.debug(`Deleted cache key: ${cacheKey}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${cacheKey}:`, error);
    }
  }

  async deleteByPattern(pattern: string, namespace?: string): Promise<number> {
    const searchPattern = namespace ? `${namespace}:${pattern}` : pattern;
    let deleted = 0;

    try {
      // Delete from memory cache
      for (const key of this.memoryCache.keys()) {
        if (this.matchesPattern(key, searchPattern)) {
          this.memoryCache.delete(key);
          deleted++;
        }
      }

      // Delete from Redis if available
      if (this.redis) {
        const keys = await this.redis.keys(searchPattern);
        if (keys.length > 0) {
          const result = await this.redis.del(...keys);
          deleted += result;
        }
      }

      this.logger.debug(`Deleted ${deleted} keys matching pattern: ${searchPattern}`);
      return deleted;
    } catch (error) {
      this.logger.error(`Cache delete by pattern error:`, error);
      return deleted;
    }
  }

  async deleteByTag(tag: string): Promise<number> {
    if (!this.redis) {
      // For memory cache, we need to check all entries
      let deleted = 0;
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.tags.includes(tag)) {
          this.memoryCache.delete(key);
          deleted++;
        }
      }
      return deleted;
    }

    try {
      const tagKey = `tag:${tag}`;
      const keys = await this.redis.smembers(tagKey);
      
      if (keys.length > 0) {
        // Delete all keys with this tag
        const pipeline = this.redis.pipeline();
        keys.forEach(key => {
          pipeline.del(key);
          this.memoryCache.delete(key); // Also remove from memory cache
        });
        pipeline.del(tagKey); // Remove the tag set itself
        
        const results = await pipeline.exec();
        const deleted = results.filter(([error, result]) => !error && result === 1).length;
        
        this.logger.debug(`Deleted ${deleted} keys with tag: ${tag}`);
        return deleted;
      }
      
      return 0;
    } catch (error) {
      this.logger.error(`Cache delete by tag error:`, error);
      return 0;
    }
  }

  async clear(namespace?: string): Promise<void> {
    try {
      if (namespace) {
        // Clear specific namespace
        await this.deleteByPattern(`${namespace}:*`);
      } else {
        // Clear all caches
        this.memoryCache.clear();
        
        if (this.redis) {
          await this.redis.flushdb();
        }
      }
      
      this.logger.log(`Cleared cache${namespace ? ` for namespace: ${namespace}` : ''}`);
    } catch (error) {
      this.logger.error('Cache clear error:', error);
    }
  }

  async mget<T = any>(keys: (string | CacheKey)[], options: CacheOptions = {}): Promise<(T | null)[]> {
    const cacheKeys = keys.map(key => this.buildCacheKey(key, options.namespace));
    const results: (T | null)[] = new Array(keys.length).fill(null);
    const missingKeys: { index: number; key: string }[] = [];

    // Check memory cache first
    cacheKeys.forEach((cacheKey, index) => {
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry && (memoryEntry.expiry === 0 || memoryEntry.expiry > Date.now())) {
        results[index] = memoryEntry.value;
        this.stats.hits++;
      } else {
        missingKeys.push({ index, key: cacheKey });
        this.stats.misses++;
      }
    });

    // Get missing keys from Redis
    if (missingKeys.length > 0 && this.redis) {
      try {
        const redisKeys = missingKeys.map(item => item.key);
        const values = await this.redis.mget(...redisKeys);
        
        values.forEach((value, i) => {
          const { index, key } = missingKeys[i];
          if (value !== null) {
            const deserialized = this.deserializeValue(value, options);
            results[index] = deserialized;
            this.setMemoryCache(key, deserialized, options);
            this.stats.hits++;
            this.stats.misses--; // Correct the miss count
          }
        });
      } catch (error) {
        this.logger.error('Cache mget error:', error);
      }
    }

    this.updateHitRate();
    return results;
  }

  async mset(entries: { key: string | CacheKey; value: any; options?: CacheOptions }[]): Promise<void> {
    const pipeline = this.redis?.pipeline();

    for (const entry of entries) {
      const cacheKey = this.buildCacheKey(entry.key, entry.options?.namespace);
      const options = entry.options || {};
      const ttl = options.ttl || this.defaultTTL;
      
      // Store in memory cache
      this.setMemoryCache(cacheKey, entry.value, options, ttl);
      
      // Store in Redis if available
      if (pipeline) {
        const serialized = this.serializeValue(entry.value, options);
        if (ttl > 0) {
          pipeline.setex(cacheKey, ttl, serialized);
        } else {
          pipeline.set(cacheKey, serialized);
        }
      }
      
      this.stats.sets++;
    }

    if (pipeline) {
      await pipeline.exec();
    }
  }

  // Cache-aside pattern helper
  async getOrSet<T>(
    key: string | CacheKey,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  // Refresh cache in background
  async refresh<T>(
    key: string | CacheKey,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const value = await factory();
      await this.set(key, value, options);
    } catch (error) {
      this.logger.error('Cache refresh error:', error);
    }
  }

  // Cache warming
  async warm(warmers: Array<{ key: string | CacheKey; factory: () => Promise<any>; options?: CacheOptions }>): Promise<void> {
    this.logger.log(`Warming ${warmers.length} cache entries`);
    
    const promises = warmers.map(async (warmer) => {
      try {
        const value = await warmer.factory();
        await this.set(warmer.key, value, warmer.options || {});
      } catch (error) {
        this.logger.error(`Failed to warm cache for key:`, error);
      }
    });

    await Promise.allSettled(promises);
    this.logger.log('Cache warming completed');
  }

  getStats(): CacheStats {
    return {
      ...this.stats,
      totalKeys: this.memoryCache.size,
    };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  async onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}