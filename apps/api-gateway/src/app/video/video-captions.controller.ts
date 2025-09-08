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
import { VideoCaptionsService, CreateCaptionDto, UpdateCaptionDto } from './video-captions.service';
import { Request, Response } from 'express';
import { createReadStream } from 'fs';

@ApiTags('Video Captions')
@Controller('videos/:videoId/captions')
@UseGuards(JwtAuthGuard)
export class VideoCaptionsController {
  constructor(private readonly captionsService: VideoCaptionsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload caption file for video' })
  @ApiResponse({ status: 201, description: 'Caption uploaded successfully' })
  async uploadCaption(
    @Param('videoId') videoId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() createCaptionDto: Omit<CreateCaptionDto, 'file'>,
    @Req() req: Request,
  ) {
    const captionData: CreateCaptionDto = {
      ...createCaptionDto,
      file,
    };

    return this.captionsService.createCaption(videoId, captionData);
  }

  @Post('text')
  @ApiOperation({ summary: 'Create caption from text content' })
  @ApiResponse({ status: 201, description: 'Caption created successfully' })
  async createCaptionFromText(
    @Param('videoId') videoId: string,
    @Body() createCaptionDto: CreateCaptionDto,
    @Req() req: Request,
  ) {
    return this.captionsService.createCaption(videoId, createCaptionDto);
  }

  @Post('auto-generate')
  @ApiOperation({ summary: 'Auto-generate captions using speech recognition' })
  @ApiResponse({ status: 201, description: 'Auto-caption generation started' })
  async generateAutoCaption(
    @Param('videoId') videoId: string,
    @Body('language') language: string = 'en',
    @Req() req: Request,
  ) {
    return this.captionsService.generateAutoCaption(videoId, language);
  }

  @Get()
  @ApiOperation({ summary: 'Get all captions for a video' })
  async getCaptions(
    @Param('videoId') videoId: string,
    @Req() req: Request,
  ) {
    return this.captionsService.getCaptions(videoId);
  }

  @Get(':captionId')
  @ApiOperation({ summary: 'Get caption metadata' })
  async getCaption(
    @Param('videoId') videoId: string,
    @Param('captionId') captionId: string,
    @Req() req: Request,
  ) {
    return this.captionsService.getCaption(videoId, captionId);
  }

  @Get(':captionId/content')
  @ApiOperation({ summary: 'Get caption content' })
  async getCaptionContent(
    @Param('videoId') videoId: string,
    @Param('captionId') captionId: string,
    @Query('format') format?: 'vtt' | 'srt' | 'ass',
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const caption = await this.captionsService.getCaption(videoId, captionId);
    let content = await this.captionsService.getCaptionContent(videoId, captionId);

    // Convert format if requested
    if (format && format !== caption.format) {
      content = await this.captionsService.convertCaptionFormat(
        content,
        caption.format,
        format
      );
    }

    const outputFormat = format || caption.format;
    const mimeTypes = {
      vtt: 'text/vtt',
      srt: 'text/srt',
      ass: 'text/ass',
    };

    res.set({
      'Content-Type': mimeTypes[outputFormat] || 'text/plain',
      'Content-Disposition': `attachment; filename="${videoId}-${captionId}.${outputFormat}"`,
    });

    return content;
  }

  @Get(':captionId/download')
  @ApiOperation({ summary: 'Download caption file' })
  async downloadCaption(
    @Param('videoId') videoId: string,
    @Param('captionId') captionId: string,
    @Query('format') format?: 'vtt' | 'srt' | 'ass',
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const caption = await this.captionsService.getCaption(videoId, captionId);
    
    if (format && format !== caption.format) {
      // Convert and return content
      const content = await this.captionsService.getCaptionContent(videoId, captionId);
      const convertedContent = await this.captionsService.convertCaptionFormat(
        content,
        caption.format,
        format
      );

      res.set({
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${caption.language}-${caption.label}.${format}"`,
      });

      return convertedContent;
    } else {
      // Stream original file
      const mimeTypes = {
        vtt: 'text/vtt',
        srt: 'text/srt',
        ass: 'text/ass',
      };

      res.set({
        'Content-Type': mimeTypes[caption.format] || 'text/plain',
        'Content-Disposition': `attachment; filename="${caption.language}-${caption.label}.${caption.format}"`,
      });

      const stream = createReadStream(caption.filePath);
      return new StreamableFile(stream);
    }
  }

  @Put(':captionId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update caption' })
  @ApiResponse({ status: 200, description: 'Caption updated successfully' })
  async updateCaption(
    @Param('videoId') videoId: string,
    @Param('captionId') captionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() updateCaptionDto: Omit<UpdateCaptionDto, 'file'>,
    @Req() req: Request,
  ) {
    const captionData: UpdateCaptionDto = {
      ...updateCaptionDto,
      file,
    };

    return this.captionsService.updateCaption(videoId, captionId, captionData);
  }

