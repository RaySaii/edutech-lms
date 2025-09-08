import { Repository, FindOptionsWhere, FindManyOptions, FindOneOptions, DeepPartial } from 'typeorm';
import { CacheService, CacheOptions } from './cache.service';
import { Logger } from '@nestjs/common';

export interface CachedRepositoryOptions extends CacheOptions {
  entityName: string;
  enableWrite?: boolean; // Enable caching for write operations
  skipCache?: boolean; // Skip cache for specific operations
}

export abstract class CachedRepository<T> {
  protected readonly logger = new Logger(this.constructor.name);
  
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly cacheService: CacheService,
    protected readonly options: CachedRepositoryOptions,
  ) {}

  // Find operations with caching
  async findOne(options: FindOneOptions<T>, cacheOptions?: CacheOptions): Promise<T | null> {
    if (this.shouldSkipCache(cacheOptions)) {
      return this.repository.findOne(options);
    }

    const cacheKey = this.generateCacheKey('findOne', options);
    const mergedOptions = { ...this.options, ...cacheOptions };

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.repository.findOne(options),
      mergedOptions,
    );
  }

  async findOneBy(where: FindOptionsWhere<T>, cacheOptions?: CacheOptions): Promise<T | null> {
    return this.findOne({ where }, cacheOptions);
  }

  async findById(id: any, cacheOptions?: CacheOptions): Promise<T | null> {
    if (this.shouldSkipCache(cacheOptions)) {
      return this.repository.findOne({ where: { id } as any });
    }

    const cacheKey = this.generateCacheKey('findById', id);
    const mergedOptions = { 
      ...this.options, 
      ...cacheOptions,
      tags: [...(this.options.tags || []), `${this.options.entityName}:${id}`],
    };

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.repository.findOne({ where: { id } as any }),
      mergedOptions,
    );
  }

  async find(options?: FindManyOptions<T>, cacheOptions?: CacheOptions): Promise<T[]> {
    if (this.shouldSkipCache(cacheOptions)) {
      return this.repository.find(options);
    }

    const cacheKey = this.generateCacheKey('find', options);
    const mergedOptions = { ...this.options, ...cacheOptions };

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.repository.find(options),
      mergedOptions,
    );
  }

  async findBy(where: FindOptionsWhere<T>, cacheOptions?: CacheOptions): Promise<T[]> {
    return this.find({ where }, cacheOptions);
  }

  async findAndCount(
    options?: FindManyOptions<T>,
    cacheOptions?: CacheOptions,
  ): Promise<[T[], number]> {
    if (this.shouldSkipCache(cacheOptions)) {
      return this.repository.findAndCount(options);
    }

    const cacheKey = this.generateCacheKey('findAndCount', options);
    const mergedOptions = { ...this.options, ...cacheOptions };

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.repository.findAndCount(options),
      mergedOptions,
    );
  }

  async count(options?: FindManyOptions<T>, cacheOptions?: CacheOptions): Promise<number> {
    if (this.shouldSkipCache(cacheOptions)) {
      return this.repository.count(options);
    }

    const cacheKey = this.generateCacheKey('count', options);
    const mergedOptions = { ...this.options, ...cacheOptions };

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.repository.count(options),
      mergedOptions,
    );
  }

  // Write operations with cache invalidation
  async save(entity: DeepPartial<T>, cacheOptions?: CacheOptions): Promise<T> {
    const result = await this.repository.save(entity as any);
    
    if (!this.shouldSkipCache(cacheOptions)) {
      await this.invalidateEntityCache(result);
      
      // If write caching is enabled, cache the saved entity
      if (this.options.enableWrite) {
        const id = (result as any).id;
        if (id) {
          const cacheKey = this.generateCacheKey('findById', id);
          await this.cacheService.set(cacheKey, result, this.options);
        }
      }
    }
    
    return result;
  }

  async insert(entity: DeepPartial<T>): Promise<T> {
    const result = await this.repository.save(entity as any);
    await this.invalidateListCaches();
    return result;
  }

  async update(
    criteria: FindOptionsWhere<T>,
    partialEntity: DeepPartial<T>,
    cacheOptions?: CacheOptions,
  ): Promise<void> {
    await this.repository.update(criteria as any, partialEntity as any);
    
    if (!this.shouldSkipCache(cacheOptions)) {
      // Invalidate affected entities
      if (this.isSingleEntityCriteria(criteria)) {
        await this.invalidateEntityCacheById((criteria as any).id);
      } else {
        await this.invalidateEntityTypeCache();
      }
    }
  }

  async delete(criteria: FindOptionsWhere<T>, cacheOptions?: CacheOptions): Promise<void> {
    if (!this.shouldSkipCache(cacheOptions)) {
      // If deleting by ID, invalidate specific cache
      if (this.isSingleEntityCriteria(criteria)) {
        await this.invalidateEntityCacheById((criteria as any).id);
      } else {
        await this.invalidateEntityTypeCache();
      }
    }
    
    await this.repository.delete(criteria as any);
  }

  async remove(entity: T, cacheOptions?: CacheOptions): Promise<T> {
    const result = await this.repository.remove(entity);
    
    if (!this.shouldSkipCache(cacheOptions)) {
      await this.invalidateEntityCache(entity);
    }
    
    return result;
  }

  // Cache management methods
  async invalidateEntityCache(entity: T): Promise<void> {
    const id = (entity as any).id;
    if (id) {
      await this.invalidateEntityCacheById(id);
    }
  }

  async invalidateEntityCacheById(id: any): Promise<void> {
    const tags = [`${this.options.entityName}:${id}`];
    await Promise.all(tags.map(tag => this.cacheService.deleteByTag(tag)));
    
    // Also invalidate direct ID cache
    const cacheKey = this.generateCacheKey('findById', id);
    await this.cacheService.delete(cacheKey, this.options);
  }

  async invalidateEntityTypeCache(): Promise<void> {
    const pattern = `*:${this.options.entityName}:*`;
    await this.cacheService.deleteByPattern(pattern);
  }

  async invalidateListCaches(): Promise<void> {
    const patterns = [
      `*:${this.options.entityName}:find:*`,
      `*:${this.options.entityName}:findAndCount:*`,
      `*:${this.options.entityName}:count:*`,
    ];
    
    await Promise.all(
      patterns.map(pattern => this.cacheService.deleteByPattern(pattern))
    );
  }

  async warmCache(warmingQueries: Array<{
    method: 'findById' | 'find' | 'findOne';
    params: any;
    options?: CacheOptions;
  }>): Promise<void> {
    const warmers = warmingQueries.map(query => ({
      key: this.generateCacheKey(query.method, query.params),
      factory: async () => {
        switch (query.method) {
          case 'findById':
            return this.repository.findOne({ where: { id: query.params } as any });
          case 'findOne':
            return this.repository.findOne(query.params);
          case 'find':
            return this.repository.find(query.params);
          default:
            throw new Error(`Unsupported warming method: ${query.method}`);
        }
      },
      options: { ...this.options, ...query.options },
    }));

    await this.cacheService.warm(warmers);
  }

  // Utility methods
  private shouldSkipCache(cacheOptions?: CacheOptions): boolean {
    return this.options.skipCache || cacheOptions?.skipCache || false;
  }

  private isSingleEntityCriteria(criteria: FindOptionsWhere<T>): boolean {
    const keys = Object.keys(criteria);
    return keys.length === 1 && keys[0] === 'id';
  }

  private generateCacheKey(method: string, params: any): string {
    const baseKey = `${this.options.entityName}:${method}`;
    
    if (params === undefined || params === null) {
      return baseKey;
    }
    
    // For simple ID lookups
    if (typeof params === 'string' || typeof params === 'number') {
      return `${baseKey}:${params}`;
    }
    
    // For complex queries, use hash
    try {
      const paramString = JSON.stringify(params, Object.keys(params).sort());
      const crypto = require('crypto');
      const hash = crypto.createHash('md5').update(paramString).digest('hex');
      return `${baseKey}:${hash}`;
    } catch (error) {
      // Fallback to string conversion
      return `${baseKey}:${String(params)}`;
    }
  }

  // Custom query caching
  async cacheQuery<R>(
    queryKey: string,
    queryFn: () => Promise<R>,
    cacheOptions?: CacheOptions,
  ): Promise<R> {
    const cacheKey = `${this.options.entityName}:custom:${queryKey}`;
    const mergedOptions = { ...this.options, ...cacheOptions };
    
    return this.cacheService.getOrSet(cacheKey, queryFn, mergedOptions);
  }

  // Get cache statistics for this repository
  async getCacheStats(): Promise<{
    entityType: string;
    totalKeys: number;
    hitRate: number;
  }> {
    const globalStats = this.cacheService.getStats();
    
    return {
      entityType: this.options.entityName,
      totalKeys: globalStats.totalKeys,
      hitRate: globalStats.hitRate,
    };
  }

  // Manual cache refresh
  async refreshCache(id: any): Promise<T | null> {
    const cacheKey = this.generateCacheKey('findById', id);
    
    return this.cacheService.refresh(
      cacheKey,
      () => this.repository.findOne({ where: { id } as any }),
      this.options,
    ).then(() => this.cacheService.get(cacheKey, this.options));
  }
}