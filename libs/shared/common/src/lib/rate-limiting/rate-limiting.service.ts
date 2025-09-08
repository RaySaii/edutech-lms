import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: any) => string;
  skipIf?: (req: any) => boolean;
  onLimitReached?: (req: any, rateLimitInfo: RateLimitInfo) => void;
}

export interface RateLimitInfo {
  totalRequests: number;
  remainingRequests: number;
  resetTime: number;
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  rateLimitInfo: RateLimitInfo;
}

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);
  
  constructor(private readonly cacheService: CacheService) {}

  async checkRateLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const cacheKey = `rate_limit:${key}:${windowStart}`;

    try {
      // Get current request count for this window
      let requestCount = await this.cacheService.get<number>(cacheKey);
      
      if (requestCount === null) {
        requestCount = 0;
      }

      const newRequestCount = requestCount + 1;
      const remainingRequests = Math.max(0, config.maxRequests - newRequestCount);
      const resetTime = windowStart + config.windowMs;

      const rateLimitInfo: RateLimitInfo = {
        totalRequests: newRequestCount,
        remainingRequests,
        resetTime,
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
      };

      if (newRequestCount > config.maxRequests) {
        // Rate limit exceeded
        if (config.onLimitReached) {
          config.onLimitReached(null, rateLimitInfo);
        }

        return {
          allowed: false,
          rateLimitInfo: {
            ...rateLimitInfo,
            remainingRequests: 0,
          },
        };
      }

      // Update the request count with TTL
      const ttlMs = Math.ceil((resetTime - now) / 1000);
      await this.cacheService.set(cacheKey, newRequestCount, {
        ttl: ttlMs,
        namespace: 'rate_limiting',
      });

      return {
        allowed: true,
        rateLimitInfo,
      };
    } catch (error) {
      this.logger.error('Rate limiting check failed:', error);
      // On error, allow the request to proceed
      return {
        allowed: true,
        rateLimitInfo: {
          totalRequests: 1,
          remainingRequests: config.maxRequests - 1,
          resetTime: windowStart + config.windowMs,
          windowMs: config.windowMs,
          maxRequests: config.maxRequests,
        },
      };
    }
  }

  async resetRateLimit(key: string): Promise<void> {
    try {
      await this.cacheService.deleteByPattern(`rate_limit:${key}:*`, 'rate_limiting');
      this.logger.log(`Rate limit reset for key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to reset rate limit for key: ${key}`, error);
    }
  }

  async getRateLimitInfo(key: string, windowMs: number): Promise<RateLimitInfo | null> {
    try {
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const cacheKey = `rate_limit:${key}:${windowStart}`;
      
      const requestCount = await this.cacheService.get<number>(cacheKey);
      
      if (requestCount === null) {
        return null;
      }

      return {
        totalRequests: requestCount,
        remainingRequests: 0, // Will be calculated based on max requests
        resetTime: windowStart + windowMs,
        windowMs,
        maxRequests: 0, // Will be set based on actual config
      };
    } catch (error) {
      this.logger.error('Failed to get rate limit info:', error);
      return null;
    }
  }

  async getGlobalRateLimitStats(): Promise<{
    totalKeys: number;
    activeWindows: number;
    totalRequests: number;
  }> {
    try {
      // This would require implementing a way to scan Redis keys
      // For now, return mock data
      return {
        totalKeys: 0,
        activeWindows: 0,
        totalRequests: 0,
      };
    } catch (error) {
      this.logger.error('Failed to get global rate limit stats:', error);
      return {
        totalKeys: 0,
        activeWindows: 0,
        totalRequests: 0,
      };
    }
  }
}