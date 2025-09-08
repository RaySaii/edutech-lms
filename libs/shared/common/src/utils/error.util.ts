import {
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';

/**
 * Common error handling utilities for consistent error management across microservices
 */
export class ErrorUtil {
  /**
   * Handle common repository errors with standardized exceptions
   */
  static handleRepositoryError(error: any, entityName: string, logger?: Logger): never {
    if (logger) {
      logger.error(`Repository error for ${entityName}:`, error);
    }

    if (error.code === '23505') {
      // PostgreSQL unique violation
      throw new ConflictException(`${entityName} already exists`);
    }

    if (error.code === '23503') {
      // PostgreSQL foreign key violation
      throw new BadRequestException(`Referenced ${entityName} does not exist`);
    }

    if (error.code === '23502') {
      // PostgreSQL not null violation
      throw new BadRequestException(`Required ${entityName} fields are missing`);
    }

    throw new HttpException(
      `Internal error while processing ${entityName}`,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  /**
   * Handle entity not found errors
   */
  static throwNotFound(entityName: string, identifier?: string): never {
    const message = identifier
      ? `${entityName} with ID ${identifier} not found`
      : `${entityName} not found`;
    throw new NotFoundException(message);
  }

  /**
   * Handle authorization errors
   */
  static throwForbidden(action: string, resource: string): never {
    throw new ForbiddenException(`Not authorized to ${action} ${resource}`);
  }

  /**
   * Handle validation errors
   */
  static throwBadRequest(message: string): never {
    throw new BadRequestException(message);
  }

  /**
   * Handle authentication errors
   */
  static throwUnauthorized(message: string = 'Authentication required'): never {
    throw new UnauthorizedException(message);
  }

  /**
   * Handle conflict errors
   */
  static throwConflict(message: string): never {
    throw new ConflictException(message);
  }

  /**
   * Generic error handler with logging
   */
  static handleError(
    error: any,
    context: string,
    logger: Logger,
    defaultMessage: string = 'An error occurred'
  ): never {
    logger.error(`Error in ${context}:`, error);

    if (error instanceof HttpException) {
      throw error;
    }

    // Handle specific error types
    if (error.name === 'ValidationError') {
      throw new BadRequestException('Validation failed');
    }

    if (error.name === 'CastError') {
      throw new BadRequestException('Invalid ID format');
    }

    throw new HttpException(
      defaultMessage,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  /**
   * Async error wrapper for consistent error handling
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    context: string,
    logger: Logger,
    errorMessage: string = 'Operation failed'
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, context, logger, errorMessage);
    }
  }

  /**
   * Permission checker utility
   */
  static checkPermission(
    hasPermission: boolean,
    action: string,
    resource: string
  ): void {
    if (!hasPermission) {
      this.throwForbidden(action, resource);
    }
  }

  /**
   * Entity existence checker
   */
  static checkExists(entity: any, entityName: string, identifier?: string): void {
    if (!entity) {
      this.throwNotFound(entityName, identifier);
    }
  }

  /**
   * Ownership checker
   */
  static checkOwnership(
    entityOwnerId: string,
    currentUserId: string,
    resourceName: string
  ): void {
    if (entityOwnerId !== currentUserId) {
      this.throwForbidden('access', `this ${resourceName}`);
    }
  }
}