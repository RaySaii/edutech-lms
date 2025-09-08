import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { FileUploadService, FileUploadConfig } from './file-upload.service';
import { FILE_UPLOAD_CONFIG_KEY, FileUploadOptions } from './file-upload.decorator';

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  private readonly logger = new Logger(FileUploadInterceptor.name);

  constructor(
    private readonly fileUploadService: FileUploadService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const uploadOptions = this.reflector.get<FileUploadOptions>(
      FILE_UPLOAD_CONFIG_KEY,
      context.getHandler(),
    );

    if (!uploadOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new BadRequestException('User must be authenticated to upload files');
    }

    return next.handle().pipe(
      map(async (data) => {
        try {
          const processedFiles = await this.processUploadedFiles(
            request,
            user.id,
            uploadOptions,
          );

          return {
            ...data,
            files: processedFiles,
          };
        } catch (error) {
          this.logger.error('File processing failed:', error);
          throw error;
        }
      }),
      catchError((error) => {
        this.logger.error('File upload interceptor error:', error);
        throw this.handleUploadError(error);
      }),
    );
  }

  private async processUploadedFiles(
    request: any,
    userId: string,
    options: FileUploadOptions,
  ) {
    const files = request.files;
    const file = request.file;

    if (!files && !file) {
      return [];
    }

    const filesToProcess = file ? [file] : Array.isArray(files) ? files : this.flattenFileFields(files);
    const processedFiles = [];

    for (const uploadedFile of filesToProcess) {
      try {
        this.validateFile(uploadedFile, options);
        
        const processedFile = await this.fileUploadService.uploadFile(
          uploadedFile,
          userId,
          this.convertToUploadConfig(options),
        );

        // Generate thumbnail if requested
        if (options.generateThumbnail && this.isImageFile(uploadedFile.mimetype)) {
          const thumbnailId = await this.fileUploadService.generateThumbnail(processedFile.id);
          processedFile.thumbnailId = thumbnailId;
        }

        // Validate integrity if requested
        if (options.validateIntegrity) {
          const isValid = await this.fileUploadService.validateFileIntegrity(processedFile);
          if (!isValid) {
            this.logger.warn(`File integrity validation failed for file: ${processedFile.id}`);
          }
          processedFile.integrityValid = isValid;
        }

        // Get metadata
        const metadata = await this.fileUploadService.getFileMetadata(processedFile.id);
        if (metadata) {
          processedFile.metadata = metadata;
        }

        processedFiles.push(processedFile);
        
        this.logger.log(`File processed successfully: ${processedFile.id}`);
      } catch (error) {
        this.logger.error(`Failed to process file ${uploadedFile.originalname}:`, error);
        throw error;
      }
    }

    return processedFiles;
  }

  private flattenFileFields(files: { [fieldname: string]: Express.Multer.File[] }): Express.Multer.File[] {
    const flattened = [];
    
    Object.values(files).forEach(fileArray => {
      if (Array.isArray(fileArray)) {
        flattened.push(...fileArray);
      } else {
        flattened.push(fileArray);
      }
    });
    
    return flattened;
  }

  private validateFile(file: Express.Multer.File, options: FileUploadOptions) {
    // Size validation
    if (options.maxFileSize && file.size > options.maxFileSize) {
      throw new PayloadTooLargeException(
        `File size ${file.size} exceeds maximum allowed size ${options.maxFileSize}`,
      );
    }

    // MIME type validation
    if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${options.allowedMimeTypes.join(', ')}`,
      );
    }

    // Extension validation
    if (options.allowedExtensions) {
      const ext = this.getFileExtension(file.originalname);
      if (!options.allowedExtensions.includes(ext)) {
        throw new BadRequestException(
          `File extension ${ext} is not allowed. Allowed extensions: ${options.allowedExtensions.join(', ')}`,
        );
      }
    }

    // Additional security checks
    this.performSecurityChecks(file);
  }

  private performSecurityChecks(file: Express.Multer.File) {
    // Check for suspicious file names
    if (this.hasSuspiciousFileName(file.originalname)) {
      throw new BadRequestException('Suspicious file name detected');
    }

    // Check for double extensions
    if (this.hasDoubleExtension(file.originalname)) {
      throw new BadRequestException('Files with double extensions are not allowed');
    }

    // Check for executable files
    if (this.isExecutableFile(file.originalname)) {
      throw new BadRequestException('Executable files are not allowed');
    }
  }

  private hasSuspiciousFileName(filename: string): boolean {
    const suspiciousPatterns = [
      /\.\./, // Directory traversal
      /[<>:"|?*]/, // Invalid characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Reserved names
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }

  private hasDoubleExtension(filename: string): boolean {
    const parts = filename.split('.');
    return parts.length > 2;
  }

  private isExecutableFile(filename: string): boolean {
    const executableExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
      '.jar', '.sh', '.py', '.pl', '.php', '.asp', '.aspx', '.jsp',
    ];

    const ext = this.getFileExtension(filename);
    return executableExtensions.includes(ext);
  }

  private getFileExtension(filename: string): string {
    return filename.toLowerCase().substring(filename.lastIndexOf('.'));
  }

  private isImageFile(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }

  private convertToUploadConfig(options: FileUploadOptions): Partial<FileUploadConfig> {
    return {
      maxFileSize: options.maxFileSize,
      allowedMimeTypes: options.allowedMimeTypes,
      allowedExtensions: options.allowedExtensions,
      useS3: options.useS3,
    };
  }

  private handleUploadError(error: any): any {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new PayloadTooLargeException('File too large');
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return new BadRequestException('Too many files');
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return new BadRequestException('Unexpected field name');
    }

    return error;
  }
}