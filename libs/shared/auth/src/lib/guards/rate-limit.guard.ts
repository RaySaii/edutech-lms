import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxAttempts: number; // Maximum attempts in window
  blockDurationMs?: number; // How long to block after limit exceeded
}

export const RATE_LIMIT_KEY = 'rateLimit';

// In-memory store (in production, use Redis)
const attemptStore = new Map<string, { count: number; resetTime: number; blockedUntil?: number }>();

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(private reflector: Reflector) {
    // Clean expired entries every 5 minutes
    setInterval(() => this.cleanExpiredEntries(), 5 * 60 * 1000);
  }

  canActivate(context: ExecutionContext): boolean {
    const rateLimitConfig = this.reflector.getAllAndOverride<RateLimitConfig>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!rateLimitConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const clientId = this.getClientIdentifier(request);
    const now = Date.now();

    const entry = attemptStore.get(clientId);

    // Check if client is currently blocked
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      const remainingTime = Math.ceil((entry.blockedUntil - now) / 1000);
      this.logger.warn(`Rate limit exceeded for ${clientId}, blocked for ${remainingTime}s more`);
      throw new HttpException(
        `Too many attempts. Try again in ${remainingTime} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Initialize or reset window if expired
    if (!entry || entry.resetTime <= now) {
      attemptStore.set(clientId, {
        count: 1,
        resetTime: now + rateLimitConfig.windowMs,
      });
      return true;
    }

    // Increment attempt count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > rateLimitConfig.maxAttempts) {
      const blockDuration = rateLimitConfig.blockDurationMs || rateLimitConfig.windowMs;
      entry.blockedUntil = now + blockDuration;
      
      this.logger.warn(
        `Rate limit exceeded for ${clientId}: ${entry.count} attempts in window. ` +
        `Blocking for ${blockDuration / 1000}s`
      );
      
      throw new HttpException(
        `Too many attempts. Try again in ${blockDuration / 1000} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }

  private getClientIdentifier(request: any): string {
    // Use IP address and User-Agent for identification
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';
    
    // If user is authenticated, also include user ID for more granular control
    const userId = request.user?.id || '';
    
    return `${ip}:${userAgent}:${userId}`;
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of attemptStore.entries()) {
      if (entry.resetTime <= now && (!entry.blockedUntil || entry.blockedUntil <= now)) {
        attemptStore.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired rate limit entries`);
    }
  }
}