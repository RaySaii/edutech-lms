import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RateLimitingService, RateLimitConfig } from './rate-limiting.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limiting.decorator';
import { UserRole } from '../../enums/user.enums';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly rateLimitingService: RateLimitingService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      // No rate limiting configured for this endpoint
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    try {
      const key = this.generateRateLimitKey(request, rateLimitOptions);
      const config = this.getRateLimitConfig(request, rateLimitOptions);

      const result = await this.rateLimitingService.checkRateLimit(key, config);

      // Set rate limiting headers
      this.setRateLimitHeaders(response, result.rateLimitInfo);

      if (!result.allowed) {
        this.logger.warn(`Rate limit exceeded for key: ${key}`, {
          ip: this.getClientIp(request),
          userAgent: request.get('user-agent'),
          endpoint: `${request.method} ${request.path}`,
          rateLimitInfo: result.rateLimitInfo,
        });

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests',
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil(
              (result.rateLimitInfo.resetTime - Date.now()) / 1000
            ),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Rate limiting check failed:', error);
      // On error, allow the request to proceed
      return true;
    }
  }

  private generateRateLimitKey(
    request: Request,
    options: RateLimitOptions,
  ): string {
    const keyGenerator = options.keyGenerator || 'ip';
    
    switch (keyGenerator) {
      case 'ip':
        return `ip:${this.getClientIp(request)}`;
      
      case 'user':
        const userId = this.getUserId(request);
        return userId ? `user:${userId}` : `ip:${this.getClientIp(request)}`;
      
      case 'user-ip':
        const userIdForUserIp = this.getUserId(request);
        const ip = this.getClientIp(request);
        return userIdForUserIp ? `user:${userIdForUserIp}:ip:${ip}` : `ip:${ip}`;
      
      default:
        // Custom key generator string
        return keyGenerator;
    }
  }

  private getRateLimitConfig(
    request: Request,
    options: RateLimitOptions,
  ): RateLimitConfig {
    let config = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
    };

    // Apply role-based configuration if available
    if (options.customConfig) {
      const userRole = this.getUserRole(request);
      if (userRole && options.customConfig[userRole]) {
        config = {
          ...config,
          ...options.customConfig[userRole],
        };
      }
    }

    return {
      ...config,
      skipIf: (req: any) => {
        // Skip rate limiting for certain conditions
        if (options.skipSuccessfulRequests && req.statusCode < 400) {
          return true;
        }
        if (options.skipFailedRequests && req.statusCode >= 400) {
          return true;
        }
        return false;
      },
      onLimitReached: (req: any, rateLimitInfo: any) => {
        this.logger.warn('Rate limit exceeded', {
          key: this.generateRateLimitKey(request, options),
          rateLimitInfo,
          endpoint: `${request.method} ${request.path}`,
          userAgent: request.get('user-agent'),
        });
      },
    };
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  private getUserId(request: Request): string | null {
    // Extract user ID from JWT token or session
    const user = (request as any).user;
    return user?.id || user?.sub || null;
  }

  private getUserRole(request: Request): UserRole | null {
    // Extract user role from JWT token or session
    const user = (request as any).user;
    return user?.role || null;
  }

  private setRateLimitHeaders(response: Response, rateLimitInfo: any): void {
    response.setHeader('X-RateLimit-Limit', rateLimitInfo.maxRequests);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimitInfo.remainingRequests));
    response.setHeader('X-RateLimit-Reset', new Date(rateLimitInfo.resetTime).toISOString());
    response.setHeader('X-RateLimit-Window', rateLimitInfo.windowMs);

    if (rateLimitInfo.remainingRequests <= 0) {
      response.setHeader(
        'Retry-After',
        Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000)
      );
    }
  }
}