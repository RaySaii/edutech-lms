import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@edutech-lms/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  AdvancedSearchService,
  SearchRequest,
  SearchResponse,
  SearchResult,
  IndexingRequest,
} from './advanced-search.service';
import {
  SearchIndexType,
  SearchSuggestionType,
  SearchFilterType,
  SearchResultType,
} from '@edutech-lms/database';

export class SearchQueryDto {
  query: string;
  indices?: SearchIndexType[];
  filters?: Record<string, any>;
  facets?: string[];
  sorting?: Array<{
    field: string;
    order: 'asc' | 'desc';
  }>;
  page?: number;
  size?: number;
  highlighting?: boolean;
  suggestions?: boolean;
  personalized?: boolean;
}

export class AutocompleteQueryDto {
  query: string;
  limit?: number;
}

export class ClickTrackingDto {
  queryId: string;
  resultId: string;
  resultType: SearchResultType;
  position: number;
  timeSpent?: number;
}

export class SearchFeedbackDto {
  queryId: string;
  rating: number; // 1-5
  feedback?: string;
  improvementSuggestions?: string[];
}

export class IndexingJobDto {
  indexType: SearchIndexType;
  operation: 'index' | 'update' | 'delete' | 'bulk';
  documents?: any[];
  documentIds?: string[];
}

@ApiTags('Advanced Search')
@ApiBearerAuth()
@Controller('search/advanced')
@UseGuards(JwtAuthGuard)
export class AdvancedSearchController {
  constructor(private readonly searchService: AdvancedSearchService) {}

  // Main search endpoints

