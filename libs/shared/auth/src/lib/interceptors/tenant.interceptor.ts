import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TenantService } from '@edutech-lms/common';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantInterceptor.name);

  constructor(private tenantService: TenantService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Add tenant information to response headers if available
    if (request.tenant) {
      response.header('X-Tenant-ID', request.tenant.id);
      response.header('X-Tenant-Name', request.tenant.name);
    }

    return next.handle().pipe(
      tap(async () => {
        const duration = Date.now() - startTime;
        
        // Record usage metrics if tenant context exists
        if (request.tenantContext?.tenant) {
          try {
            await this.recordTenantUsage(request, duration);
          } catch (error) {
            this.logger.warn(`Failed to record tenant usage: ${error.message}`);
          }
        }
      }),
    );
  }

  private async recordTenantUsage(request: any, duration: number): Promise<void> {
    const tenantId = request.tenantContext.tenant.id;
    const userId = request.tenantContext.userId;
    const method = request.method;
    const endpoint = request.route?.path || request.path;

    // Record API call
    await this.tenantService.recordUsageMetric(
      tenantId,
      'api_calls',
      1,
      'count',
      {
        method,
        endpoint,
        duration,
        userId,
        timestamp: new Date().toISOString(),
      }
    );

    // Record response time metric
    await this.tenantService.recordUsageMetric(
      tenantId,
      'response_time',
      duration,
      'milliseconds',
      {
        method,
        endpoint,
        timestamp: new Date().toISOString(),
      }
    );

    // Record bandwidth usage (approximate)
    if (request.body) {
      const requestSize = JSON.stringify(request.body).length;
      await this.tenantService.recordUsageMetric(
        tenantId,
        'bandwidth_used',
        requestSize,
        'bytes',
        {
          type: 'request',
          endpoint,
          timestamp: new Date().toISOString(),
        }
      );
    }
  }
}