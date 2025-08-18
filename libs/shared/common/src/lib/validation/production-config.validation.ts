import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SecurityValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

@Injectable()
export class ProductionConfigValidationService implements OnModuleInit {
  private readonly logger = new Logger(ProductionConfigValidationService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    if (this.configService.get('security.environment.isProduction')) {
      const validation = await this.validateProductionConfig();
      
      if (!validation.isValid) {
        this.logger.error('CRITICAL: Production configuration validation failed!');
        validation.errors.forEach(error => this.logger.error(`❌ ${error}`));
        
        // In production, we should fail fast if critical security configs are missing
        throw new Error('Production configuration validation failed. Cannot start application with insecure configuration.');
      }

      if (validation.warnings.length > 0) {
        this.logger.warn('Production configuration warnings:');
        validation.warnings.forEach(warning => this.logger.warn(`⚠️  ${warning}`));
      }

      this.logger.log('✅ Production security configuration validated successfully');
    }
  }

  async validateProductionConfig(): Promise<SecurityValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate JWT secrets
    this.validateJWTSecrets(errors, warnings);

    // Validate database configuration
    this.validateDatabaseConfig(errors, warnings);

    // Validate Redis configuration
    this.validateRedisConfig(errors, warnings);

    // Validate security settings
    this.validateSecuritySettings(errors, warnings);

    // Validate CORS configuration
    this.validateCORSConfig(errors, warnings);

    // Validate email configuration
    this.validateEmailConfig(errors, warnings);

    // Validate encryption keys
    this.validateEncryptionKeys(errors, warnings);

