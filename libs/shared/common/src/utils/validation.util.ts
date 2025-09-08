import { BadRequestException } from '@nestjs/common';

/**
 * Common validation utilities for consistent validation across microservices
 */
export class ValidationUtil {
  /**
   * Validate UUID format
   */
  static validateUUID(id: string, fieldName: string = 'ID'): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(id)) {
      throw new BadRequestException(`Invalid ${fieldName} format`);
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new BadRequestException('Password must contain at least one number');
    }
  }

  /**
   * Validate phone number format
   */
  static validatePhone(phone: string): void {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    
    if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 10) {
      throw new BadRequestException('Invalid phone number format');
    }
  }

  /**
   * Validate required fields
   */
  static validateRequired(data: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    );

    if (missingFields.length > 0) {
      throw new BadRequestException(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Validate string length
   */
  static validateStringLength(
    value: string,
    fieldName: string,
    minLength: number = 0,
    maxLength: number = Infinity
  ): void {
    if (value.length < minLength) {
      throw new BadRequestException(`${fieldName} must be at least ${minLength} characters long`);
    }

    if (value.length > maxLength) {
      throw new BadRequestException(`${fieldName} must be no more than ${maxLength} characters long`);
    }
  }

  /**
   * Validate number range
   */
  static validateNumberRange(
    value: number,
    fieldName: string,
    min: number = -Infinity,
    max: number = Infinity
  ): void {
    if (value < min) {
      throw new BadRequestException(`${fieldName} must be at least ${min}`);
    }

    if (value > max) {
      throw new BadRequestException(`${fieldName} must be no more than ${max}`);
    }
  }

  /**
   * Validate array length
   */
  static validateArrayLength(
    array: any[],
    fieldName: string,
    minLength: number = 0,
    maxLength: number = Infinity
  ): void {
    if (array.length < minLength) {
      throw new BadRequestException(`${fieldName} must have at least ${minLength} items`);
    }

    if (array.length > maxLength) {
      throw new BadRequestException(`${fieldName} must have no more than ${maxLength} items`);
    }
  }

  /**
   * Validate date range
   */
  static validateDateRange(
    date: Date,
    fieldName: string,
    minDate?: Date,
    maxDate?: Date
  ): void {
    if (minDate && date < minDate) {
      throw new BadRequestException(`${fieldName} must be after ${minDate.toISOString()}`);
    }

    if (maxDate && date > maxDate) {
      throw new BadRequestException(`${fieldName} must be before ${maxDate.toISOString()}`);
    }
  }

  /**
   * Validate enum value
   */
  static validateEnum<T extends Record<string, string | number>>(
    value: any,
    enumObject: T,
    fieldName: string
  ): void {
    const validValues = Object.values(enumObject);
    
    if (!validValues.includes(value)) {
      throw new BadRequestException(
        `${fieldName} must be one of: ${validValues.join(', ')}`
      );
    }
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page: number, limit: number): { page: number; limit: number } {
    const validatedPage = Math.max(1, Math.floor(page));
    const validatedLimit = Math.min(100, Math.max(1, Math.floor(limit)));

    return { page: validatedPage, limit: validatedLimit };
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(
    file: any,
    allowedTypes: string[],
    maxSize: number = 10 * 1024 * 1024 // 10MB default
  ): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > maxSize) {
      throw new BadRequestException(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type must be one of: ${allowedTypes.join(', ')}`);
    }
  }

  /**
   * Validate URL format
   */
  static validateURL(url: string, fieldName: string = 'URL'): void {
    try {
      new URL(url);
    } catch {
      throw new BadRequestException(`Invalid ${fieldName} format`);
    }
  }

  /**
   * Custom validation wrapper
   */
  static validate<T>(
    value: T,
    validators: Array<(value: T) => void>
  ): T {
    validators.forEach(validator => validator(value));
    return value;
  }
}