import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';
import { Response } from 'express';
import * as ffprobe from 'ffprobe';
import * as ffprobeStatic from 'ffprobe-static';

export interface FileInfo {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  duration?: number;
  width?: number;
  height?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly uploadPath = './uploads';

  async saveFile(file: Express.Multer.File): Promise<FileInfo> {
    this.logger.log(`Processing uploaded file: ${file.originalname}`);

    const fileInfo: FileInfo = {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
    };

    // Extract metadata for video/audio files
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      try {
        const metadata = await this.extractMediaMetadata(file.path);
        fileInfo.duration = metadata.duration;
        fileInfo.width = metadata.width;
        fileInfo.height = metadata.height;
        fileInfo.metadata = metadata;
      } catch (error) {
        this.logger.warn(`Failed to extract metadata for ${file.originalname}: ${error.message}`);
      }
    }

    return fileInfo;
  }

  async streamFile(filename: string, range: string, res: Response): Promise<void> {
    const filePath = join(this.uploadPath, filename);

    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException('File not found');
    }

    const stat = await fs.stat(filePath);
    const fileSize = stat.size;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = (await import('fs')).createReadStream(filePath, { start, end });

      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': this.getMimeType(filename),
      });

      stream.pipe(res);
    } else {
      res.set({
        'Content-Length': fileSize.toString(),
        'Content-Type': this.getMimeType(filename),
      });

      const stream = (await import('fs')).createReadStream(filePath);
      stream.pipe(res);
    }
  }

  async downloadFile(filename: string, res: Response): Promise<void> {
    const filePath = join(this.uploadPath, filename);

    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException('File not found');
    }

    const originalName = basename(filename);
    res.download(filePath, originalName);
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = join(this.uploadPath, filename);

    try {
      await fs.unlink(filePath);
      this.logger.log(`Deleted file: ${filename}`);
    } catch (error) {
      this.logger.warn(`Failed to delete file ${filename}: ${error.message}`);
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  private async extractMediaMetadata(filePath: string): Promise<any> {
    try {
      const info = await ffprobe(filePath, { path: ffprobeStatic.path });
      
      const videoStream = info.streams.find(stream => stream.codec_type === 'video');
      const audioStream = info.streams.find(stream => stream.codec_type === 'audio');

      return {
        duration: parseFloat(info.format.duration) || 0,
        width: videoStream?.width || null,
        height: videoStream?.height || null,
        bitrate: parseInt(info.format.bit_rate) || null,
        videoCodec: videoStream?.codec_name || null,
        audioCodec: audioStream?.codec_name || null,
        frameRate: videoStream?.r_frame_rate ? eval(videoStream.r_frame_rate) : null,
        aspectRatio: videoStream?.display_aspect_ratio || null,
      };
    } catch (error) {
      this.logger.error(`Failed to extract media metadata: ${error.message}`);
      throw error;
    }
  }

  private getMimeType(filename: string): string {
    const ext = extname(filename).toLowerCase();
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.mp3': 'audio/mp3',
      '.wav': 'audio/wav',
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  async getFileInfo(filename: string): Promise<{ size: number; mimetype: string }> {
    const filePath = join(this.uploadPath, filename);

    try {
      const stat = await fs.stat(filePath);
      return {
        size: stat.size,
        mimetype: this.getMimeType(filename),
      };
    } catch {
      throw new NotFoundException('File not found');
    }
  }
}