import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsEnum } from 'class-validator';
import { CreateContentDto } from './create-content.dto';
import { ContentStatus } from '@edutech-lms/database';

export class UpdateContentDto extends PartialType(CreateContentDto) {
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}