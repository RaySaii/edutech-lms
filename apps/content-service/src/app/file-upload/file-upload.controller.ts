import { Controller, Post, Get, Delete, Param, Req, Res, UploadedFile, UseInterceptors, Logger, Headers } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FileUploadService } from './file-upload.service';

@Controller()
export class FileUploadController {
  private readonly logger = new Logger(FileUploadController.name);

  constructor(private readonly fileUploadService: FileUploadService) {}

  @MessagePattern({ cmd: 'upload_file' })
  async uploadFile(@Payload() { file }: { file: Express.Multer.File }) {
    this.logger.log(`Processing file upload: ${file.originalname}`);
    return this.fileUploadService.saveFile(file);
  }

  @MessagePattern({ cmd: 'stream_file' })
  async streamFile(
    @Payload() { filename, range }: { filename: string; range?: string }
  ) {
    this.logger.log(`Streaming file: ${filename}`);
    // This endpoint needs to be handled via HTTP for proper streaming
    // Return file info for microservice communication
    return this.fileUploadService.getFileInfo(filename);
  }

  @MessagePattern({ cmd: 'download_file' })
  async downloadFile(@Payload() { filename }: { filename: string }) {
    this.logger.log(`Download requested for file: ${filename}`);
    // Return file info for microservice communication
    return this.fileUploadService.getFileInfo(filename);
  }

  @MessagePattern({ cmd: 'delete_file' })
  async deleteFile(@Payload() { filename }: { filename: string }) {
    this.logger.log(`Deleting file: ${filename}`);
    await this.fileUploadService.deleteFile(filename);
    return { success: true, message: 'File deleted successfully' };
  }

  @MessagePattern({ cmd: 'get_file_info' })
  async getFileInfo(@Payload() { filename }: { filename: string }) {
    this.logger.log(`Getting file info: ${filename}`);
    return this.fileUploadService.getFileInfo(filename);
  }

  // HTTP endpoints for direct file access (needed for streaming)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async httpUpload(@UploadedFile() file: Express.Multer.File) {
    this.logger.log(`HTTP file upload: ${file.originalname}`);
    return this.fileUploadService.saveFile(file);
  }

  @Get('stream/:filename')
  async httpStream(
    @Param('filename') filename: string,
    @Headers('range') range: string,
    @Res() res: Response,
  ) {
    this.logger.log(`HTTP streaming file: ${filename}`);
    return this.fileUploadService.streamFile(filename, range, res);
  }

  @Get('download/:filename')
  async httpDownload(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    this.logger.log(`HTTP download file: ${filename}`);
    return this.fileUploadService.downloadFile(filename, res);
  }
}