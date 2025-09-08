import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { CacheService } from '../cache/cache.service';

export interface FileUploadConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  destination: string;
  useS3?: boolean;
  s3Config?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url?: string;
  s3Key?: string;
  uploadedAt: Date;
  uploadedBy: string;
  checksum: string;
  thumbnailId?: string;
  integrityValid?: boolean;
  metadata?: FileMetadata;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  format?: string;
  codec?: string;
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private s3: AWS.S3;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.initializeS3();
  }

  private initializeS3() {
    const useS3 = this.configService.get<boolean>('FILE_UPLOAD_USE_S3', false);
    
    if (useS3) {
      this.s3 = new AWS.S3({
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
        region: this.configService.get('AWS_REGION', 'us-east-1'),
      });
    }
  }

  getMulterConfig(config: Partial<FileUploadConfig> = {}): multer.Options {
    const defaultConfig: FileUploadConfig = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/ogg',
        'audio/mp3',
        'audio/wav',
        'audio/ogg',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.ogg', '.mp3', '.wav', '.pdf', '.txt', '.doc', '.docx'],
      destination: this.configService.get('UPLOAD_DIR', './uploads'),
      useS3: this.configService.get<boolean>('FILE_UPLOAD_USE_S3', false),
    };

    const finalConfig = { ...defaultConfig, ...config };

    return {
      limits: {
        fileSize: finalConfig.maxFileSize,
      },
      fileFilter: (req, file, callback) => {
        this.validateFile(file, finalConfig, callback);
      },
      storage: finalConfig.useS3 ? undefined : this.getLocalStorageConfig(finalConfig),
    };
  }

  private validateFile(
    file: Express.Multer.File,
    config: FileUploadConfig,
    callback: multer.FileFilterCallback,
  ) {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (!config.allowedExtensions.includes(ext)) {
      return callback(new BadRequestException(`File extension ${ext} is not allowed`));
    }

    if (!config.allowedMimeTypes.includes(file.mimetype)) {
      return callback(new BadRequestException(`File type ${file.mimetype} is not allowed`));
    }

    callback(null, true);
  }

  private getLocalStorageConfig(config: FileUploadConfig): multer.StorageEngine {
    return multer.diskStorage({
      destination: async (req, file, callback) => {
        try {
          await fs.mkdir(config.destination, { recursive: true });
          callback(null, config.destination);
        } catch (error) {
          callback(error, config.destination);
        }
      },
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    options: Partial<FileUploadConfig> = {},
  ): Promise<UploadedFile> {
    try {
      const fileId = this.generateFileId();
      const checksum = await this.calculateChecksum(file.buffer || file.path);
      
      let uploadedFile: UploadedFile;

      if (options.useS3 && this.s3) {
        uploadedFile = await this.uploadToS3(file, fileId, userId, checksum);
      } else {
        uploadedFile = await this.uploadToLocal(file, fileId, userId, checksum);
      }

      // Cache file metadata for quick access
      await this.cacheService.set(
        `file:${uploadedFile.id}`,
        uploadedFile,
        { ttl: 3600, namespace: 'files' }
      );

      this.logger.log(`File uploaded successfully: ${uploadedFile.id} by user: ${userId}`);
      return uploadedFile;
    } catch (error) {
      this.logger.error('File upload failed:', error);
      throw error;
    }
  }

  private async uploadToS3(
    file: Express.Multer.File,
    fileId: string,
    userId: string,
    checksum: string,
  ): Promise<UploadedFile> {
    const bucket = this.configService.get('AWS_S3_BUCKET');
    const key = `uploads/${userId}/${fileId}/${file.originalname}`;

    const uploadParams: AWS.S3.PutObjectRequest = {
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        uploadedBy: userId,
        checksum,
      },
    };

    const result = await this.s3.upload(uploadParams).promise();

    return {
      id: fileId,
      originalName: file.originalname,
      filename: file.filename || file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: result.Location,
      url: result.Location,
      s3Key: key,
      uploadedAt: new Date(),
      uploadedBy: userId,
      checksum,
    };
  }

  private async uploadToLocal(
    file: Express.Multer.File,
    fileId: string,
    userId: string,
    checksum: string,
  ): Promise<UploadedFile> {
    const baseUrl = this.configService.get('BASE_URL', 'http://localhost:3000');
    const uploadDir = this.configService.get('UPLOAD_DIR', './uploads');
    
    return {
      id: fileId,
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      url: `${baseUrl}/files/${file.filename}`,
      uploadedAt: new Date(),
      uploadedBy: userId,
      checksum,
    };
  }

  async getFile(fileId: string): Promise<UploadedFile | null> {
    try {
      // Try cache first
      const cachedFile = await this.cacheService.get<UploadedFile>(`file:${fileId}`);
      if (cachedFile) {
        return cachedFile;
      }

      // If not in cache, would query database here
      // For now, return null
      return null;
    } catch (error) {
      this.logger.error(`Failed to get file ${fileId}:`, error);
      return null;
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const file = await this.getFile(fileId);
      if (!file) {
        return false;
      }

      if (file.s3Key && this.s3) {
        await this.deleteFromS3(file.s3Key);
      } else {
        await this.deleteFromLocal(file.path);
      }

      // Remove from cache
      await this.cacheService.delete(`file:${fileId}`);

      this.logger.log(`File deleted successfully: ${fileId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file ${fileId}:`, error);
      return false;
    }
  }

  private async deleteFromS3(key: string): Promise<void> {
    const bucket = this.configService.get('AWS_S3_BUCKET');
    
    await this.s3.deleteObject({
      Bucket: bucket,
      Key: key,
    }).promise();
  }

  private async deleteFromLocal(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  async getPresignedUrl(fileId: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const file = await this.getFile(fileId);
      if (!file || !file.s3Key || !this.s3) {
        return null;
      }

      const bucket = this.configService.get('AWS_S3_BUCKET');
      
      return this.s3.getSignedUrl('getObject', {
        Bucket: bucket,
        Key: file.s3Key,
        Expires: expiresIn,
      });
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for file ${fileId}:`, error);
      return null;
    }
  }

  async validateFileIntegrity(file: UploadedFile): Promise<boolean> {
    try {
      let currentChecksum: string;

      if (file.s3Key && this.s3) {
        const bucket = this.configService.get('AWS_S3_BUCKET');
        const object = await this.s3.getObject({
          Bucket: bucket,
          Key: file.s3Key,
        }).promise();

        currentChecksum = crypto
          .createHash('sha256')
          .update(object.Body as Buffer)
          .digest('hex');
      } else {
        currentChecksum = await this.calculateChecksum(file.path);
      }

      return currentChecksum === file.checksum;
    } catch (error) {
      this.logger.error(`Failed to validate file integrity for ${file.id}:`, error);
      return false;
    }
  }

  async generateThumbnail(fileId: string, options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}): Promise<string | null> {
    try {
      const file = await this.getFile(fileId);
      if (!file || !this.isImageFile(file.mimetype)) {
        return null;
      }

      // This would integrate with image processing library like Sharp
      // For now, return a placeholder
      const thumbnailId = this.generateFileId();
      
      this.logger.log(`Thumbnail generated for file ${fileId}: ${thumbnailId}`);
      return thumbnailId;
    } catch (error) {
      this.logger.error(`Failed to generate thumbnail for file ${fileId}:`, error);
      return null;
    }
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      const file = await this.getFile(fileId);
      if (!file) {
        return null;
      }

      // This would integrate with metadata extraction libraries
      // For now, return basic metadata
      const metadata: FileMetadata = {};

      if (this.isImageFile(file.mimetype)) {
        // Would extract image dimensions
        metadata.width = 1920;
        metadata.height = 1080;
        metadata.format = 'JPEG';
      } else if (this.isVideoFile(file.mimetype)) {
        // Would extract video metadata
        metadata.duration = 120; // seconds
        metadata.width = 1920;
        metadata.height = 1080;
        metadata.bitrate = 2000; // kbps
        metadata.codec = 'H.264';
      } else if (this.isAudioFile(file.mimetype)) {
        // Would extract audio metadata
        metadata.duration = 180; // seconds
        metadata.bitrate = 128; // kbps
        metadata.codec = 'MP3';
      }

      return metadata;
    } catch (error) {
      this.logger.error(`Failed to get metadata for file ${fileId}:`, error);
      return null;
    }
  }

  private generateFileId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private async calculateChecksum(input: string | Buffer): Promise<string> {
    let buffer: Buffer;

    if (typeof input === 'string') {
      buffer = await fs.readFile(input);
    } else {
      buffer = input;
    }

    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private isImageFile(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }

  private isVideoFile(mimetype: string): boolean {
    return mimetype.startsWith('video/');
  }

  private isAudioFile(mimetype: string): boolean {
    return mimetype.startsWith('audio/');
  }

  async getFileStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
    storageUsage: {
      local: number;
      s3: number;
    };
  }> {
    // This would query the database for actual stats
    // For now, return mock data
    return {
      totalFiles: 1250,
      totalSize: 2.5 * 1024 * 1024 * 1024, // 2.5GB
      filesByType: {
        'image/jpeg': 450,
        'image/png': 320,
        'video/mp4': 150,
        'audio/mp3': 180,
        'application/pdf': 150,
      },
      storageUsage: {
        local: 1.2 * 1024 * 1024 * 1024, // 1.2GB
        s3: 1.3 * 1024 * 1024 * 1024, // 1.3GB
      },
    };
  }
}