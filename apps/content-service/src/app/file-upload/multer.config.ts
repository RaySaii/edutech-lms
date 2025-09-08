import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

// Ensure upload directory exists
const uploadDir = join(process.cwd(), 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// Define allowed file types and their extensions
const allowedMimeTypes = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  
  // Videos
  'video/mp4': ['.mp4'],
  'video/mpeg': ['.mpeg', '.mpg'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
  'video/webm': ['.webm'],
  
  // Audio
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'audio/mp4': ['.m4a'],
  'audio/webm': ['.weba'],
  
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/json': ['.json'],
  'text/markdown': ['.md'],
  
  // Archives
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],
  'application/gzip': ['.gz'],
  'application/x-tar': ['.tar'],
};

// File size limits by type (in bytes)
const fileSizeLimits = {
  image: 10 * 1024 * 1024,      // 10MB for images
  video: 500 * 1024 * 1024,     // 500MB for videos
  audio: 50 * 1024 * 1024,      // 50MB for audio
  document: 25 * 1024 * 1024,   // 25MB for documents
  archive: 100 * 1024 * 1024,   // 100MB for archives
  default: 10 * 1024 * 1024,    // 10MB default
};

const getFileCategory = (mimeType: string): keyof typeof fileSizeLimits => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text') || mimeType.includes('spreadsheet') || mimeType.includes('presentation')) {
    return 'document';
  }
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed') || mimeType.includes('tar') || mimeType.includes('gzip')) {
    return 'archive';
  }
  return 'default';
};

const fileFilter = (req: any, file: Express.Multer.File, callback: any) => {
  // Check if mime type is allowed
  if (!allowedMimeTypes[file.mimetype]) {
    return callback(new BadRequestException(`File type ${file.mimetype} is not allowed`), false);
  }

  // Verify file extension matches mime type
  const fileExt = extname(file.originalname).toLowerCase();
  const allowedExts = allowedMimeTypes[file.mimetype];
  
  if (!allowedExts.includes(fileExt)) {
    return callback(new BadRequestException(`File extension ${fileExt} does not match mime type ${file.mimetype}`), false);
  }

  callback(null, true);
};

const storage = diskStorage({
  destination: (req, file, callback) => {
    // Create subdirectories by file type
    const category = getFileCategory(file.mimetype);
    const typeDir = join(uploadDir, category);
    
    if (!existsSync(typeDir)) {
      mkdirSync(typeDir, { recursive: true });
    }
    
    callback(null, typeDir);
  },
  filename: (req, file, callback) => {
    // Generate unique filename with timestamp and random string
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = extname(file.originalname);
    const filename = `${timestamp}-${randomStr}${ext}`;
    
    callback(null, filename);
  },
});

const limits = {
  fileSize: (req: any, file: Express.Multer.File) => {
    const category = getFileCategory(file.mimetype);
    return fileSizeLimits[category];
  },
  files: 10, // Maximum 10 files per request
  fields: 20, // Maximum 20 form fields
  fieldNameSize: 50, // Maximum field name length
  fieldSize: 1024 * 1024, // Maximum field value size (1MB)
};

export const multerOptions: MulterOptions = {
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max (will be checked per file type in service)
    files: limits.files,
    fields: limits.fields,
    fieldNameSize: limits.fieldNameSize,
    fieldSize: limits.fieldSize,
  },
};

// Export utility functions for use in services
export const validateFileSize = (file: Express.Multer.File): boolean => {
  const category = getFileCategory(file.mimetype);
  const limit = fileSizeLimits[category];
  return file.size <= limit;
};

export const getAllowedMimeTypes = (): string[] => {
  return Object.keys(allowedMimeTypes);
};

export const getFileCategoryFromMimeType = getFileCategory;

export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};