    // Validate environment variables
    this.validateEnvironmentVariables(errors, warnings);

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }

  private validateJWTSecrets(errors: string[], warnings: string[]): void {
    const accessSecret = this.configService.get('security.jwt.accessSecret');
    const refreshSecret = this.configService.get('security.jwt.refreshSecret');

    if (!accessSecret || accessSecret.includes('fallback') || accessSecret.includes('default')) {
      errors.push('JWT_ACCESS_SECRET must be set to a secure value in production');
    } else if (accessSecret.length < 64) {
      warnings.push('JWT_ACCESS_SECRET should be at least 64 characters long');
    }

    if (!refreshSecret || refreshSecret.includes('fallback') || refreshSecret.includes('default')) {
      errors.push('JWT_REFRESH_SECRET must be set to a secure value in production');
    } else if (refreshSecret.length < 64) {
      warnings.push('JWT_REFRESH_SECRET should be at least 64 characters long');
    }

    if (accessSecret === refreshSecret) {
      errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
    }
  }

  private validateDatabaseConfig(errors: string[], warnings: string[]): void {
    const dbHost = this.configService.get('DB_HOST');
    const dbPassword = this.configService.get('DB_PASSWORD');
    const dbSSL = this.configService.get('DB_SSL');
    const dbSynchronize = this.configService.get('DB_SYNCHRONIZE');

    if (!dbHost || dbHost === 'localhost') {
      warnings.push('DB_HOST should not be localhost in production');
    }

    if (!dbPassword || dbPassword.length < 12) {
      errors.push('DB_PASSWORD must be set and at least 12 characters long');
    }

    if (dbSSL !== 'true') {
      warnings.push('DB_SSL should be enabled in production');
    }

    if (dbSynchronize === 'true') {
      errors.push('DB_SYNCHRONIZE must be false in production to prevent data loss');
    }
  }

  private validateRedisConfig(errors: string[], warnings: string[]): void {
    const redisHost = this.configService.get('REDIS_HOST');
    const redisPassword = this.configService.get('REDIS_PASSWORD');
    const redisTLS = this.configService.get('REDIS_TLS');

    if (!redisHost || redisHost === 'localhost') {
      warnings.push('REDIS_HOST should not be localhost in production');
    }

    if (!redisPassword) {
      errors.push('REDIS_PASSWORD must be set in production');
    }

    if (redisTLS !== 'true') {
      warnings.push('REDIS_TLS should be enabled in production');
    }
  }

  private validateSecuritySettings(errors: string[], warnings: string[]): void {
    const passwordMinLength = this.configService.get('security.password.minLength');
    const emailVerificationRequired = this.configService.get('security.email.verificationRequired');

    if (passwordMinLength < 8) {
      warnings.push('PASSWORD_MIN_LENGTH should be at least 8 characters');
    }

    if (!emailVerificationRequired) {
      warnings.push('EMAIL_VERIFICATION_REQUIRED should be enabled for better security');
    }
  }

  private validateCORSConfig(errors: string[], warnings: string[]): void {
    const corsOrigin = this.configService.get('security.cors.origin');

    if (corsOrigin.includes('*')) {
      errors.push('CORS_ORIGIN should not contain wildcards in production');
    }

    if (corsOrigin.includes('localhost') || corsOrigin.includes('127.0.0.1')) {
      warnings.push('CORS_ORIGIN contains localhost URLs - ensure this is intentional for production');
    }
  }

  private validateEmailConfig(errors: string[], warnings: string[]): void {
    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpUser = this.configService.get('SMTP_USER');
    const smtpPassword = this.configService.get('SMTP_PASSWORD');
    const emailFrom = this.configService.get('EMAIL_FROM');

    if (!smtpHost) {
      errors.push('SMTP_HOST must be configured for email functionality');
    }

    if (!smtpUser || !smtpPassword) {
      errors.push('SMTP_USER and SMTP_PASSWORD must be configured');
    }

    if (!emailFrom || emailFrom.includes('example.com')) {
      errors.push('EMAIL_FROM must be configured with a valid domain');
    }
  }

  private validateEncryptionKeys(errors: string[], warnings: string[]): void {
    const encryptionKey = this.configService.get('security.encryption.key');
    const backupKey = this.configService.get('security.encryption.backupKey');

    if (!encryptionKey || encryptionKey.includes('default') || encryptionKey.includes('change-in-production')) {
      errors.push('ENCRYPTION_KEY must be set to a secure value in production');
    }

    if (!backupKey || backupKey.includes('default') || backupKey.includes('change-in-production')) {
      errors.push('BACKUP_ENCRYPTION_KEY must be set to a secure value in production');
    }

    if (encryptionKey === backupKey) {
      warnings.push('ENCRYPTION_KEY and BACKUP_ENCRYPTION_KEY should be different');
    }
  }

  private validateEnvironmentVariables(errors: string[], warnings: string[]): void {
    const nodeEnv = this.configService.get('NODE_ENV');
    const appUrl = this.configService.get('APP_URL');

    if (nodeEnv !== 'production') {
      errors.push('NODE_ENV must be set to "production"');
    }

    if (!appUrl || appUrl.includes('localhost') || !appUrl.startsWith('https://')) {
      errors.push('APP_URL must be set to a valid HTTPS URL in production');
    }

    // Check for dangerous default values
    const dangerousDefaults = [
      'your-',
      'change-me',
      'default-',
      'fallback-',
      'test-',
      'example',
    ];

    const allEnvVars = process.env;
    Object.entries(allEnvVars).forEach(([key, value]) => {
      if (value && dangerousDefaults.some(pattern => value.toLowerCase().includes(pattern))) {
        warnings.push(`Environment variable ${key} appears to contain a default/placeholder value`);
      }
    });
  }

  // Method to generate a production security checklist
  generateSecurityChecklist(): string[] {
    return [
      '✅ All environment variables are set with production values',
      '✅ JWT secrets are strong and unique (64+ characters)',
      '✅ Database password is complex and SSL is enabled',
      '✅ Redis password is set and TLS is enabled',
      '✅ CORS is configured for specific domains only',
      '✅ SMTP is configured for email functionality',
      '✅ Encryption keys are set and properly secured',
      '✅ Rate limiting is configured appropriately',
      '✅ Security headers are enabled',
      '✅ File upload restrictions are in place',
      '✅ Two-factor authentication is configured',
      '✅ Logging and monitoring are set up',
      '✅ Backup and recovery procedures are in place',
      '✅ Security scanning is integrated into CI/CD',
      '✅ Secrets are managed through secure vault',
      '✅ Regular security audits are scheduled',
    ];
  }
}