  @Get()
  @ApiOperation({ summary: 'Perform advanced search' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Search results retrieved successfully',
    type: Object // Would be SearchResponse in real implementation
  })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiQuery({ name: 'indices', description: 'Search indices to query', required: false, isArray: true, enum: SearchIndexType })
  @ApiQuery({ name: 'page', description: 'Page number', required: false, type: Number })
  @ApiQuery({ name: 'size', description: 'Results per page', required: false, type: Number })
  @ApiQuery({ name: 'filters', description: 'Search filters as JSON string', required: false })
  @ApiQuery({ name: 'facets', description: 'Facets to include', required: false, isArray: true })
  @ApiQuery({ name: 'sort', description: 'Sorting criteria', required: false })
  @ApiQuery({ name: 'highlight', description: 'Enable highlighting', required: false, type: Boolean })
  @ApiQuery({ name: 'suggestions', description: 'Include suggestions', required: false, type: Boolean })
  @ApiQuery({ name: 'personalized', description: 'Apply personalization', required: false, type: Boolean })
  async search(
    @Query('q') query: string,
    @Query('indices') indices?: SearchIndexType[],
    @Query('page') page = 1,
    @Query('size') size = 20,
    @Query('filters') filtersJson?: string,
    @Query('facets') facets?: string[],
    @Query('sort') sortJson?: string,
    @Query('highlight') highlighting = false,
    @Query('suggestions') suggestions = false,
    @Query('personalized') personalized = true,
    @CurrentUser() user?: any
  ): Promise<SearchResponse> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query is required');
    }

    if (size > 100) {
      throw new BadRequestException('Maximum page size is 100');
    }

    let filters: Record<string, any> = {};
    if (filtersJson) {
      try {
        filters = JSON.parse(filtersJson);
      } catch (error) {
        throw new BadRequestException('Invalid filters JSON');
      }
    }

    let sorting: Array<{ field: string; order: 'asc' | 'desc' }> = [];
    if (sortJson) {
      try {
        sorting = JSON.parse(sortJson);
      } catch (error) {
        throw new BadRequestException('Invalid sorting JSON');
      }
    }

    const searchRequest: SearchRequest = {
      query: query.trim(),
      userId: user?.id,
      organizationId: user.organizationId,
      indices,
      filters,
      facets,
      sorting,
      pagination: {
        from: (page - 1) * size,
        size,
      },
      highlighting,
      suggestions,
      personalized: personalized && !!user?.id,
    };

    return await this.searchService.search(searchRequest);
  }

  @Post()
  @ApiOperation({ summary: 'Perform advanced search with detailed options' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Search results retrieved successfully'
  })
  async searchDetailed(
    @Body() searchQuery: SearchQueryDto,
    @CurrentUser() user: any
  ): Promise<SearchResponse> {
    if (!searchQuery.query || searchQuery.query.trim().length === 0) {
      throw new BadRequestException('Search query is required');
    }

    const size = Math.min(searchQuery.size || 20, 100);
    const page = Math.max(searchQuery.page || 1, 1);

    const searchRequest: SearchRequest = {
      query: searchQuery.query.trim(),
      userId: user?.id,
      organizationId: user.organizationId,
      indices: searchQuery.indices,
      filters: searchQuery.filters,
      facets: searchQuery.facets,
      sorting: searchQuery.sorting,
      pagination: {
        from: (page - 1) * size,
        size,
      },
      highlighting: searchQuery.highlighting || false,
      suggestions: searchQuery.suggestions || false,
      personalized: (searchQuery.personalized !== false) && !!user?.id,
    };

    return await this.searchService.search(searchRequest);
  }

  // Autocomplete and suggestions

  @Get('autocomplete')
  @ApiOperation({ summary: 'Get search autocompletion suggestions' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Autocomplete suggestions retrieved successfully',
    type: [String]
  })
  @ApiQuery({ name: 'q', description: 'Partial search query', required: true })
  @ApiQuery({ name: 'limit', description: 'Maximum number of suggestions', required: false, type: Number })
  async autocomplete(
    @Query('q') query: string,
    @Query('limit') limit = 10,
    @CurrentUser() user: any
  ): Promise<string[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    if (limit > 50) {
      throw new BadRequestException('Maximum limit is 50');
    }

    return await this.searchService.searchWithAutoComplete(
      query.trim(),
      user.organizationId,
      limit
    );
  }

  @Get('suggestions/trending')
  @ApiOperation({ summary: 'Get trending search suggestions' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Trending suggestions retrieved successfully'
  })
  @ApiQuery({ name: 'limit', description: 'Maximum number of suggestions', required: false, type: Number })
  async getTrendingSuggestions(
    @Query('limit') limit = 20,
    @CurrentUser() user: any
  ): Promise<any[]> {
    // Implementation would fetch trending suggestions from database
    return [
      { text: 'machine learning', type: 'topic', popularity: 150 },
      { text: 'javascript fundamentals', type: 'course', popularity: 120 },
      { text: 'data science', type: 'category', popularity: 100 },
      { text: 'web development', type: 'skill', popularity: 90 },
      { text: 'python programming', type: 'topic', popularity: 85 },
    ].slice(0, limit);
  }

  @Get('suggestions/popular')
  @ApiOperation({ summary: 'Get popular search queries' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Popular queries retrieved successfully'
  })
  @ApiQuery({ name: 'timeframe', description: 'Time period (1d, 7d, 30d)', required: false })
  @ApiQuery({ name: 'limit', description: 'Maximum number of queries', required: false, type: Number })
  async getPopularQueries(
    @Query('timeframe') timeframe = '7d',
    @Query('limit') limit = 10,
    @CurrentUser() user: any
  ): Promise<any[]> {
    // Implementation would fetch popular queries from analytics
    return [
      { query: 'react hooks tutorial', count: 45, trend: 'up' },
      { query: 'python data analysis', count: 38, trend: 'stable' },
      { query: 'machine learning basics', count: 35, trend: 'up' },
      { query: 'javascript async await', count: 30, trend: 'down' },
      { query: 'css flexbox guide', count: 28, trend: 'stable' },
    ].slice(0, limit);
  }

  // Search analytics and tracking

  @Post('track/click')
  @ApiOperation({ summary: 'Track search result click' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Click tracked successfully'
  })
  async trackResultClick(
    @Body() clickData: ClickTrackingDto,
    @CurrentUser() user: any
  ): Promise<{ success: boolean }> {
    // Implementation would track clicks for analytics
    console.log('Tracking click:', {
      userId: user.id,
      ...clickData,
      timestamp: new Date(),
    });

    return { success: true };
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Submit search feedback' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Feedback submitted successfully'
  })
  async submitSearchFeedback(
    @Body() feedback: SearchFeedbackDto,
    @CurrentUser() user: any
  ): Promise<{ success: boolean }> {
    // Implementation would save feedback for analysis
    console.log('Search feedback:', {
      userId: user.id,
      ...feedback,
      timestamp: new Date(),
    });

    return { success: true };
  }

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get search analytics overview' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Analytics overview retrieved successfully'
  })
  @ApiQuery({ name: 'timeframe', description: 'Time period for analytics', required: false })
  async getAnalyticsOverview(
    @Query('timeframe') timeframe = '30d',
    @CurrentUser() user: any
  ): Promise<any> {
    // Implementation would fetch analytics data
    return {
      timeframe,
      summary: {
        totalQueries: 1250,
        uniqueUsers: 85,
        averageResultsPerQuery: 15.3,
        clickThroughRate: 0.68,
        averageQueryTime: 145, // ms
        topPerformingQueries: [
          { query: 'javascript tutorial', ctr: 0.85, avgPosition: 2.1 },
          { query: 'python basics', ctr: 0.79, avgPosition: 1.8 },
          { query: 'react components', ctr: 0.72, avgPosition: 2.5 },
        ],
        queryDistribution: {
          courses: 45,
          content: 35,
          videos: 15,
          users: 5,
        },
      },
      trends: {
        dailyQueries: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          queries: Math.floor(Math.random() * 50) + 20,
          uniqueUsers: Math.floor(Math.random() * 20) + 5,
        })),
        queryIntents: {
          learning: 55,
          research: 25,
          browsing: 15,
          specific: 5,
        },
      },
    };
  }

  // Index management (admin endpoints)

  @Post('indices/:indexType/create')
  @ApiOperation({ summary: 'Create search index (admin only)' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Search index created successfully'
  })
  @ApiParam({ name: 'indexType', enum: SearchIndexType })
  async createSearchIndex(
    @Param('indexType') indexType: SearchIndexType,
    @Body() configuration: any,
    @CurrentUser() user: any
  ): Promise<any> {
    // In production, add admin role check
    return await this.searchService.createSearchIndex(
      user.organizationId,
      indexType,
      configuration
    );
  }

  @Post('indices/:indexType/index')
  @ApiOperation({ summary: 'Index documents (admin only)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Documents indexed successfully'
  })
  @ApiParam({ name: 'indexType', enum: SearchIndexType })
  async indexDocuments(
    @Param('indexType') indexType: SearchIndexType,
    @Body() indexingJob: IndexingJobDto,
    @CurrentUser() user: any
  ): Promise<{ success: boolean; message: string }> {
    // In production, add admin role check
    
    const request: IndexingRequest = {
      indexType,
      organizationId: user.organizationId,
      documents: indexingJob.documents,
      documentIds: indexingJob.documentIds,
      operation: indexingJob.operation,
    };

    await this.searchService.indexDocuments(request);

    return {
      success: true,
      message: `Successfully ${indexingJob.operation}ed ${indexingJob.documents?.length || indexingJob.documentIds?.length || 0} documents`,
    };
  }

  @Get('indices')
  @ApiOperation({ summary: 'List search indices (admin only)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Search indices retrieved successfully'
  })
  async listSearchIndices(@CurrentUser() user: any): Promise<any[]> {
    // Implementation would list organization's search indices
    return [
      {
        id: '1',
        indexType: SearchIndexType.COURSES,
        name: `${user.organizationId}-courses`,
        documentCount: 1250,
        lastSynced: new Date(),
        isActive: true,
        syncStatus: 'healthy',
      },
      {
        id: '2',
        indexType: SearchIndexType.CONTENT,
        name: `${user.organizationId}-content`,
        documentCount: 5800,
        lastSynced: new Date(),
        isActive: true,
        syncStatus: 'syncing',
      },
      {
        id: '3',
        indexType: SearchIndexType.VIDEOS,
        name: `${user.organizationId}-videos`,
        documentCount: 890,
        lastSynced: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        isActive: true,
        syncStatus: 'stale',
      },
    ];
  }

  @Get('indices/:indexId/status')
  @ApiOperation({ summary: 'Get search index status (admin only)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Index status retrieved successfully'
  })
  @ApiParam({ name: 'indexId' })
  async getIndexStatus(
    @Param('indexId') indexId: string,
    @CurrentUser() user: any
  ): Promise<any> {
    // Implementation would get detailed index status
    return {
      id: indexId,
      status: 'healthy',
      documentCount: 1250,
      indexSize: '15.2MB',
      lastSynced: new Date(),
      syncDuration: 1250, // ms
      errorCount: 0,
      performance: {
        avgQueryTime: 85,
        p95QueryTime: 150,
        throughput: 125, // queries per second
      },
      health: {
        shardsTotal: 5,
        shardsActive: 5,
        shardsFailed: 0,
        replicationFactor: 1,
      },
    };
  }

  @Post('indices/:indexId/sync')
  @ApiOperation({ summary: 'Trigger index sync (admin only)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Index sync triggered successfully'
  })
  @ApiParam({ name: 'indexId' })
  async triggerIndexSync(
    @Param('indexId') indexId: string,
    @CurrentUser() user: any
  ): Promise<{ success: boolean; jobId: string }> {
    // Implementation would trigger a sync job
    const jobId = `sync-${indexId}-${Date.now()}`;
    
    return {
      success: true,
      jobId,
    };
  }

  // Personalization endpoints

  @Get('personalization')
  @ApiOperation({ summary: 'Get user search personalization settings' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Personalization settings retrieved successfully'
  })
  async getPersonalizationSettings(@CurrentUser() user: any): Promise<any> {
    // Implementation would fetch user's personalization settings
    return {
      preferences: {
        preferredCategories: ['programming', 'data-science', 'web-development'],
        preferredInstructors: ['john-doe', 'jane-smith'],
        preferredDifficultyLevels: ['beginner', 'intermediate'],
        preferredContentTypes: ['video', 'interactive'],
        learningGoals: ['career-change', 'skill-improvement'],
      },
      searchBehavior: {
        frequentlyUsedFilters: {
          category: 15,
          difficulty: 12,
          rating: 8,
        },
        averageSessionDuration: 1200, // seconds
        clickThroughRate: 0.72,
        preferredResultTypes: {
          courses: 60,
          videos: 25,
          articles: 15,
        },
      },
      recommendations: [
        'Try searching for "advanced javascript" based on your interests',
        'Filter by "intermediate" difficulty for more relevant results',
        'Consider exploring "machine learning" courses',
      ],
    };
  }

  @Put('personalization')
  @ApiOperation({ summary: 'Update user search personalization settings' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Personalization settings updated successfully'
  })
  async updatePersonalizationSettings(
    @Body() settings: any,
    @CurrentUser() user: any
  ): Promise<{ success: boolean }> {
    // Implementation would update user's personalization settings
    console.log('Updating personalization for user:', user.id, settings);
    
    return { success: true };
  }

  @Delete('personalization/reset')
  @ApiOperation({ summary: 'Reset user search personalization' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Personalization reset successfully'
  })
  async resetPersonalization(@CurrentUser() user: any): Promise<{ success: boolean }> {
    // Implementation would reset user's personalization
    console.log('Resetting personalization for user:', user.id);
    
    return { success: true };
  }

  // Search filters and facets

  @Get('filters')
  @ApiOperation({ summary: 'Get available search filters' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Search filters retrieved successfully'
  })
  @ApiQuery({ name: 'indexType', description: 'Filter by index type', required: false, enum: SearchIndexType })
  async getSearchFilters(
    @Query('indexType') indexType?: SearchIndexType,
    @CurrentUser() user?: any
  ): Promise<any[]> {
    // Implementation would fetch available search filters
    return [
      {
        type: SearchFilterType.CATEGORY,
        name: 'category',
        displayName: 'Category',
        description: 'Filter by course category',
        configuration: {
          field_mapping: 'category',
          data_type: 'string',
          widget_type: 'checkbox',
          options: [
            { value: 'programming', label: 'Programming', count: 450 },
            { value: 'data-science', label: 'Data Science', count: 280 },
            { value: 'design', label: 'Design', count: 180 },
            { value: 'business', label: 'Business', count: 220 },
          ],
          multiple_selection: true,
          is_faceted: true,
        },
      },
      {
        type: SearchFilterType.DIFFICULTY,
        name: 'difficulty',
        displayName: 'Difficulty Level',
        configuration: {
          field_mapping: 'difficulty',
          data_type: 'string',
          widget_type: 'radio',
          options: [
            { value: 'beginner', label: 'Beginner', count: 520 },
            { value: 'intermediate', label: 'Intermediate', count: 380 },
            { value: 'advanced', label: 'Advanced', count: 230 },
          ],
          multiple_selection: false,
          is_faceted: true,
        },
      },
      {
        type: SearchFilterType.RATING,
        name: 'rating',
        displayName: 'Minimum Rating',
        configuration: {
          field_mapping: 'rating',
          data_type: 'number',
          widget_type: 'range_slider',
          range_config: {
            min: 1,
            max: 5,
            step: 0.5,
            unit: 'stars',
          },
          default_value: 3.0,
          is_faceted: false,
        },
      },
      {
        type: SearchFilterType.DURATION,
        name: 'duration',
        displayName: 'Course Duration',
        configuration: {
          field_mapping: 'duration',
          data_type: 'number',
          widget_type: 'dropdown',
          options: [
            { value: 60, label: 'Under 1 hour', count: 150 },
            { value: 300, label: '1-5 hours', count: 420 },
            { value: 600, label: '5-10 hours', count: 380 },
            { value: 1200, label: '10+ hours', count: 180 },
          ],
        },
      },
    ];
  }

  @Get('facets/:indexType')
  @ApiOperation({ summary: 'Get faceted search data for index type' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Facets retrieved successfully'
  })
  @ApiParam({ name: 'indexType', enum: SearchIndexType })
  @ApiQuery({ name: 'query', description: 'Optional search query to filter facets', required: false })
  async getFacets(
    @Param('indexType') indexType: SearchIndexType,
    @Query('query') query?: string,
    @CurrentUser() user?: any
  ): Promise<any> {
    // Implementation would return faceted data for the index type
    return {
      indexType,
      facets: {
        categories: [
          { value: 'programming', count: 450, percentage: 40.2 },
          { value: 'data-science', count: 280, percentage: 25.0 },
          { value: 'design', count: 180, percentage: 16.1 },
          { value: 'business', count: 220, percentage: 19.7 },
        ],
        difficulty: [
          { value: 'beginner', count: 520, percentage: 46.4 },
          { value: 'intermediate', count: 380, percentage: 33.9 },
          { value: 'advanced', count: 230, percentage: 20.5 },
        ],
        languages: [
          { value: 'english', count: 980, percentage: 87.5 },
          { value: 'spanish', count: 85, percentage: 7.6 },
          { value: 'french', count: 55, percentage: 4.9 },
        ],
        ratings: [
          { range: '4.5-5.0', count: 320, percentage: 28.6 },
          { range: '4.0-4.5', count: 450, percentage: 40.2 },
          { range: '3.5-4.0', count: 280, percentage: 25.0 },
          { range: '3.0-3.5', count: 70, percentage: 6.2 },
        ],
      },
    };
  }
}