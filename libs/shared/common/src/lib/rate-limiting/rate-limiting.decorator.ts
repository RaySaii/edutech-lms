import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { UserRole } from '../../enums/user.enums';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: 'ip' | 'user' | 'user-ip' | string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  roles?: UserRole[];
  customConfig?: {
    [role: string]: {
      windowMs: number;
      maxRequests: number;
    };
  };
}

export const RateLimit = (options: RateLimitOptions) => {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_KEY, options),
  );
};

// Predefined rate limit configurations
export const RateLimitPresets = {
  // Authentication endpoints
  AUTH_LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: 'ip' as const,
  },
  
  AUTH_REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    keyGenerator: 'ip' as const,
  },
  
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    keyGenerator: 'ip' as const,
  },
  
  // API endpoints
  API_GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: 'user' as const,
    customConfig: {
      [UserRole.STUDENT]: {
        windowMs: 60 * 1000,
        maxRequests: 60,
      },
      [UserRole.TEACHER]: {
        windowMs: 60 * 1000,
        maxRequests: 120,
      },
      [UserRole.ADMIN]: {
        windowMs: 60 * 1000,
        maxRequests: 300,
      },
      [UserRole.SUPER_ADMIN]: {
        windowMs: 60 * 1000,
        maxRequests: 1000,
      },
    },
  },
  
  // File upload endpoints
  FILE_UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: 'user' as const,
    customConfig: {
      [UserRole.STUDENT]: {
        windowMs: 60 * 1000,
        maxRequests: 5,
      },
      [UserRole.TEACHER]: {
        windowMs: 60 * 1000,
        maxRequests: 20,
      },
      [UserRole.ADMIN]: {
        windowMs: 60 * 1000,
        maxRequests: 50,
      },
    },
  },
  
  // Search endpoints
  SEARCH: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    keyGenerator: 'user' as const,
  },
  
  // Dashboard endpoints
  DASHBOARD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
    keyGenerator: 'user' as const,
  },
  
  // Course enrollment
  COURSE_ENROLLMENT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    keyGenerator: 'user' as const,
  },
  
  // Email sending
  EMAIL_SEND: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    keyGenerator: 'user' as const,
  },
};

// Convenience decorators for common use cases
export const AuthRateLimit = () => RateLimit(RateLimitPresets.AUTH_LOGIN);
export const RegisterRateLimit = () => RateLimit(RateLimitPresets.AUTH_REGISTER);
export const PasswordResetRateLimit = () => RateLimit(RateLimitPresets.PASSWORD_RESET);
export const ApiRateLimit = () => RateLimit(RateLimitPresets.API_GENERAL);
export const FileUploadRateLimit = () => RateLimit(RateLimitPresets.FILE_UPLOAD);
export const SearchRateLimit = () => RateLimit(RateLimitPresets.SEARCH);
export const DashboardRateLimit = () => RateLimit(RateLimitPresets.DASHBOARD);
export const CourseEnrollmentRateLimit = () => RateLimit(RateLimitPresets.COURSE_ENROLLMENT);
export const EmailRateLimit = () => RateLimit(RateLimitPresets.EMAIL_SEND);