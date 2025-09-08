import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsEnum } from 'class-validator';
import { CreateContentDto } from './create-content.dto';

export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export class UpdateContentDto extends PartialType(CreateContentDto) {
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}