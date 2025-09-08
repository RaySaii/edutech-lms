import { Logger } from '@nestjs/common';

/**
 * Enhanced logging utility with common patterns and structured logging
 */
export class LoggerUtil {
  /**
   * Create a logger with consistent naming
   */
  static createLogger(context: string): Logger {
    return new Logger(context);
  }

  /**
   * Log with structured data
   */
  static logWithData(
    logger: Logger,
    level: 'log' | 'error' | 'warn' | 'debug' | 'verbose',
    message: string,
    data?: Record<string, any>
  ): void {
    const logMessage = data
      ? `${message} ${JSON.stringify(data)}`
      : message;
    
    logger[level](logMessage);
  }

  /**
   * Log operation start
   */
  static logStart(
    logger: Logger,
    operation: string,
    context?: Record<string, any>
  ): void {
    const message = `Starting ${operation}`;
    this.logWithData(logger, 'log', message, context);
  }

  /**
   * Log operation completion
   */
  static logComplete(
    logger: Logger,
    operation: string,
    duration?: number,
    result?: Record<string, any>
  ): void {
    const message = `Completed ${operation}`;
    const data = {
      ...(duration && { duration: `${duration}ms` }),
      ...(result && { result }),
    };
    
    this.logWithData(logger, 'log', message, data);
  }

  /**
   * Log operation failure
   */
  static logError(
    logger: Logger,
    operation: string,
    error: any,
    context?: Record<string, any>
  ): void {
    const message = `Failed ${operation}`;
    const errorData = {
      error: error.message || error,
      stack: error.stack,
      ...(context && { context }),
    };
    
    this.logWithData(logger, 'error', message, errorData);
  }

  /**
   * Log API request
   */
  static logRequest(
    logger: Logger,
    method: string,
    url: string,
    userId?: string,
    body?: any
  ): void {
    const data = {
      method,
      url,
      ...(userId && { userId }),
      ...(body && { body }),
    };
    
    this.logWithData(logger, 'log', 'API Request', data);
  }

  /**
   * Log API response
   */
  static logResponse(
    logger: Logger,
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    responseSize?: number
  ): void {
    const data = {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ...(responseSize && { responseSize: `${responseSize} bytes` }),
    };
    
    this.logWithData(logger, 'log', 'API Response', data);
  }

  /**
   * Log database operation
   */
  static logDatabase(
    logger: Logger,
    operation: string,
    table: string,
    duration?: number,
    rowsAffected?: number
  ): void {
    const data = {
      operation,
      table,
      ...(duration && { duration: `${duration}ms` }),
      ...(rowsAffected && { rowsAffected }),
    };
    
    this.logWithData(logger, 'debug', 'Database Operation', data);
  }

  /**
   * Log external service call
   */
  static logExternalCall(
    logger: Logger,
    service: string,
    endpoint: string,
    method: string,
    duration?: number,
    success?: boolean
  ): void {
    const data = {
      service,
      endpoint,
      method,
      ...(duration && { duration: `${duration}ms` }),
      ...(success !== undefined && { success }),
    };
    
    const level = success === false ? 'warn' : 'log';
    this.logWithData(logger, level, 'External Service Call', data);
  }

  /**
   * Performance logger wrapper
   */
  static async logPerformance<T>(
    logger: Logger,
    operation: string,
    asyncOperation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    this.logStart(logger, operation, context);
    
    try {
      const result = await asyncOperation();
      const duration = Date.now() - startTime;
      this.logComplete(logger, operation, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logError(logger, operation, error, { ...context, duration: `${duration}ms` });
      throw error;
    }
  }

  /**
   * Create performance timing decorator
   */
  static timing(logger: Logger, operation: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        return LoggerUtil.logPerformance(
          logger,
          `${operation} - ${propertyName}`,
          () => method.apply(this, args),
          { className: target.constructor.name }
        );
      };
    };
  }
}