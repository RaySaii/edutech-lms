import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedAuthModule } from '@edutech-lms/auth';
import {
  Content,
  ContentVersion,
  ContentApproval,
  MediaAsset,
  ContentProgress,
} from '@edutech-lms/database';
import { ContentManagementController } from './content-management.controller';
import { ContentManagementService } from './content-management.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Content,
      ContentVersion,
      ContentApproval,
      MediaAsset,
      ContentProgress,
    ]),
    SharedAuthModule,
  ],
  controllers: [ContentManagementController],
  providers: [ContentManagementService],
  exports: [ContentManagementService],
})
export class ContentManagementModule {}