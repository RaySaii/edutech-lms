import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { RateLimitingService } from './rate-limiting.service';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);

  constructor(private readonly rateLimitingService: RateLimitingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    const startTime = Date.now();
    const clientIp = this.getClientIp(request);
    const userAgent = request.get('user-agent') || 'unknown';
    const endpoint = `${request.method} ${request.path}`;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logRequest(request, response, duration, 'SUCCESS');
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logRequest(request, response, duration, 'ERROR', error);
        throw error;
      }),
    );
  }

  private logRequest(
    request: Request,
    response: Response,
    duration: number,
    status: 'SUCCESS' | 'ERROR',
    error?: any,
  ): void {
    const clientIp = this.getClientIp(request);
    const userAgent = request.get('user-agent') || 'unknown';
    const endpoint = `${request.method} ${request.path}`;
    const statusCode = response.statusCode;
    const userId = this.getUserId(request);

    const logData = {
      endpoint,
      statusCode,
      duration: `${duration}ms`,
      clientIp,
      userAgent: userAgent.substring(0, 200), // Truncate long user agents
      userId: userId || 'anonymous',
      status,
      timestamp: new Date().toISOString(),
    };

    if (status === 'ERROR') {
      logData['error'] = error?.message || 'Unknown error';
      this.logger.error('Request failed', logData);
    } else {
      // Only log slow requests or errors to avoid spam
      if (duration > 1000) {
        this.logger.warn('Slow request detected', logData);
      } else if (statusCode >= 400) {
        this.logger.warn('Request completed with error status', logData);
      }
    }

    // Log rate limit headers if present
    const rateLimitHeaders = this.extractRateLimitHeaders(response);
    if (rateLimitHeaders.hasRateLimitHeaders) {
      this.logger.debug('Rate limit headers', {
        endpoint,
        userId: userId || 'anonymous',
        clientIp,
        ...rateLimitHeaders,
      });
    }
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
    const user = (request as any).user;
    return user?.id || user?.sub || null;
  }

  private extractRateLimitHeaders(response: Response): {
    hasRateLimitHeaders: boolean;
    limit?: string;
    remaining?: string;
    reset?: string;
    window?: string;
    retryAfter?: string;
  } {
    const headers = response.getHeaders();
    
    const hasRateLimitHeaders = Boolean(
      headers['x-ratelimit-limit'] ||
      headers['x-ratelimit-remaining'] ||
      headers['x-ratelimit-reset']
    );

    return {
      hasRateLimitHeaders,
      limit: headers['x-ratelimit-limit'] as string,
      remaining: headers['x-ratelimit-remaining'] as string,
      reset: headers['x-ratelimit-reset'] as string,
      window: headers['x-ratelimit-window'] as string,
      retryAfter: headers['retry-after'] as string,
    };
  }
}