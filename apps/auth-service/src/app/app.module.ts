import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SharedDatabaseModule } from '@edutech-lms/database';
import { SharedAuthModule } from '@edutech-lms/auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { UserService } from './user/user.service';
import { OrganizationService } from './organization/organization.service';
import { User, Organization } from '@edutech-lms/database';
import { configuration } from '@edutech-lms/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('NOTIFICATION_SERVICE_HOST', 'localhost'),
            port: configService.get('NOTIFICATION_SERVICE_PORT', 3004),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    SharedDatabaseModule,
    SharedAuthModule,
    TypeOrmModule.forFeature([User, Organization]),
  ],
  controllers: [AppController, AuthController],
  providers: [AppService, AuthService, UserService, OrganizationService],
})
export class AppModule {}
