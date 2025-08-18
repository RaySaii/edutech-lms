import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as helmet from 'helmet';
import * as compression from 'compression';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);
  private readonly isProduction: boolean;

  constructor(private configService: ConfigService) {
    this.isProduction = this.configService.get('security.environment.isProduction');
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Apply security headers using helmet
    const helmetConfig = this.configService.get('security.helmet');
    
    helmet({
      contentSecurityPolicy: helmetConfig.contentSecurityPolicy,
      hsts: this.isProduction ? helmetConfig.hsts : false,
      noSniff: true,
      frameguard: { action: 'deny' },
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false, // Disable for compatibility
      crossOriginOpenerPolicy: false,   // Disable for compatibility
      crossOriginResourcePolicy: false, // Disable for compatibility
    })(req, res, (err) => {
      if (err) {
        this.logger.error('Helmet middleware error:', err);
      }
    });

    // Add custom security headers
    this.addCustomSecurityHeaders(res);

    // Log security-relevant information in production
    if (this.isProduction) {
      this.logSecurityInfo(req);
    }

    // Apply compression in production
    if (this.isProduction) {
      compression({
        filter: (req, res) => {
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        },
        level: 6,
        threshold: 1024,
      })(req, res, next);
    } else {
      next();
    }
  }

  private addCustomSecurityHeaders(res: Response): void {
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Add custom application headers
    res.setHeader('X-EduTech-Version', this.configService.get('APP_VERSION', '1.0.0'));
    res.setHeader('X-Request-ID', this.generateRequestId());
  }

  private logSecurityInfo(req: Request): void {
    const securityInfo = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      authorization: req.headers.authorization ? 'present' : 'absent',
    };

    // Log potential security concerns
    if (this.isPotentialSecurityThreat(req)) {
      this.logger.warn('Potential security threat detected', securityInfo);
    }

    // Log authentication attempts
    if (req.url.includes('/auth/')) {
      this.logger.log('Authentication attempt', {
        ...securityInfo,
        endpoint: req.url,
      });
    }
  }

  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private isPotentialSecurityThreat(req: Request): boolean {
    const suspiciousPatterns = [
      /\.\./,          // Directory traversal
      /<script/i,      // XSS attempts
      /union.*select/i, // SQL injection
      /exec\(/i,       // Code execution
      /eval\(/i,       // Code evaluation
    ];

    const urlToCheck = req.url + JSON.stringify(req.body);
    return suspiciousPatterns.some(pattern => pattern.test(urlToCheck));
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] || this.generateRequestId();

    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);

    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData = {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: this.getClientIP(req),
        userAgent: req.headers['user-agent'],
      };

      if (res.statusCode >= 400) {
        this.logger.warn('Request failed', logData);
      } else if (duration > 5000) {
        this.logger.warn('Slow request detected', logData);
      } else {
        this.logger.log('Request completed', logData);
      }
    });

    next();
  }

  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}