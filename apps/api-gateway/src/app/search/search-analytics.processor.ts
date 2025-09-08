import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  SearchQuery,
  SearchResultClick,
  SearchAnalytics,
  SearchPersonalization,
  SearchSuggestion,
  User,
} from '@edutech-lms/database';

@Processor('search-analytics')
export class SearchAnalyticsProcessor {
  private readonly logger = new Logger(SearchAnalyticsProcessor.name);

  constructor(
    @InjectRepository(SearchQuery)
    private searchQueryRepository: Repository<SearchQuery>,
    @InjectRepository(SearchResultClick)
    private searchClickRepository: Repository<SearchResultClick>,
    @InjectRepository(SearchAnalytics)
    private searchAnalyticsRepository: Repository<SearchAnalytics>,
    @InjectRepository(SearchPersonalization)
    private personalizationRepository: Repository<SearchPersonalization>,
    @InjectRepository(SearchSuggestion)
    private suggestionRepository: Repository<SearchSuggestion>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Process('process-search-query')
  async handleSearchQuery(job: Job<{ queryId: string }>) {
    const { queryId } = job.data;

    try {
      const searchQuery = await this.searchQueryRepository.findOne({
        where: { id: queryId },
        relations: ['user'],
      });

      if (!searchQuery) {
        this.logger.warn(`Search query not found: ${queryId}`);
        return;
      }

      // Update user personalization based on search behavior
      if (searchQuery.userId) {
        await this.updateUserPersonalization(searchQuery);
      }

      // Analyze query intent
      const intent = this.analyzeQueryIntent(searchQuery.queryText);
      if (intent) {
        searchQuery.searchIntent = intent;
        await this.searchQueryRepository.save(searchQuery);
      }

      // Update suggestion popularity
      await this.updateSuggestionMetrics(searchQuery);

      this.logger.log(`Processed search query: ${queryId}`);
    } catch (error) {
      this.logger.error(`Failed to process search query: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('process-result-click')
  async handleResultClick(job: Job<{
    queryId: string;
    resultId: string;
    resultType: string;
    position: number;
    timeSpent?: number;
  }>) {
    const { queryId, resultId, resultType, position, timeSpent } = job.data;

    try {
      const searchQuery = await this.searchQueryRepository.findOne({
        where: { id: queryId },
      });

      if (!searchQuery) {
        this.logger.warn(`Search query not found for click tracking: ${queryId}`);
        return;
      }

      // Create click record
      const click = this.searchClickRepository.create({
        searchQueryId: queryId,
        resultId,
        resultType: resultType as any,
        resultTitle: `Result ${resultId}`, // Would get actual title from result
        position,
        relevanceScore: this.calculateRelevanceScore(position, searchQuery.resultsCount),
        timeSpentSeconds: timeSpent || 0,
        clickedAt: new Date(),
      });

      await this.searchClickRepository.save(click);

      // Update search query click count
      searchQuery.clickThroughCount += 1;
      await this.searchQueryRepository.save(searchQuery);

      // Update user personalization with click behavior
      if (searchQuery.userId) {
        await this.updatePersonalizationFromClick(searchQuery.userId, click);
      }

      this.logger.log(`Processed result click: ${resultId} at position ${position}`);
    } catch (error) {
      this.logger.error(`Failed to process result click: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('generate-daily-analytics')
  async handleDailyAnalytics(job: Job<{
    organizationId: string;
    date: Date;
  }>) {
    const { organizationId, date } = job.data;

    try {
      this.logger.log(`Generating daily analytics for ${organizationId} on ${date.toISOString()}`);

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get search queries for the day
      const queries = await this.searchQueryRepository.find({
        where: {
          organizationId,
          executedAt: Between(startOfDay, endOfDay),
        },
        relations: ['resultClicks'],
      });

      // Calculate analytics metrics
      const analytics = await this.calculateDailyMetrics(organizationId, date, queries);

      // Save analytics
      await this.searchAnalyticsRepository.save(analytics);

      this.logger.log(`Generated daily analytics for ${organizationId}: ${queries.length} queries`);
    } catch (error) {
      this.logger.error(`Failed to generate daily analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('update-personalization')
  async handlePersonalizationUpdate(job: Job<{
    userId: string;
    learningActivity: any;
  }>) {
    const { userId, learningActivity } = job.data;

    try {
      let personalization = await this.personalizationRepository.findOne({
        where: { userId },
      });

      if (!personalization) {
        const user = await this.userRepository.findOne({
          where: { id: userId },
        });

        if (!user) {
          this.logger.warn(`User not found for personalization: ${userId}`);
          return;
        }

        personalization = this.personalizationRepository.create({
          userId,
          organizationId: user.organizationId,
          preferences: {
            preferred_categories: [],
            preferred_instructors: [],
            preferred_difficulty_levels: [],
            preferred_content_types: [],
            preferred_languages: ['english'],
            learning_goals: [],
            interests: [],
          },
          profileCompleteness: 10, // Basic profile
        });
      }

      // Update preferences based on learning activity
      await this.updatePreferencesFromActivity(personalization, learningActivity);

      // Recalculate profile completeness
      personalization.profileCompleteness = this.calculateProfileCompleteness(personalization);
      personalization.lastUpdated = new Date();

      await this.personalizationRepository.save(personalization);

      this.logger.log(`Updated personalization for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to update personalization: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('generate-search-insights')
  async handleSearchInsights(job: Job<{
    organizationId: string;
    timeframe: '7d' | '30d' | '90d';
  }>) {
    const { organizationId, timeframe } = job.data;

    try {
      this.logger.log(`Generating search insights for ${organizationId} (${timeframe})`);

      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get aggregated analytics data
      const analytics = await this.searchAnalyticsRepository.find({
        where: {
          organizationId,
          date: Between(startDate, new Date()),
        },
        order: { date: 'ASC' },
      });

      // Generate insights
      const insights = await this.generateInsightsFromAnalytics(analytics);

      // Store insights (in a real implementation, you'd have an insights table)
      this.logger.log(`Generated insights for ${organizationId}:`, insights);

      return insights;
    } catch (error) {
      this.logger.error(`Failed to generate search insights: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('optimize-suggestions')
  async handleSuggestionOptimization(job: Job<{
    organizationId: string;
  }>) {
    const { organizationId } = job.data;

    try {
      this.logger.log(`Optimizing suggestions for organization: ${organizationId}`);

      // Get all suggestions for the organization
      const suggestions = await this.suggestionRepository.find({
        where: { organizationId },
      });

      let optimized = 0;

      for (const suggestion of suggestions) {
        let updated = false;

        // Deactivate low-performing suggestions
        if (suggestion.popularity < 3 && suggestion.clickThroughRate < 0.1) {
          suggestion.isActive = false;
          updated = true;
        }

        // Promote high-performing suggestions
        if (suggestion.popularity > 50 && suggestion.clickThroughRate > 0.7) {
          suggestion.isPromoted = true;
          suggestion.displayOrder = 1;
          updated = true;
        }

        // Update metadata based on performance
        if (suggestion.clickThroughRate > 0.5) {
          suggestion.metadata = {
            ...suggestion.metadata,
            performance: 'high',
            last_optimized: new Date().toISOString(),
          };
          updated = true;
        }

        if (updated) {
          await this.suggestionRepository.save(suggestion);
          optimized++;
        }
      }

      this.logger.log(`Optimized ${optimized} suggestions for ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to optimize suggestions: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Helper methods

  private async updateUserPersonalization(searchQuery: SearchQuery): Promise<void> {
    try {
      let personalization = await this.personalizationRepository.findOne({
        where: { userId: searchQuery.userId },
      });

      if (!personalization) {
        const user = await this.userRepository.findOne({
          where: { id: searchQuery.userId },
        });

        personalization = this.personalizationRepository.create({
          userId: searchQuery.userId,
          organizationId: user.organizationId,
          preferences: {
            preferred_categories: [],
            preferred_instructors: [],
            preferred_difficulty_levels: [],
            preferred_content_types: [],
            preferred_languages: ['english'],
            learning_goals: [],
            interests: [],
          },
          searchBehavior: {
            frequently_used_filters: {},
            common_query_patterns: [],
            preferred_result_types: {},
            click_behavior: {
              avg_position_clicked: 0,
              time_spent_on_results: 0,
              conversion_rate: 0,
            },
            search_frequency: {
              queries_per_week: 0,
              most_active_hours: [],
              most_active_days: [],
            },
          },
        });
      }

      // Update search behavior
      const searchBehavior = personalization.searchBehavior || {} as any;

      // Update filter usage
      if (searchQuery.filters) {
        searchBehavior.frequently_used_filters = searchBehavior.frequently_used_filters || {};
        for (const [filter, value] of Object.entries(searchQuery.filters)) {
          searchBehavior.frequently_used_filters[filter] = 
            (searchBehavior.frequently_used_filters[filter] || 0) + 1;
        }
      }

      // Update query patterns
      searchBehavior.common_query_patterns = searchBehavior.common_query_patterns || [];
      const normalizedQuery = searchQuery.normalizedQuery || searchQuery.queryText.toLowerCase();
      
      if (!searchBehavior.common_query_patterns.includes(normalizedQuery)) {
        searchBehavior.common_query_patterns.push(normalizedQuery);
        if (searchBehavior.common_query_patterns.length > 20) {
          searchBehavior.common_query_patterns = searchBehavior.common_query_patterns.slice(-20);
        }
      }

      // Update search frequency
      searchBehavior.search_frequency = searchBehavior.search_frequency || {} as any;
      searchBehavior.search_frequency.queries_per_week = 
        (searchBehavior.search_frequency.queries_per_week || 0) + (1/7); // Approximate

      personalization.searchBehavior = searchBehavior;
      personalization.lastUpdated = new Date();

      await this.personalizationRepository.save(personalization);
    } catch (error) {
      this.logger.error(`Failed to update user personalization: ${error.message}`);
    }
  }

  private analyzeQueryIntent(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    
    // Learning intent keywords
    if (lowerQuery.includes('how to') || lowerQuery.includes('learn') || 
        lowerQuery.includes('tutorial') || lowerQuery.includes('course')) {
      return 'learning';
    }
    
    // Research intent keywords
    if (lowerQuery.includes('what is') || lowerQuery.includes('definition') || 
        lowerQuery.includes('explain') || lowerQuery.includes('overview')) {
      return 'research';
    }
    
    // Specific intent (looking for exact content)
    if (query.includes('"') || lowerQuery.includes('specific') || 
        query.length > 50) {
      return 'specific';
    }
    
    // Default to browsing
    return 'browsing';
  }

  private async updateSuggestionMetrics(searchQuery: SearchQuery): Promise<void> {
    try {
      const suggestion = await this.suggestionRepository.findOne({
        where: {
          organizationId: searchQuery.organizationId,
          text: searchQuery.normalizedQuery || searchQuery.queryText.toLowerCase(),
        },
      });

      if (suggestion) {
        // Update CTR based on whether query had results
        const totalQueries = suggestion.popularity;
        const successfulQueries = Math.round(suggestion.clickThroughRate * totalQueries);
        
        if (searchQuery.hasResults) {
          suggestion.clickThroughRate = (successfulQueries + 1) / (totalQueries + 1);
        } else {
          suggestion.clickThroughRate = successfulQueries / (totalQueries + 1);
        }

        await this.suggestionRepository.save(suggestion);
      }
    } catch (error) {
      this.logger.error(`Failed to update suggestion metrics: ${error.message}`);
    }
  }

  private calculateRelevanceScore(position: number, totalResults: number): number {
    // Higher score for better positions
    const positionScore = Math.max(0, 1 - (position - 1) / 10);
    
    // Bonus for results in a search with many results (indicates good matching)
    const resultCountBonus = Math.min(0.2, totalResults / 100);
    
    return Math.round((positionScore + resultCountBonus) * 1000) / 1000;
  }

  private async updatePersonalizationFromClick(
    userId: string, 
    click: SearchResultClick
  ): Promise<void> {
    try {
      const personalization = await this.personalizationRepository.findOne({
        where: { userId },
      });

      if (!personalization) return;

      const clickBehavior = personalization.searchBehavior?.click_behavior || {} as any;

      // Update average position clicked
      const currentAvg = clickBehavior.avg_position_clicked || 0;
      const totalClicks = (personalization.searchBehavior?.click_behavior as any)?.total_clicks || 0;
      
      clickBehavior.avg_position_clicked = 
        (currentAvg * totalClicks + click.position) / (totalClicks + 1);
      
      // Update time spent
      if (click.timeSpentSeconds > 0) {
        const currentTimeAvg = clickBehavior.time_spent_on_results || 0;
        clickBehavior.time_spent_on_results = 
          (currentTimeAvg * totalClicks + click.timeSpentSeconds) / (totalClicks + 1);
      }

      // Update total clicks
      (clickBehavior as any).total_clicks = totalClicks + 1;

      // Update preferred result types
      const preferredTypes = personalization.searchBehavior?.preferred_result_types || {};
      preferredTypes[click.resultType] = (preferredTypes[click.resultType] || 0) + 1;

      personalization.searchBehavior.click_behavior = clickBehavior;
      personalization.searchBehavior.preferred_result_types = preferredTypes;

      await this.personalizationRepository.save(personalization);
    } catch (error) {
      this.logger.error(`Failed to update personalization from click: ${error.message}`);
    }
  }

  private async calculateDailyMetrics(
    organizationId: string,
    date: Date,
    queries: SearchQuery[]
  ): Promise<SearchAnalytics> {
    const totalQueries = queries.length;
    const uniqueUsers = new Set(queries.map(q => q.userId).filter(Boolean)).size;
    const queriesWithResults = queries.filter(q => q.hasResults).length;
    const queriesWithoutResults = totalQueries - queriesWithResults;

    // Calculate clicks
    const allClicks = queries.reduce((acc, q) => acc + (q.resultClicks?.length || 0), 0);
    const avgCtr = totalQueries > 0 ? allClicks / totalQueries : 0;

    // Calculate average execution time
    const avgExecutionTime = queries.length > 0 
      ? queries.reduce((sum, q) => sum + (q.executionTimeMs || 0), 0) / queries.length 
      : 0;

    // Top queries
    const queryCount = queries.reduce((acc, q) => {
      const query = q.normalizedQuery || q.queryText.toLowerCase();
      acc[query] = (acc[query] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topQueries = Object.entries(queryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({
        query,
        count,
        ctr: 0, // Would calculate actual CTR
        avg_position: 0, // Would calculate actual average position
      }));

    // Query intent distribution
    const intentCount = queries.reduce((acc, q) => {
      const intent = q.searchIntent || 'other';
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const intentDistribution = {
      learning: ((intentCount.learning || 0) / totalQueries) * 100,
      research: ((intentCount.research || 0) / totalQueries) * 100,
      browsing: ((intentCount.browsing || 0) / totalQueries) * 100,
      specific: ((intentCount.specific || 0) / totalQueries) * 100,
      other: ((intentCount.other || 0) / totalQueries) * 100,
    };

    return this.searchAnalyticsRepository.create({
      organizationId,
      date,
      totalQueries,
      uniqueUsers,
      queriesWithResults,
      queriesWithoutResults,
      totalClicks: allClicks,
      averageClickThroughRate: avgCtr,
      averageExecutionTime,
      topQueries,
      queryIntentDistribution: intentDistribution,
      deviceBreakdown: {
        desktop: 70, // Would calculate from user context
        mobile: 25,
        tablet: 5,
      },
      performanceMetrics: {
        avg_response_time_ms: avgExecutionTime,
        p95_response_time_ms: avgExecutionTime * 1.5, // Estimated
        p99_response_time_ms: avgExecutionTime * 2, // Estimated
        error_rate: 0, // Would track actual errors
        timeout_rate: 0, // Would track actual timeouts
      },
    });
  }

  private async updatePreferencesFromActivity(
    personalization: SearchPersonalization,
    activity: any
  ): Promise<void> {
    const preferences = personalization.preferences;

    // Update preferences based on activity type
    if (activity.type === 'course_enrollment' && activity.category) {
      if (!preferences.preferred_categories.includes(activity.category)) {
        preferences.preferred_categories.push(activity.category);
      }
    }

    if (activity.type === 'content_view' && activity.difficulty) {
      if (!preferences.preferred_difficulty_levels.includes(activity.difficulty)) {
        preferences.preferred_difficulty_levels.push(activity.difficulty);
      }
    }

    if (activity.instructor && !preferences.preferred_instructors.includes(activity.instructor)) {
      preferences.preferred_instructors.push(activity.instructor);
    }

    // Limit array sizes
    preferences.preferred_categories = preferences.preferred_categories.slice(-10);
    preferences.preferred_instructors = preferences.preferred_instructors.slice(-5);
    preferences.preferred_difficulty_levels = preferences.preferred_difficulty_levels.slice(-3);
  }

  private calculateProfileCompleteness(personalization: SearchPersonalization): number {
    let completeness = 10; // Base score

    const preferences = personalization.preferences;
    
    if (preferences.preferred_categories.length > 0) completeness += 20;
    if (preferences.preferred_difficulty_levels.length > 0) completeness += 15;
    if (preferences.learning_goals.length > 0) completeness += 20;
    if (preferences.interests.length > 0) completeness += 15;
    if (preferences.preferred_instructors.length > 0) completeness += 10;
    if (preferences.preferred_content_types.length > 0) completeness += 10;

    return Math.min(completeness, 100);
  }

  private async generateInsightsFromAnalytics(analytics: SearchAnalytics[]): Promise<any> {
    if (analytics.length === 0) return {};

    const totalQueries = analytics.reduce((sum, a) => sum + a.totalQueries, 0);
    const avgCtr = analytics.reduce((sum, a) => sum + a.averageClickThroughRate, 0) / analytics.length;
    
    // Trend analysis
    const queryTrend = this.calculateTrend(analytics.map(a => a.totalQueries));
    const ctrTrend = this.calculateTrend(analytics.map(a => a.averageClickThroughRate));

    // Popular queries across timeframe
    const allTopQueries = analytics.flatMap(a => a.topQueries || []);
    const queryPopularity = allTopQueries.reduce((acc, q) => {
      acc[q.query] = (acc[q.query] || 0) + q.count;
      return acc;
    }, {} as Record<string, number>);

    const topQueries = Object.entries(queryPopularity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    return {
      overview: {
        totalQueries,
        averageCtr: avgCtr,
        queryTrend: queryTrend > 0 ? 'increasing' : queryTrend < 0 ? 'decreasing' : 'stable',
        ctrTrend: ctrTrend > 0 ? 'improving' : ctrTrend < 0 ? 'declining' : 'stable',
      },
      topQueries,
      recommendations: this.generateRecommendations(analytics),
      alerts: this.generateAlerts(analytics),
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const recent = values.slice(-7); // Last 7 data points
    const earlier = values.slice(-14, -7); // Previous 7 data points
    
    if (earlier.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, val) => sum + val, 0) / earlier.length;
    
    return ((recentAvg - earlierAvg) / earlierAvg) * 100;
  }

  private generateRecommendations(analytics: SearchAnalytics[]): string[] {
    const recommendations: string[] = [];
    
    const latestAnalytics = analytics[analytics.length - 1];
    
    if (latestAnalytics.averageClickThroughRate < 0.3) {
      recommendations.push('Consider improving search result relevance - CTR is below optimal');
    }
    
    if (latestAnalytics.queriesWithoutResults > latestAnalytics.totalQueries * 0.2) {
      recommendations.push('High number of queries with no results - consider expanding content coverage');
    }
    
    if (latestAnalytics.averageExecutionTime > 500) {
      recommendations.push('Search response time is slow - consider index optimization');
    }
    
    return recommendations;
  }

  private generateAlerts(analytics: SearchAnalytics[]): string[] {
    const alerts: string[] = [];
    
    const latestAnalytics = analytics[analytics.length - 1];
    
    if (latestAnalytics.performanceMetrics?.error_rate > 5) {
      alerts.push('High error rate detected in search queries');
    }
    
    if (latestAnalytics.averageExecutionTime > 1000) {
      alerts.push('Search response time is critically slow');
    }
    
    return alerts;
  }
}