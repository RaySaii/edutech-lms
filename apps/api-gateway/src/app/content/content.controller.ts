import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Logger,
  HttpException,
  HttpStatus,
  Patch,
  UploadedFile,
  UseInterceptors,
  Res,
  Headers,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { JwtAuthGuard, RequirePermissions } from '@edutech-lms/auth';
import { Permission } from '@edutech-lms/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CreateContentDto, UpdateContentDto, ContentQueryDto } from './dto';

@Controller('content')
@UseGuards(JwtAuthGuard)
export class ContentController {
  private readonly logger = new Logger(ContentController.name);

  constructor(
    @Inject('CONTENT_SERVICE') private contentService: ClientProxy,
  ) {}

  @Post()
  @RequirePermissions(Permission.ADMIN_COURSES)
  async create(@Body() createContentDto: CreateContentDto, @Req() req: any) {
    this.logger.log('Creating content');
    createContentDto.uploaderId = req.user.id;

    try {
      const result = await this.contentService.send(
        { cmd: 'create_content' },
        createContentDto,
      ).toPromise();
      return result;
    } catch (error) {
      this.logger.error('Failed to create content:', error);
      throw new HttpException(
        'Failed to create content',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('upload')
  @RequirePermissions(Permission.ADMIN_COURSES)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    this.logger.log('Uploading file');

    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.contentService.send(
        { cmd: 'upload_file' },
        { file },
      ).toPromise();
      return result;
    } catch (error) {
      this.logger.error('Failed to upload file:', error);
      throw new HttpException(
        'Failed to upload file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @RequirePermissions(Permission.COURSE_READ)
  async findAll(@Query() query: ContentQueryDto) {
    this.logger.log('Finding all content');

    try {
      const result = await this.contentService.send(
        { cmd: 'find_all_content' },
        query,
      ).toPromise();
      return result;
    } catch (error) {
      this.logger.error('Failed to find content:', error);
      throw new HttpException(
        'Failed to find content',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stream/:filename')
  async streamFile(
    @Param('filename') filename: string,
    @Headers('range') range: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Streaming file: ${filename}`);

    try {
      // Forward the request directly to content service HTTP endpoint
      const contentServiceUrl = `http://localhost:3004/stream/${filename}`;
      const headers = range ? { Range: range } : {};
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(contentServiceUrl, { headers });
      
      // Copy headers from content service response
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      
      res.status(response.status);
      response.body?.pipe(res);
    } catch (error) {
      this.logger.error('Failed to stream file:', error);
      throw new HttpException(
        'Failed to stream file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('download/:filename')
  @RequirePermissions(Permission.COURSE_READ)
  async downloadFile(@Param('filename') filename: string, @Res() res: Response) {
    this.logger.log(`Downloading file: ${filename}`);

    try {
      // Forward the request directly to content service HTTP endpoint
      const contentServiceUrl = `http://localhost:3004/download/${filename}`;
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(contentServiceUrl);
      
      // Copy headers from content service response
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      
      res.status(response.status);
      response.body?.pipe(res);
    } catch (error) {
      this.logger.error('Failed to download file:', error);
      throw new HttpException(
        'Failed to download file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @RequirePermissions(Permission.COURSE_READ)
  async findOne(@Param('id') id: string) {
    this.logger.log(`Finding content by ID: ${id}`);

    try {
      const result = await this.contentService.send(
        { cmd: 'find_content_by_id' },
        { id },
      ).toPromise();
      return result;
    } catch (error) {
      this.logger.error('Failed to find content:', error);
      throw new HttpException(
        'Failed to find content',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @RequirePermissions(Permission.ADMIN_COURSES)
  async update(@Param('id') id: string, @Body() updateContentDto: UpdateContentDto) {
    this.logger.log(`Updating content: ${id}`);

    try {
      const result = await this.contentService.send(
        { cmd: 'update_content' },
        { id, updateContentDto },
      ).toPromise();
      return result;
    } catch (error) {
      this.logger.error('Failed to update content:', error);
      throw new HttpException(
        'Failed to update content',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @RequirePermissions(Permission.ADMIN_COURSES)
  async remove(@Param('id') id: string) {
    this.logger.log(`Deleting content: ${id}`);

    try {
      const result = await this.contentService.send(
        { cmd: 'delete_content' },
        { id },
      ).toPromise();
      return result;
    } catch (error) {
      this.logger.error('Failed to delete content:', error);
      throw new HttpException(
        'Failed to delete content',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/publish')
  @RequirePermissions(Permission.ADMIN_COURSES)
  async publish(@Param('id') id: string) {
    this.logger.log(`Publishing content: ${id}`);

    try {
      const result = await this.contentService.send(
        { cmd: 'publish_content' },
        { id },
      ).toPromise();
      return result;
    } catch (error) {
      this.logger.error('Failed to publish content:', error);
      throw new HttpException(
        'Failed to publish content',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/archive')
  @RequirePermissions(Permission.ADMIN_COURSES)
  async archive(@Param('id') id: string) {
    this.logger.log(`Archiving content: ${id}`);

    try {
      const result = await this.contentService.send(
        { cmd: 'archive_content' },
        { id },
      ).toPromise();
      return result;
    } catch (error) {
      this.logger.error('Failed to archive content:', error);
      throw new HttpException(
        'Failed to archive content',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Progress tracking endpoints
  @Get(':id/progress')
  @RequirePermissions(Permission.LEARNING_PROGRESS)
  async getProgress(@Param('id') contentId: string, @Req() req: any) {
    const userId = req.user.id;
    this.logger.log(`Getting progress for content: ${contentId}, user: ${userId}`);

    try {
      const result = await this.contentService.send(
        { cmd: 'get_content_progress' },
        { contentId, userId },
      ).toPromise();
      return result;
    } catch (error) {
      this.logger.error('Failed to get progress:', error);
      throw new HttpException(
        'Failed to get progress',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/progress')
  @RequirePermissions(Permission.LEARNING_PROGRESS)
  async updateProgress(
    @Param('id') contentId: string,
    @Body() progressData: any,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    this.logger.log(`Updating progress for content: ${contentId}, user: ${userId}`);

    try {
      const result = await this.contentService.send(
        { cmd: 'update_content_progress' },
        { contentId, userId, progressData },
      ).toPromise();
      return result;
    } catch (error) {
      this.logger.error('Failed to update progress:', error);
      throw new HttpException(
        'Failed to update progress',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/bookmark')
  @RequirePermissions(Permission.LEARNING_PROGRESS)
  async toggleBookmark(@Param('id') contentId: string, @Req() req: any) {
    const userId = req.user.id;
    this.logger.log(`Toggling bookmark for content: ${contentId}, user: ${userId}`);

    try {
      const result = await this.contentService.send(
        { cmd: 'toggle_content_bookmark' },
        { contentId, userId },
      ).toPromise();
      return result;
    } catch (error) {
      this.logger.error('Failed to toggle bookmark:', error);
      throw new HttpException(
        'Failed to toggle bookmark',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/bookmarks')
  @RequirePermissions(Permission.LEARNING_PROGRESS)
  async getUserBookmarks(@Req() req: any) {
    const userId = req.user.id;
    this.logger.log(`Getting bookmarks for user: ${userId}`);

    try {
      const result = await this.contentService.send(
        { cmd: 'get_user_bookmarks' },
        { userId },
      ).toPromise();
      return result;
    } catch (error) {
      this.logger.error('Failed to get bookmarks:', error);
      throw new HttpException(
        'Failed to get bookmarks',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/progress')
  @RequirePermissions(Permission.LEARNING_PROGRESS)
  async getUserProgress(@Query('courseId') courseId: string, @Req() req: any) {
    const userId = req.user.id;
    this.logger.log(`Getting user progress for user: ${userId}, course: ${courseId || 'all'}`);

    try {
      const result = await this.contentService.send(
        { cmd: 'get_user_progress' },
        { userId, courseId },
      ).toPromise();
      return result;
    } catch (error) {
      this.logger.error('Failed to get user progress:', error);
      throw new HttpException(
        'Failed to get user progress',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

}