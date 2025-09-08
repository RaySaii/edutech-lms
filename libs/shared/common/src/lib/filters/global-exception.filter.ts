import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
    details?: any;
    stack?: string;
    requestId?: string;
  };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log the error
    this.logError(exception, request, errorResponse);

    // Send the response
    response.status(errorResponse.error.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const requestId = request.headers['x-request-id'] as string;

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message = typeof response === 'string' ? response : (response as any).message || exception.message;
      
      return {
        success: false,
        error: {
          message: Array.isArray(message) ? message.join(', ') : message,
          code: exception.constructor.name,
          statusCode: exception.getStatus(),
          timestamp,
          path,
          method,
          requestId,
          details: typeof response === 'object' ? response : undefined,
        },
      };
    }

    if (exception instanceof QueryFailedError) {
      return {
        success: false,
        error: {
          message: 'Database operation failed',
          code: 'DATABASE_ERROR',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          timestamp,
          path,
          method,
          requestId,
          details: this.sanitizeDatabaseError(exception),
        },
      };
    }

    if (exception instanceof Error) {
      // Handle specific error types
      const statusCode = this.getStatusCodeForError(exception);
      
      return {
        success: false,
        error: {
          message: exception.message || 'An unexpected error occurred',
          code: exception.constructor.name || 'INTERNAL_SERVER_ERROR',
          statusCode,
          timestamp,
          path,
          method,
          requestId,
          stack: process.env.NODE_ENV === 'development' ? exception.stack : undefined,
        },
      };
    }

    // Unknown error
    return {
      success: false,
      error: {
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp,
        path,
        method,
        requestId,
      },
    };
  }

  private getStatusCodeForError(error: Error): number {
    // Map specific error types to HTTP status codes
    const errorName = error.constructor.name;

    switch (errorName) {
      case 'ValidationError':
        return HttpStatus.BAD_REQUEST;
      case 'UnauthorizedError':
      case 'JsonWebTokenError':
      case 'TokenExpiredError':
        return HttpStatus.UNAUTHORIZED;
      case 'ForbiddenError':
        return HttpStatus.FORBIDDEN;
      case 'NotFoundError':
      case 'EntityNotFoundError':
        return HttpStatus.NOT_FOUND;
      case 'ConflictError':
        return HttpStatus.CONFLICT;
      case 'TooManyRequestsError':
        return HttpStatus.TOO_MANY_REQUESTS;
      case 'TimeoutError':
        return HttpStatus.REQUEST_TIMEOUT;
      case 'PayloadTooLargeError':
        return HttpStatus.PAYLOAD_TOO_LARGE;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private sanitizeDatabaseError(error: QueryFailedError): any {
    const details: any = {
      code: (error as any).code,
      constraint: (error as any).constraint,
      table: (error as any).table,
      column: (error as any).column,
    };

    // Remove sensitive information in production
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Database constraint violation' };
    }

    return details;
  }

  private logError(exception: unknown, request: Request, errorResponse: ErrorResponse): void {
    const { error } = errorResponse;
    const userInfo = (request as any).user ? 
      { userId: (request as any).user.id, email: (request as any).user.email } : 
      null;

    const logContext = {
      requestId: error.requestId,
      method: error.method,
      path: error.path,
      statusCode: error.statusCode,
      userInfo,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      body: this.sanitizeRequestBody(request.body),
      query: request.query,
    };

    if (error.statusCode >= 500) {
      this.logger.error(
        `${error.code}: ${error.message}`,
        exception instanceof Error ? exception.stack : undefined,
        JSON.stringify(logContext, null, 2)
      );
    } else if (error.statusCode >= 400) {
      this.logger.warn(
        `${error.code}: ${error.message}`,
        JSON.stringify(logContext, null, 2)
      );
    } else {
      this.logger.log(
        `${error.code}: ${error.message}`,
        JSON.stringify(logContext, null, 2)
      );
    }
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return body;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}