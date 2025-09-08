import { SetMetadata } from '@nestjs/common';
import { CacheOptions } from './cache.service';

export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_OPTIONS_METADATA = 'cache:options';

export interface CacheDecoratorOptions extends CacheOptions {
  keyGenerator?: (...args: any[]) => string;
  condition?: (...args: any[]) => boolean;
  unless?: (...args: any[]) => boolean;
}

/**
 * Method decorator for caching return values
 * @param key Cache key or key generator function
 * @param options Caching options
 */
export function Cacheable(key: string | ((...args: any[]) => string), options: CacheDecoratorOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheService = this.cacheService || global.cacheService;
      
      if (!cacheService) {
        // If no cache service available, execute method normally
        return originalMethod.apply(this, args);
      }

      // Check condition
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Check unless condition
      if (options.unless && options.unless(...args)) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const cacheKey = typeof key === 'function' ? key(...args) : key;
      const fullKey = `${target.constructor.name}:${propertyName}:${cacheKey}`;

      try {
        // Try to get from cache
        const cached = await cacheService.get(fullKey, options);
        if (cached !== null) {
          return cached;
        }

        // Execute method and cache result
        const result = await originalMethod.apply(this, args);
        await cacheService.set(fullKey, result, options);
        
        return result;
      } catch (error) {
        // If cache fails, execute method normally
        return originalMethod.apply(this, args);
      }
    };

    // Store metadata for interceptors
    SetMetadata(CACHE_KEY_METADATA, key)(target, propertyName, descriptor);
    SetMetadata(CACHE_OPTIONS_METADATA, options)(target, propertyName, descriptor);

    return descriptor;
  };
}

/**
 * Method decorator for cache invalidation
 * @param keys Cache keys or patterns to invalidate
 * @param options Invalidation options
 */
export function CacheEvict(
  keys: string | string[] | ((...args: any[]) => string | string[]),
  options: {
    allEntries?: boolean;
    beforeInvocation?: boolean;
    condition?: (...args: any[]) => boolean;
    namespace?: string;
  } = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheService = this.cacheService || global.cacheService;
      
      // Execute invalidation before method if specified
      if (options.beforeInvocation && cacheService) {
        await performInvalidation(cacheService, keys, args, options);
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Execute invalidation after method (default)
      if (!options.beforeInvocation && cacheService) {
        await performInvalidation(cacheService, keys, args, options);
      }

      return result;
    };

    return descriptor;
  };
}

async function performInvalidation(
  cacheService: any,
  keys: string | string[] | ((...args: any[]) => string | string[]),
  args: any[],
  options: any
): Promise<void> {
  try {
    // Check condition
    if (options.condition && !options.condition(...args)) {
      return;
    }

    if (options.allEntries) {
      // Clear all entries in namespace
      await cacheService.clear(options.namespace);
      return;
    }

    // Generate cache keys
    let cacheKeys: string[];
    if (typeof keys === 'function') {
      const result = keys(...args);
      cacheKeys = Array.isArray(result) ? result : [result];
    } else {
      cacheKeys = Array.isArray(keys) ? keys : [keys];
    }

    // Invalidate each key
    for (const key of cacheKeys) {
      if (key.includes('*')) {
        // Pattern-based deletion
        await cacheService.deleteByPattern(key, options.namespace);
      } else {
        // Direct key deletion
        await cacheService.delete(key, { namespace: options.namespace });
      }
    }
  } catch (error) {
    // Log error but don't throw to avoid breaking the original method
    console.error('Cache invalidation failed:', error);
  }
}

/**
 * Method decorator for cache updating
 * @param key Cache key to update
 * @param options Update options
 */
export function CachePut(
  key: string | ((...args: any[]) => string),
  options: CacheDecoratorOptions = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheService = this.cacheService || global.cacheService;
      
      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Update cache with result
      if (cacheService) {
        try {
          // Check condition
          if (options.condition && !options.condition(...args)) {
            return result;
          }

          // Check unless condition
          if (options.unless && options.unless(...args)) {
            return result;
          }

          // Generate cache key
          const cacheKey = typeof key === 'function' ? key(...args) : key;
          const fullKey = `${target.constructor.name}:${propertyName}:${cacheKey}`;

          await cacheService.set(fullKey, result, options);
        } catch (error) {
          // Log error but don't throw
          console.error('Cache update failed:', error);
        }
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Class decorator to inject cache service
 * @param namespace Optional namespace for all cache operations in this class
 */
export function CacheNamespace(namespace?: string) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      public readonly cacheNamespace = namespace;
    };
  };
}

/**
 * Helper function to generate cache keys from method arguments
 */
export const CacheKeyGenerators = {
  // Generate key from all arguments
  fromArgs: (...args: any[]) => JSON.stringify(args),
  
  // Generate key from first argument (usually an ID)
  fromFirstArg: (arg: any) => String(arg),
  
  // Generate key from specific argument indices
  fromArgIndices: (...indices: number[]) => (...args: any[]) =>
    JSON.stringify(indices.map(i => args[i])),
  
  // Generate key from object properties
  fromObjectProps: (...props: string[]) => (obj: any) =>
    JSON.stringify(props.reduce((acc, prop) => {
      acc[prop] = obj[prop];
      return acc;
    }, {} as any)),
  
  // Generate key with prefix and arguments
  withPrefix: (prefix: string) => (...args: any[]) =>
    `${prefix}:${JSON.stringify(args)}`,
};