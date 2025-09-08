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

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    const requestInfo = {
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      requestId: request.headers['x-request-id'],
      userId: (request as any).user?.id,
    };

    this.logger.log(`Incoming Request: ${request.method} ${request.url}`, JSON.stringify(requestInfo));

    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - startTime;
        const responseInfo = {
          ...requestInfo,
          statusCode: response.statusCode,
          responseTime: `${responseTime}ms`,
          responseSize: JSON.stringify(data).length,
        };

        this.logger.log(
          `Outgoing Response: ${response.statusCode} ${request.method} ${request.url} - ${responseTime}ms`,
          JSON.stringify(responseInfo)
        );
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        const errorInfo = {
          ...requestInfo,
          statusCode: response.statusCode || 500,
          responseTime: `${responseTime}ms`,
          error: error.message,
        };

        this.logger.error(
          `Request Failed: ${response.statusCode || 500} ${request.method} ${request.url} - ${responseTime}ms`,
          error.stack,
          JSON.stringify(errorInfo)
        );

        throw error;
      })
    );
  }
}