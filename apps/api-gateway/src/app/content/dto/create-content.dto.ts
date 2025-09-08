import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsNumber, IsBoolean, IsObject } from 'class-validator';

export enum ContentType {
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  IMAGE = 'image',
  TEXT = 'text',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
}

export class CreateContentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ContentType)
  type: ContentType;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  uploaderId: string; // Set by the controller

  @IsOptional()
  @IsString()
  filePath?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsNumber()
  width?: number;

  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isDownloadable?: boolean;

  @IsOptional()
  @IsString()
  transcript?: string;

  @IsOptional()
  @IsObject()
  captions?: Record<string, any>;
}