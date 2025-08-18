import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import securityConfig from '../config/security.config';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(securityConfig),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          name: 'global',
          ttl: configService.get('security.rateLimit.global.windowMs'),
          limit: configService.get('security.rateLimit.global.maxAttempts'),
        },
        {
          name: 'login',
          ttl: configService.get('security.rateLimit.login.windowMs'),
          limit: configService.get('security.rateLimit.login.maxAttempts'),
        },
        {
          name: 'registration',
          ttl: configService.get('security.rateLimit.registration.windowMs'),
          limit: configService.get('security.rateLimit.registration.maxAttempts'),
        },
        {
          name: 'password-reset',
          ttl: configService.get('security.rateLimit.passwordReset.windowMs'),
          limit: configService.get('security.rateLimit.passwordReset.maxAttempts'),
        },
      ],
      inject: [ConfigService],
    }),
  ],
  providers: [],
  exports: [ConfigModule, ThrottlerModule],
})
export class ProductionSecurityModule {}