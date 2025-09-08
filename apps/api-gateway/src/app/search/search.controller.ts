import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@edutech-lms/auth';
import { SearchService, SearchQuery, SearchResponse } from './search.service';
import { IsOptional, IsString, IsInt, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SearchDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  level?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  minRating?: number;

  @IsString()
  @IsOptional()
  instructor?: string;

  @IsString()
  @IsOptional()
  tags?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsEnum(['relevance', 'rating', 'price', 'created', 'popularity'])
  @IsOptional()
  sortBy?: 'relevance' | 'rating' | 'price' | 'created' | 'popularity';

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @IsOptional()
  highlight?: boolean = true;

  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @IsOptional()
  facets?: boolean = true;
}

export class AutoCompleteDto {
  @IsString()
  query: string;

  @IsString()
  @IsOptional()
  type?: string;
}

@ApiTags('Search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly searchService: SearchService) {}

  @Get('courses')
  @ApiOperation({ summary: 'Search courses with advanced filtering and faceting' })
  @ApiResponse({
    status: 200,
    description: 'Course search results with pagination, facets, and highlights',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', example: 'course' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  score: { type: 'number' },
                  highlights: { type: 'object' },
                  metadata: {
                    type: 'object',
                    properties: {
                      instructor: { type: 'object' },
                      level: { type: 'string' },
                      price: { type: 'number' },
                      rating: { type: 'number' },
                      enrollmentCount: { type: 'number' },
                      duration: { type: 'number' },
                      thumbnail: { type: 'string' },
                      tags: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
              },
            },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            facets: { type: 'object' },
            suggestions: { type: 'array', items: { type: 'string' } },
            took: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiQuery({ name: 'query', required: false, description: 'Search query text' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'level', required: false, description: 'Filter by difficulty level' })
  @ApiQuery({ name: 'minPrice', required: false, description: 'Minimum price filter' })
  @ApiQuery({ name: 'maxPrice', required: false, description: 'Maximum price filter' })
  @ApiQuery({ name: 'minRating', required: false, description: 'Minimum rating filter' })
  @ApiQuery({ name: 'instructor', required: false, description: 'Filter by instructor name' })
  @ApiQuery({ name: 'tags', required: false, description: 'Comma-separated tags' })
  @ApiQuery({ name: 'language', required: false, description: 'Filter by language' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['relevance', 'rating', 'price', 'created', 'popularity'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20, max: 100)' })
  @ApiQuery({ name: 'highlight', required: false, description: 'Enable search result highlighting' })
  @ApiQuery({ name: 'facets', required: false, description: 'Include faceted search results' })
  async searchCourses(@Query() searchDto: SearchDto): Promise<{ success: boolean; data: SearchResponse }> {
    try {
      this.logger.debug(`Searching courses with query: ${JSON.stringify(searchDto)}`);

      const searchQuery: SearchQuery = {
        query: searchDto.query || '',
        filters: {
          category: searchDto.category ? [searchDto.category] : undefined,
          level: searchDto.level ? [searchDto.level] : undefined,
          price: searchDto.minPrice || searchDto.maxPrice ? {
            min: searchDto.minPrice,
            max: searchDto.maxPrice,
          } : undefined,
          rating: searchDto.minRating ? { min: searchDto.minRating } : undefined,
          instructor: searchDto.instructor ? [searchDto.instructor] : undefined,
          tags: searchDto.tags ? searchDto.tags.split(',').map(tag => tag.trim()) : undefined,
          language: searchDto.language ? [searchDto.language] : undefined,
        },
        sort: searchDto.sortBy ? {
          field: searchDto.sortBy,
          order: searchDto.sortOrder || 'desc',
        } : undefined,
        page: searchDto.page,
        limit: searchDto.limit,
        highlight: searchDto.highlight,
        facets: searchDto.facets,
      };

      const results = await this.searchService.searchCourses(searchQuery);

      // Track search analytics
      this.trackSearchAnalytics(searchQuery, results);

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      this.logger.error('Course search failed:', error);
      throw error;
    }
  }

  @Get('all')
  @ApiOperation({ summary: 'Search across all content types (courses, users, content, discussions)' })
  @ApiResponse({
    status: 200,
    description: 'Multi-index search results',
  })
  async searchAll(@Query() searchDto: SearchDto): Promise<{ success: boolean; data: SearchResponse }> {
    try {
      this.logger.debug(`Multi-index search with query: ${JSON.stringify(searchDto)}`);

      const searchQuery: SearchQuery = {
        query: searchDto.query || '',
        page: searchDto.page,
        limit: searchDto.limit,
        highlight: searchDto.highlight,
      };

      const results = await this.searchService.searchAll(searchQuery);

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      this.logger.error('Multi-index search failed:', error);
      throw error;
    }
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Get search suggestions and autocomplete results' })
  @ApiResponse({
    status: 200,
    description: 'Array of autocomplete suggestions',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiQuery({ name: 'query', required: true, description: 'Partial search query' })
  @ApiQuery({ name: 'type', required: false, description: 'Content type to search within' })
  async getAutoComplete(@Query() autoCompleteDto: AutoCompleteDto): Promise<{ success: boolean; data: { suggestions: string[] } }> {
    try {
      this.logger.debug(`Autocomplete search for: ${autoCompleteDto.query}`);

      const suggestions = await this.searchService.autoComplete(
        autoCompleteDto.query,
        autoCompleteDto.type
      );

      return {
        success: true,
        data: { suggestions },
      };
    } catch (error) {
      this.logger.error('Autocomplete search failed:', error);
      throw error;
    }
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get search analytics and popular queries' })
  @ApiResponse({
    status: 200,
    description: 'Search analytics data',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            popularQueries: { type: 'array' },
            searchVolume: { type: 'array' },
            zeroResultsCount: { type: 'number' },
          },
        },
      },
    },
  })
  async getSearchAnalytics(): Promise<{ success: boolean; data: any }> {
    try {
      this.logger.debug('Fetching search analytics');

      const analytics = await this.searchService.getSearchAnalytics();

      return {
        success: true,
        data: analytics || {
          popularQueries: [],
          searchVolume: [],
          zeroResultsCount: 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get search analytics:', error);
      throw error;
    }
  }

  @Get('reindex')
  @ApiOperation({ summary: 'Trigger search index rebuild (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Index rebuild initiated',
  })
  @ApiQuery({ name: 'type', required: false, description: 'Specific content type to reindex' })
  async triggerReindex(@Query('type') type?: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Triggering reindex for type: ${type || 'all'}`);

      await this.searchService.reindexAll(type);

      return {
        success: true,
        message: `Reindex ${type ? `for ${type}` : 'for all content'} completed successfully`,
      };
    } catch (error) {
      this.logger.error('Reindex failed:', error);
      throw error;
    }
  }

  private trackSearchAnalytics(searchQuery: SearchQuery, results: SearchResponse): void {
    // Track search metrics for analytics
    try {
      const searchEvent = {
        query: searchQuery.query,
        filters: searchQuery.filters,
        resultsCount: results.total,
        took: results.took,
        timestamp: new Date().toISOString(),
        hasResults: results.total > 0,
      };

      // In a real implementation, you would send this to an analytics service
      this.logger.debug(`Search analytics event: ${JSON.stringify(searchEvent)}`);
    } catch (error) {
      this.logger.warn('Failed to track search analytics:', error);
    }
  }
}