import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { MulterModule } from '@nestjs/platform-express';
import { 
  Video, 
  VideoProgress, 
  VideoBookmark, 
  VideoNote, 
  User, 
  Course,
  VideoPlaylist,
  VideoPlaylistItem,
  VideoPlaylistProgress,
  VideoPlaylistRating
} from '@edutech-lms/database';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { VideoProcessingService } from './video-processing.service';
import { VideoProcessor } from './video.processor';
import { VideoRecommendationsController } from './video-recommendations.controller';
import { VideoRecommendationsService } from './video-recommendations.service';
import { VideoCaptionsController } from './video-captions.controller';
import { VideoCaptionsService } from './video-captions.service';
import { VideoPlaylistController } from './video-playlist.controller';
import { VideoPlaylistService } from './video-playlist.service';
import { VideoLivestreamController } from './video-livestream.controller';
import { VideoLivestreamService } from './video-livestream.service';
import * as multer from 'multer';
import * as path from 'path';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Video, 
      VideoProgress, 
      VideoBookmark, 
      VideoNote, 
      User, 
      Course,
      VideoPlaylist,
      VideoPlaylistItem,
      VideoPlaylistProgress,
      VideoPlaylistRating
    ]),
    BullModule.registerQueue({
      name: 'video-processing',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    }),
    BullModule.registerQueue({
      name: 'livestream-processing',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 5,
        removeOnFail: 3,
      },
    }),
    MulterModule.register({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
          'video/mp4',
          'video/quicktime',
          'video/x-msvideo',
          'video/webm',
          'video/ogg',
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only video files are allowed.'), false);
        }
      },
    }),
  ],
  controllers: [VideoController, VideoRecommendationsController, VideoCaptionsController, VideoPlaylistController, VideoLivestreamController],
  providers: [VideoService, VideoProcessingService, VideoProcessor, VideoRecommendationsService, VideoCaptionsService, VideoPlaylistService, VideoLivestreamService],
  exports: [VideoService, VideoProcessingService, VideoRecommendationsService, VideoCaptionsService, VideoPlaylistService, VideoLivestreamService],
})
export class VideoModule {}