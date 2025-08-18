import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  // JWT Configuration
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'fallback-access-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
    issuer: process.env.JWT_ISSUER || 'edutech-lms',
    audience: process.env.JWT_AUDIENCE || 'edutech-lms-users',
  },

  // Password Requirements
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === 'true',
    requireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS === 'true',
    maxAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
  },

  // Rate Limiting Configuration
  rateLimit: {
    login: {
      windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || '900000'), // 15 minutes
      maxAttempts: parseInt(process.env.RATE_LIMIT_LOGIN_MAX_ATTEMPTS || '5'),
      blockDurationMs: 30 * 60 * 1000, // 30 minutes
    },
    registration: {
      windowMs: parseInt(process.env.RATE_LIMIT_REGISTRATION_WINDOW_MS || '3600000'), // 1 hour
      maxAttempts: parseInt(process.env.RATE_LIMIT_REGISTRATION_MAX_ATTEMPTS || '3'),
      blockDurationMs: 60 * 60 * 1000, // 1 hour
    },
    passwordReset: {
      windowMs: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_WINDOW_MS || '3600000'), // 1 hour
      maxAttempts: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_MAX_ATTEMPTS || '3'),
      blockDurationMs: 2 * 60 * 60 * 1000, // 2 hours
    },
    global: {
      windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW || '3600000'), // 1 hour
      maxAttempts: parseInt(process.env.API_RATE_LIMIT_GLOBAL || '1000'),
    },
  },

  // Session Configuration
  session: {
    timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30'),
    concurrentLimit: parseInt(process.env.CONCURRENT_SESSIONS_LIMIT || '3'),
    forceLogoutInactive: process.env.FORCE_LOGOUT_INACTIVE_SESSIONS === 'true',
  },

  // Email Security
  email: {
    verificationExpiresIn: process.env.EMAIL_VERIFICATION_EXPIRES || '24h',
    passwordResetExpiresIn: process.env.PASSWORD_RESET_EXPIRES || '1h',
    verificationRequired: process.env.EMAIL_VERIFICATION_REQUIRED === 'true',
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: process.env.CORS_METHODS?.split(',') || ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(',') || ['Content-Type', 'Authorization', 'X-Requested-With'],
  },

  // Security Headers
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: parseInt(process.env.HELMET_HSTS_MAX_AGE || '31536000'), // 1 year
      includeSubDomains: process.env.HELMET_HSTS_INCLUDE_SUBDOMAINS === 'true',
      preload: true,
    },
  },

  // File Upload Security
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedMimeTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
    ],
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    virusScanEnabled: process.env.VIRUS_SCAN_ENABLED === 'true',
  },

  // Two-Factor Authentication
  twoFactor: {
    issuer: process.env.TWO_FACTOR_ISSUER || 'EduTech LMS',
    backupCodesCount: parseInt(process.env.TWO_FACTOR_BACKUP_CODES_COUNT || '10'),
    window: parseInt(process.env.TWO_FACTOR_WINDOW || '2'),
  },

  // API Security
  api: {
    keyHeader: process.env.API_KEY_HEADER || 'X-API-Key',
    timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'), // 30 seconds
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production',
    backupKey: process.env.BACKUP_ENCRYPTION_KEY || 'default-backup-key-change-in-production',
  },

  // Environment
  environment: {
    nodeEnv: process.env.NODE_ENV || 'development',
    appEnv: process.env.APP_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
  },

  // Health Check
  healthCheck: {
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'),
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
  },
}));