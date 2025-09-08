export * from './lib/shared-auth.module';

// Guards
export * from './lib/guards/jwt-auth.guard';
export * from './lib/guards/roles.guard';
export * from './lib/guards/permissions.guard';
export * from './lib/guards/teacher.guard';
export * from './lib/guards/organization.guard';
export * from './lib/guards/email-verified.guard';
export * from './lib/guards/rate-limit.guard';

// Decorators
export * from './lib/decorators/current-user.decorator';
export * from './lib/decorators/public.decorator';
export * from './lib/decorators/roles.decorator';
export * from './lib/decorators/permissions.decorator';
export * from './lib/decorators/teacher-only.decorator';
export * from './lib/decorators/organization.decorator';
export * from './lib/decorators/require-email-verification.decorator';
export * from './lib/decorators/rate-limit.decorator';

// Strategies
export * from './lib/strategies/jwt.strategy';
export * from './lib/strategies/local.strategy';

// Services
export * from './lib/services/auth.service';