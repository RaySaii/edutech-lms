import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_KEY } from '../guards/rate-limit.guard';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxAttempts: number; // Maximum attempts in window
  blockDurationMs?: number; // How long to block after limit exceeded
}

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

// Predefined rate limit decorators for common use cases
export const LoginRateLimit = () => RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5, // 5 attempts per 15 minutes
  blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
});

export const PasswordResetRateLimit = () => RateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxAttempts: 3, // 3 attempts per hour
  blockDurationMs: 2 * 60 * 60 * 1000, // Block for 2 hours
});

export const RegistrationRateLimit = () => RateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxAttempts: 3, // 3 registrations per hour per IP
  blockDurationMs: 60 * 60 * 1000, // Block for 1 hour
});