import { Module } from '@nestjs/common';
import { ContentManagementController } from './content-management.controller';

@Module({
  controllers: [ContentManagementController],
})
export class ContentManagementModule {}