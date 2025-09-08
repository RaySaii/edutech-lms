import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '@edutech-lms/auth';
import { VideoService } from './video.service';
import { VideoProcessingService } from './video-processing.service';
import {
  CreateVideoDto,
  UploadVideoDto,
  VideoProgressDto,
  VideoBookmarkDto,
  VideoNoteDto,
} from './video.service';
import { Request, Response } from 'express';
import { createReadStream } from 'fs';
import * as path from 'path';
import * as fs from 'fs/promises';

@ApiTags('Videos')
@Controller('videos')
@UseGuards(JwtAuthGuard)
export class VideoController {
  constructor(
    private readonly videoService: VideoService,
    private readonly videoProcessingService: VideoProcessingService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB max
    },
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm',
        'video/ogg',
      ];
      cb(null, allowedMimeTypes.includes(file.mimetype));
    },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a video file' })
  @ApiResponse({ status: 201, description: 'Video uploaded successfully' })
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() createVideoDto: CreateVideoDto,
    @Req() req: Request,
  ) {
    const uploadDto: UploadVideoDto = {
      ...createVideoDto,
      file,
    };
    
    return this.videoService.uploadVideo(uploadDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get user videos' })
  async getUserVideos(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Req() req: Request,
  ) {
    return this.videoService.findUserVideos(req.user.id, page, limit);
  }

  @Get('content/:contentId')
  @ApiOperation({ summary: 'Get videos by content ID' })
  async getVideosByContent(
    @Param('contentId') contentId: string,
    @Req() req: Request,
  ) {
    return this.videoService.findVideosByContent(contentId, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get video by ID' })
  async getVideoById(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.videoService.findVideoById(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update video information' })
  async updateVideo(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateVideoDto>,
    @Req() req: Request,
  ) {
    return this.videoService.updateVideo(id, updateData, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete video' })
  async deleteVideo(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    await this.videoService.deleteVideo(id, req.user.id);
    return { message: 'Video deleted successfully' };
  }

  @Get(':id/stream/:quality')
  @ApiOperation({ summary: 'Stream video with specified quality' })
  async streamVideo(
    @Param('id') id: string,
    @Param('quality') quality: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const streamPath = await this.videoService.getVideoStream(id, quality as any, req.user?.id);
    
    const stat = await fs.stat(streamPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      
      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': 'video/mp4',
      });
      
      const stream = createReadStream(streamPath, { start, end });
      return new StreamableFile(stream);
    } else {
      res.set({
        'Content-Length': fileSize.toString(),
        'Content-Type': 'video/mp4',
      });
      
      const stream = createReadStream(streamPath);
      return new StreamableFile(stream);
    }
  }

  @Get(':id/hls/playlist.m3u8')
  @ApiOperation({ summary: 'Get HLS playlist' })
  async getHLSPlaylist(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const video = await this.videoService.findVideoById(id, req.user?.id);
    
    if (!video.hlsPlaylistPath) {
      throw new Error('HLS playlist not available');
    }
    
    res.set({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-cache',
    });
    
    const stream = createReadStream(video.hlsPlaylistPath);
    return new StreamableFile(stream);
  }

  @Get(':id/thumbnail')
  @ApiOperation({ summary: 'Get video thumbnail' })
  async getThumbnail(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const thumbnailPath = await this.videoService.getThumbnail(id, req.user?.id);
    
    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    });
    
    const stream = createReadStream(thumbnailPath);
    return new StreamableFile(stream);
  }

  @Get(':id/processing-status')
  @ApiOperation({ summary: 'Get video processing status' })
  async getProcessingStatus(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.videoProcessingService.getProcessingStatus(id);
  }

  // Progress tracking endpoints
  @Post(':id/progress')
  @ApiOperation({ summary: 'Update video watch progress' })
  async updateProgress(
    @Param('id') id: string,
    @Body() progressDto: VideoProgressDto,
    @Req() req: Request,
  ) {
    return this.videoService.updateProgress(id, req.user.id, progressDto);
  }

  @Get(':id/progress')
  @ApiOperation({ summary: 'Get video watch progress' })
  async getProgress(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.videoService.getProgress(id, req.user.id);
  }

  // Bookmark endpoints
  @Post(':id/bookmarks')
  @ApiOperation({ summary: 'Create video bookmark' })
  async createBookmark(
    @Param('id') id: string,
    @Body() bookmarkDto: VideoBookmarkDto,
    @Req() req: Request,
  ) {
    return this.videoService.createBookmark(id, req.user.id, bookmarkDto);
  }

  @Get(':id/bookmarks')
  @ApiOperation({ summary: 'Get video bookmarks' })
  async getBookmarks(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.videoService.getBookmarks(id, req.user.id);
  }

  @Delete('bookmarks/:bookmarkId')
  @ApiOperation({ summary: 'Delete video bookmark' })
  async deleteBookmark(
    @Param('bookmarkId') bookmarkId: string,
    @Req() req: Request,
  ) {
    await this.videoService.deleteBookmark(bookmarkId, req.user.id);
    return { message: 'Bookmark deleted successfully' };
  }

  // Notes endpoints
  @Post(':id/notes')
  @ApiOperation({ summary: 'Create video note' })
  async createNote(
    @Param('id') id: string,
    @Body() noteDto: VideoNoteDto,
    @Req() req: Request,
  ) {
    return this.videoService.createNote(id, req.user.id, noteDto);
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Get video notes' })
  async getNotes(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.videoService.getNotes(id, req.user.id);
  }

  @Put('notes/:noteId')
  @ApiOperation({ summary: 'Update video note' })
  async updateNote(
    @Param('noteId') noteId: string,
    @Body() updateData: Partial<VideoNoteDto>,
    @Req() req: Request,
  ) {
    return this.videoService.updateNote(noteId, req.user.id, updateData);
  }

  @Delete('notes/:noteId')
  @ApiOperation({ summary: 'Delete video note' })
  async deleteNote(
    @Param('noteId') noteId: string,
    @Req() req: Request,
  ) {
    await this.videoService.deleteNote(noteId, req.user.id);
    return { message: 'Note deleted successfully' };
  }

  // Analytics endpoints
  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get video analytics' })
  async getVideoAnalytics(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.videoService.getVideoAnalytics(id, req.user.id);
  }
}