  @Put(':captionId/text')
  @ApiOperation({ summary: 'Update caption text content' })
  @ApiResponse({ status: 200, description: 'Caption updated successfully' })
  async updateCaptionText(
    @Param('videoId') videoId: string,
    @Param('captionId') captionId: string,
    @Body() updateCaptionDto: UpdateCaptionDto,
    @Req() req: Request,
  ) {
    return this.captionsService.updateCaption(videoId, captionId, updateCaptionDto);
  }

  @Delete(':captionId')
  @ApiOperation({ summary: 'Delete caption' })
  @ApiResponse({ status: 200, description: 'Caption deleted successfully' })
  async deleteCaption(
    @Param('videoId') videoId: string,
    @Param('captionId') captionId: string,
    @Req() req: Request,
  ) {
    await this.captionsService.deleteCaption(videoId, captionId);
    return { message: 'Caption deleted successfully' };
  }

  @Post(':captionId/convert')
  @ApiOperation({ summary: 'Convert caption to different format' })
  @ApiResponse({ status: 200, description: 'Caption converted successfully' })
  async convertCaption(
    @Param('videoId') videoId: string,
    @Param('captionId') captionId: string,
    @Body('format') targetFormat: 'vtt' | 'srt' | 'ass',
    @Req() req: Request,
  ) {
    const caption = await this.captionsService.getCaption(videoId, captionId);
    const content = await this.captionsService.getCaptionContent(videoId, captionId);
    const convertedContent = await this.captionsService.convertCaptionFormat(
      content,
      caption.format,
      targetFormat
    );

    return {
      originalFormat: caption.format,
      targetFormat,
      content: convertedContent,
    };
  }

  @Get(':captionId/parse')
  @ApiOperation({ summary: 'Parse caption content into structured cues' })
  @ApiResponse({ status: 200, description: 'Caption parsed successfully' })
  async parseCaption(
    @Param('videoId') videoId: string,
    @Param('captionId') captionId: string,
    @Req() req: Request,
  ) {
    const caption = await this.captionsService.getCaption(videoId, captionId);
    const content = await this.captionsService.getCaptionContent(videoId, captionId);
    const cues = await this.captionsService.parseCaptionContent(content, caption.format);

    return {
      captionId,
      language: caption.language,
      format: caption.format,
      totalCues: cues.length,
      totalDuration: cues.length > 0 ? cues[cues.length - 1].end - cues[0].start : 0,
      cues,
    };
  }

  @Post('batch-upload')
  @UseInterceptors(FileInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple caption files' })
  @ApiResponse({ status: 201, description: 'Captions uploaded successfully' })
  async batchUploadCaptions(
    @Param('videoId') videoId: string,
    @UploadedFile() files: Express.Multer.File[],
    @Body() metadata: Array<Omit<CreateCaptionDto, 'file'>>,
    @Req() req: Request,
  ) {
    const results = [];

    for (let i = 0; i < files.length && i < metadata.length; i++) {
      try {
        const captionData: CreateCaptionDto = {
          ...metadata[i],
          file: files[i],
        };

        const result = await this.captionsService.createCaption(videoId, captionData);
        results.push({ success: true, caption: result });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message,
          filename: files[i]?.originalname 
        });
      }
    }

    return {
      totalFiles: files.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };
  }

  @Get('languages/supported')
  @ApiOperation({ summary: 'Get list of supported languages for captions' })
  async getSupportedLanguages() {
    return {
      languages: [
        { code: 'en', name: 'English', native: 'English' },
        { code: 'es', name: 'Spanish', native: 'Español' },
        { code: 'fr', name: 'French', native: 'Français' },
        { code: 'de', name: 'German', native: 'Deutsch' },
        { code: 'it', name: 'Italian', native: 'Italiano' },
        { code: 'pt', name: 'Portuguese', native: 'Português' },
        { code: 'ru', name: 'Russian', native: 'Русский' },
        { code: 'ja', name: 'Japanese', native: '日本語' },
        { code: 'ko', name: 'Korean', native: '한국어' },
        { code: 'zh', name: 'Chinese', native: '中文' },
        { code: 'ar', name: 'Arabic', native: 'العربية' },
        { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
      ],
      formats: [
        { format: 'vtt', name: 'WebVTT', description: 'Web Video Text Tracks' },
        { format: 'srt', name: 'SubRip', description: 'SubRip Subtitle' },
        { format: 'ass', name: 'ASS/SSA', description: 'Advanced SubStation Alpha' },
      ]
    };
  }
}