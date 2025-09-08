import { applyDecorators, SetMetadata, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileUploadRateLimit } from '../rate-limiting/rate-limiting.decorator';

export const FILE_UPLOAD_CONFIG_KEY = 'file_upload_config';

export interface FileUploadOptions {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  maxFiles?: number;
  useS3?: boolean;
  generateThumbnail?: boolean;
  validateIntegrity?: boolean;
}

// Single file upload decorator
export const UploadSingleFile = (
  fieldName: string = 'file',
  options: FileUploadOptions = {},
) => {
  return applyDecorators(
    SetMetadata(FILE_UPLOAD_CONFIG_KEY, options),
    FileUploadRateLimit(),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
    UseInterceptors(FileInterceptor(fieldName)),
  );
};

// Multiple files upload decorator
export const UploadMultipleFiles = (
  fieldName: string = 'files',
  maxFiles: number = 10,
  options: FileUploadOptions = {},
) => {
  return applyDecorators(
    SetMetadata(FILE_UPLOAD_CONFIG_KEY, { ...options, maxFiles }),
    FileUploadRateLimit(),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary',
            },
          },
        },
      },
    }),
    UseInterceptors(FilesInterceptor(fieldName, maxFiles)),
  );
};

// Mixed fields upload decorator
export const UploadMixedFiles = (
  fields: Array<{ name: string; maxCount?: number }>,
  options: FileUploadOptions = {},
) => {
  const properties: Record<string, any> = {};
  
  fields.forEach(field => {
    properties[field.name] = {
      type: field.maxCount && field.maxCount > 1 ? 'array' : 'string',
      ...(field.maxCount && field.maxCount > 1 
        ? {
            items: {
              type: 'string',
              format: 'binary',
            },
          }
        : { format: 'binary' }
      ),
    };
  });

  return applyDecorators(
    SetMetadata(FILE_UPLOAD_CONFIG_KEY, options),
    FileUploadRateLimit(),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties,
      },
    }),
    UseInterceptors(FileFieldsInterceptor(fields)),
  );
};

// Predefined upload configurations
export const UploadImage = (fieldName: string = 'image') => {
  return UploadSingleFile(fieldName, {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    generateThumbnail: true,
  });
};

export const UploadVideo = (fieldName: string = 'video') => {
  return UploadSingleFile(fieldName, {
    maxFileSize: 500 * 1024 * 1024, // 500MB
    allowedMimeTypes: ['video/mp4', 'video/webm', 'video/ogg'],
    allowedExtensions: ['.mp4', '.webm', '.ogg'],
    useS3: true,
  });
};

export const UploadAudio = (fieldName: string = 'audio') => {
  return UploadSingleFile(fieldName, {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['audio/mp3', 'audio/wav', 'audio/ogg'],
    allowedExtensions: ['.mp3', '.wav', '.ogg'],
    useS3: true,
  });
};

export const UploadDocument = (fieldName: string = 'document') => {
  return UploadSingleFile(fieldName, {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    allowedExtensions: ['.pdf', '.txt', '.doc', '.docx', '.ppt', '.pptx'],
    validateIntegrity: true,
  });
};

export const UploadCourseMaterials = () => {
  return UploadMixedFiles([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'videos', maxCount: 10 },
    { name: 'documents', maxCount: 20 },
    { name: 'images', maxCount: 50 },
  ], {
    maxFileSize: 500 * 1024 * 1024, // 500MB per file
    useS3: true,
    validateIntegrity: true,
  });
};

export const UploadProfilePicture = (fieldName: string = 'avatar') => {
  return UploadSingleFile(fieldName, {
    maxFileSize: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    allowedExtensions: ['.jpg', '.jpeg', '.png'],
    generateThumbnail: true,
  });
};