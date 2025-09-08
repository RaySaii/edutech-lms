import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { VideoProcessingService } from './video-processing.service';

@Processor('video-processing')
export class VideoProcessor {
  private readonly logger = new Logger(VideoProcessor.name);

  constructor(private videoProcessingService: VideoProcessingService) {}

  @Process('process-video')
  async handleVideoProcessing(job: Job) {
    const { videoId, filePath } = job.data;
    
    this.logger.log(`Starting video processing job for video: ${videoId}`);
    
    try {
      // Update job progress
      await job.progress(0);
      
      // Process the video
      await this.videoProcessingService.processVideo(videoId);
      
      // Complete the job
      await job.progress(100);
      
      this.logger.log(`Video processing completed for: ${videoId}`);
      return { success: true, videoId };
    } catch (error) {
      this.logger.error(`Video processing failed for ${videoId}:`, error);
      throw error;
    }
  }

  @Process('generate-thumbnail')
  async handleThumbnailGeneration(job: Job) {
    const { videoId, inputPath } = job.data;
    
    this.logger.log(`Generating thumbnail for video: ${videoId}`);
    
    try {
      // This would be implemented if we want separate thumbnail generation
      // For now, it's handled in the main processing pipeline
      
      return { success: true, videoId };
    } catch (error) {
      this.logger.error(`Thumbnail generation failed for ${videoId}:`, error);
      throw error;
    }
  }

  @Process('cleanup-temp-files')
  async handleTempFileCleanup(job: Job) {
    const { filePaths } = job.data;
    
    this.logger.log('Cleaning up temporary files');
    
    try {
      const fs = require('fs/promises');
      
      for (const filePath of filePaths) {
        try {
          await fs.unlink(filePath);
          this.logger.log(`Deleted temp file: ${filePath}`);
        } catch (error) {
          this.logger.warn(`Failed to delete temp file ${filePath}:`, error);
        }
      }
      
      return { success: true, cleanedFiles: filePaths.length };
    } catch (error) {
      this.logger.error('Temp file cleanup failed:', error);
      throw error;
    }
  }
}