import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { 
  User, 
  Organization, 
  Course, 
  Enrollment, 
  CourseReview,
  Content,
  ContentProgress,
  ContentVersion,
  MediaAsset,
  ContentApproval,
  NotificationEntity,
  NotificationPreferenceEntity,
  NotificationTemplateEntity,
} from '../entities';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [
          User, 
          Organization, 
          Course, 
          CourseReview, 
          Enrollment,
          Content,
          ContentProgress,
          ContentVersion,
          MediaAsset,
          ContentApproval,
          NotificationEntity,
          NotificationPreferenceEntity,
          NotificationTemplateEntity,
        ],
        migrations: ['dist/libs/shared/database/migrations/*.js'],
        migrationsRun: false,
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [TypeOrmModule],
})
export class SharedDatabaseModule {}