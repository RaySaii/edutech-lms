import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedDatabaseModule } from '@edutech-lms/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content, ContentProgress } from '@edutech-lms/database';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContentModule } from './content/content.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import { ContentManagementModule } from './content-management/content-management.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SharedDatabaseModule,
    TypeOrmModule.forFeature([Content, ContentProgress]),
    ContentModule,
    FileUploadModule,
    ContentManagementModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}