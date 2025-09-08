import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, VideoStatus, VideoQuality } from '@edutech-lms/database';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class VideoProcessingService {
  private readonly logger = new Logger(VideoProcessingService.name);
  private readonly outputPath = 'uploads/processed';
  private readonly thumbnailPath = 'uploads/thumbnails';

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
  ) {
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.outputPath, { recursive: true });
      await fs.mkdir(this.thumbnailPath, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create processing directories:', error);
    }
  }

  async processVideo(videoId: string): Promise<void> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
    });

    if (!video) {
      throw new Error(`Video ${videoId} not found`);
    }

    try {
      await this.updateProcessingStatus(videoId, {
        progress: 0,
        currentStep: 'Starting video processing',
      });

      // Update status to processing
      await this.videoRepository.update(videoId, {
        status: VideoStatus.PROCESSING,
      });

      // Extract metadata
      const metadata = await this.extractVideoMetadata(video.filePath);
      await this.updateVideoMetadata(videoId, metadata);
      
      await this.updateProcessingStatus(videoId, {
        progress: 20,
        currentStep: 'Generating thumbnail',
      });

      // Generate thumbnail
      const thumbnailPath = await this.generateThumbnail(video.filePath, videoId);
      
      await this.updateProcessingStatus(videoId, {
        progress: 40,
        currentStep: 'Creating video streams',
      });

      // Create multiple quality streams
      const videoStreams = await this.createVideoStreams(video.filePath, videoId, metadata);
      
      await this.updateProcessingStatus(videoId, {
        progress: 80,
        currentStep: 'Generating HLS playlist',
      });

      // Generate HLS playlist
      const hlsPlaylistPath = await this.generateHLSPlaylist(videoStreams, videoId);
      
      await this.updateProcessingStatus(videoId, {
        progress: 100,
        currentStep: 'Processing completed',
      });

      // Update video with processed data
      await this.videoRepository.update(videoId, {
        status: VideoStatus.READY,
        thumbnailPath,
        videoStreams,
        hlsPlaylistPath,
        duration: metadata.duration,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          fps: metadata.fps,
          codec: metadata.codec,
          bitrate: metadata.bitrate,
          aspectRatio: metadata.aspectRatio,
        },
        processingStatus: {
          progress: 100,
          currentStep: 'Completed',
        },
      });

      this.logger.log(`Video processing completed: ${videoId}`);
    } catch (error) {
      this.logger.error(`Video processing failed for ${videoId}:`, error);
      
      await this.videoRepository.update(videoId, {
        status: VideoStatus.FAILED,
        processingStatus: {
          progress: 0,
          currentStep: 'Failed',
          error: error.message,
        },
      });
      
      throw error;
    }
  }

  private async extractVideoMetadata(filePath: string): Promise<any> {
    try {
      const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;
      const { stdout } = await execAsync(command);
      const data = JSON.parse(stdout);
      
      const videoStream = data.streams.find(s => s.codec_type === 'video');
      if (!videoStream) {
        throw new Error('No video stream found');
      }

      return {
        duration: Math.round(parseFloat(data.format.duration)),
        width: videoStream.width,
        height: videoStream.height,
        fps: eval(videoStream.r_frame_rate), // e.g., "30/1" -> 30
        codec: videoStream.codec_name,
        bitrate: parseInt(data.format.bit_rate),
        aspectRatio: `${videoStream.width}:${videoStream.height}`,
      };
    } catch (error) {
      this.logger.error('Failed to extract metadata:', error);
      throw new Error('Failed to extract video metadata');
    }
  }

  private async generateThumbnail(inputPath: string, videoId: string): Promise<string> {
    const thumbnailFileName = `${videoId}-thumbnail.jpg`;
    const outputPath = path.join(this.thumbnailPath, thumbnailFileName);
    
    try {
      const command = `ffmpeg -i "${inputPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:240:force_original_aspect_ratio=decrease,pad=320:240:(ow-iw)/2:(oh-ih)/2" "${outputPath}" -y`;
      await execAsync(command);
      
      return outputPath;
    } catch (error) {
      this.logger.error('Failed to generate thumbnail:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }

  private async createVideoStreams(inputPath: string, videoId: string, metadata: any): Promise<any[]> {
    const streams = [];
    const baseOutputDir = path.join(this.outputPath, videoId);
    
    await fs.mkdir(baseOutputDir, { recursive: true });

    // Define quality settings based on input resolution
    const qualitySettings = this.getQualitySettings(metadata.width, metadata.height);
    
    for (const quality of qualitySettings) {
      try {
        const outputFileName = `${videoId}-${quality.name}.mp4`;
        const outputPath = path.join(baseOutputDir, outputFileName);
        
        const command = `ffmpeg -i "${inputPath}" -c:v libx264 -crf ${quality.crf} -preset medium -vf "scale=${quality.width}:${quality.height}:force_original_aspect_ratio=decrease,pad=${quality.width}:${quality.height}:(ow-iw)/2:(oh-ih)/2" -c:a aac -b:a 128k "${outputPath}" -y`;
        
        await execAsync(command);
        
        // Get file info for the processed stream
        const stats = await fs.stat(outputPath);
        
        streams.push({
          quality: quality.quality,
          filePath: outputPath,
          bitrate: quality.bitrate,
          resolution: `${quality.width}x${quality.height}`,
          fileSize: stats.size,
        });
        
        this.logger.log(`Created ${quality.name} stream for video ${videoId}`);
      } catch (error) {
        this.logger.error(`Failed to create ${quality.name} stream:`, error);
        // Continue with other qualities
      }
    }
    
    return streams;
  }

  private async generateHLSPlaylist(streams: any[], videoId: string): Promise<string> {
    const hlsDir = path.join(this.outputPath, videoId, 'hls');
    await fs.mkdir(hlsDir, { recursive: true });
    
    const playlistPath = path.join(hlsDir, 'playlist.m3u8');
    
    try {
      // Use the highest quality stream for HLS
      const highestQualityStream = streams.reduce((prev, current) => 
        prev.bitrate > current.bitrate ? prev : current
      );
      
      if (highestQualityStream) {
        const command = `ffmpeg -i "${highestQualityStream.filePath}" -codec: copy -start_number 0 -hls_time 10 -hls_list_size 0 -f hls "${playlistPath}" -y`;
        await execAsync(command);
      }
      
      return playlistPath;
    } catch (error) {
      this.logger.error('Failed to generate HLS playlist:', error);
      return null;
    }
  }

  private getQualitySettings(inputWidth: number, inputHeight: number): any[] {
    const settings = [
      { name: '480p', quality: VideoQuality.SD_480, width: 854, height: 480, crf: 28, bitrate: 1000 },
      { name: '720p', quality: VideoQuality.HD_720, width: 1280, height: 720, crf: 25, bitrate: 2500 },
      { name: '1080p', quality: VideoQuality.FHD_1080, width: 1920, height: 1080, crf: 23, bitrate: 4000 },
    ];
    
    // Only include qualities that are not larger than the input
    return settings.filter(setting => 
      setting.width <= inputWidth && setting.height <= inputHeight
    );
  }

  private async updateProcessingStatus(videoId: string, status: any): Promise<void> {
    await this.videoRepository.update(videoId, {
      processingStatus: status,
    });
  }

  private async updateVideoMetadata(videoId: string, metadata: any): Promise<void> {
    await this.videoRepository.update(videoId, {
      duration: metadata.duration,
    });
  }

  async getProcessingStatus(videoId: string): Promise<any> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      select: ['processingStatus', 'status'],
    });
    
    return {
      status: video.status,
      processing: video.processingStatus,
    };
  }
}