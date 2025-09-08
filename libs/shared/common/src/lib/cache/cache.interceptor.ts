import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService, CacheOptions } from './cache.service';
import { CACHE_KEY_METADATA, CACHE_OPTIONS_METADATA } from './cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // Get cache metadata from method or class
    const cacheKey = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );
    const cacheOptions = this.reflector.get<CacheOptions>(
      CACHE_OPTIONS_METADATA,
      context.getHandler(),
    ) || {};

    // If no cache metadata, proceed normally
    if (!cacheKey) {
      return next.handle();
    }

    // Get request context
    const request = context.switchToHttp().getRequest();
    const httpMethod = request?.method?.toUpperCase();
    const isGetRequest = httpMethod === 'GET';

    // Only cache GET requests by default, unless explicitly configured
    if (!isGetRequest && !cacheOptions.ttl) {
      return next.handle();
    }

    // Build cache key from request context
    const fullCacheKey = this.buildCacheKey(context, cacheKey, cacheOptions);

    try {
      // Try to get from cache
      const cachedResult = await this.cacheService.get(fullCacheKey, cacheOptions);
      
      if (cachedResult !== null) {
        this.logger.debug(`Cache hit for key: ${fullCacheKey}`);
        return of(cachedResult);
      }

      // Execute the method and cache the result
      return next.handle().pipe(
        tap(async (result) => {
          try {
            // Only cache successful responses
            if (result && !this.isErrorResponse(result)) {
              await this.cacheService.set(fullCacheKey, result, cacheOptions);
              this.logger.debug(`Cached result for key: ${fullCacheKey}`);
            }
          } catch (error) {
            this.logger.warn(`Failed to cache result for key ${fullCacheKey}:`, error);
          }
        }),
      );
    } catch (error) {
      this.logger.error(`Cache interceptor error for key ${fullCacheKey}:`, error);
      // If cache fails, proceed with normal execution
      return next.handle();
    }
  }

  private buildCacheKey(
    context: ExecutionContext,
    baseKey: string,
    options: CacheOptions,
  ): string {
    const request = context.switchToHttp().getRequest();
    const className = context.getClass().name;
    const methodName = context.getHandler().name;
    
    // Build key components
    const components = [
      options.namespace || className.toLowerCase(),
      methodName,
      baseKey,
    ];

    // Add request-specific information for more specific caching
    if (request) {
      // Add query parameters for GET requests
      if (request.method === 'GET' && Object.keys(request.query || {}).length > 0) {
        const sortedQuery = Object.keys(request.query)
          .sort()
          .reduce((acc, key) => {
            acc[key] = request.query[key];
            return acc;
          }, {} as any);
        components.push(JSON.stringify(sortedQuery));
      }

      // Add user context if available
      if (request.user?.id) {
        components.push(`user:${request.user.id}`);
      }

      // Add tenant context if available
      if (request.tenant?.id) {
        components.push(`tenant:${request.tenant.id}`);
      }
    }

    return components.filter(Boolean).join(':');
  }

  private isErrorResponse(result: any): boolean {
    // Check if response indicates an error
    if (result && typeof result === 'object') {
      return (
        result.success === false ||
        result.error !== undefined ||
        result.statusCode >= 400
      );
    }
    return false;
  }
}

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpCacheInterceptor.name);

  constructor(private readonly cacheService: CacheService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only apply HTTP caching to GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Check if client sent cache headers
    const ifNoneMatch = request.headers['if-none-match'];
    const ifModifiedSince = request.headers['if-modified-since'];

    // Build cache key for HTTP caching
    const cacheKey = `http:${request.url}`;
    const etag = this.generateETag(request.url, request.query);

    try {
      // Check ETag first
      if (ifNoneMatch === etag) {
        response.status(304);
        response.set('etag', etag);
        response.set('cache-control', 'public, max-age=300'); // 5 minutes
        return of(null);
      }

      // Get cached response metadata
      const cachedMeta = await this.cacheService.get(`${cacheKey}:meta`);
      
      if (cachedMeta && ifModifiedSince) {
        const lastModified = new Date(cachedMeta.lastModified);
        const clientDate = new Date(ifModifiedSince);
        
        if (lastModified <= clientDate) {
          response.status(304);
          response.set('last-modified', cachedMeta.lastModified);
          response.set('etag', etag);
          return of(null);
        }
      }

      return next.handle().pipe(
        tap(async (result) => {
          // Set HTTP cache headers for successful responses
          if (result && !this.isErrorResponse(result)) {
            const now = new Date().toUTCString();
            
            response.set('etag', etag);
            response.set('last-modified', now);
            response.set('cache-control', 'public, max-age=300, must-revalidate');
            response.set('vary', 'Accept-Encoding, Authorization');

            // Store metadata for future requests
            await this.cacheService.set(
              `${cacheKey}:meta`,
              { lastModified: now, etag },
              { ttl: 300 } // 5 minutes
            );
          }
        }),
      );
    } catch (error) {
      this.logger.error('HTTP cache interceptor error:', error);
      return next.handle();
    }
  }

  private generateETag(url: string, query: any): string {
    const content = JSON.stringify({ url, query, timestamp: Date.now() });
    const crypto = require('crypto');
    return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
  }

  private isErrorResponse(result: any): boolean {
    if (result && typeof result === 'object') {
      return (
        result.success === false ||
        result.error !== undefined ||
        result.statusCode >= 400
      );
    }
    return false;
  }
}