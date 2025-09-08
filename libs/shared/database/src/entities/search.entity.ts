import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { Course } from './course.entity';
import { Content } from './content.entity';

export enum SearchIndexType {
  COURSES = 'courses',
  CONTENT = 'content',
  USERS = 'users',
  ASSESSMENTS = 'assessments',
  FORUMS = 'forums',
  VIDEOS = 'videos',
  DOCUMENTS = 'documents',
}

export enum SearchSuggestionType {
  QUERY = 'query',
  CATEGORY = 'category',
  INSTRUCTOR = 'instructor',
  TOPIC = 'topic',
  SKILL = 'skill',
  FILTER = 'filter',
}

export enum SearchResultType {
  COURSE = 'course',
  LESSON = 'lesson',
  VIDEO = 'video',
  DOCUMENT = 'document',
  ASSESSMENT = 'assessment',
  USER = 'user',
  FORUM_POST = 'forum_post',
}

export enum SearchFilterType {
  CATEGORY = 'category',
  DIFFICULTY = 'difficulty',
  DURATION = 'duration',
  INSTRUCTOR = 'instructor',
  RATING = 'rating',
  PRICE = 'price',
  LANGUAGE = 'language',
  DATE_RANGE = 'date_range',
  CONTENT_TYPE = 'content_type',
  COMPLETION_STATUS = 'completion_status',
}

@Entity('search_indices')
@Index(['organizationId'])
@Index(['indexType'])
@Index(['isActive'])
@Index(['lastSyncedAt'])
export class SearchIndex {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({
    type: 'enum',
    enum: SearchIndexType,
  })
  indexType: SearchIndexType;

  @Column('varchar', { length: 255 })
  indexName: string; // Elasticsearch index name

  @Column('varchar', { length: 255 })
  aliasName: string; // Elasticsearch alias name

  @Column('jsonb')
  mapping: {
    properties: Record<string, any>;
    settings?: {
      number_of_shards?: number;
      number_of_replicas?: number;
      analysis?: Record<string, any>;
    };
    dynamic_templates?: Array<Record<string, any>>;
  };

  @Column('jsonb', { nullable: true })
  configuration?: {
    sync_frequency?: string; // cron expression
    batch_size?: number;
    filters?: Record<string, any>;
    transformations?: Array<{
      field: string;
      type: string;
      configuration: Record<string, any>;
    }>;
    boosting?: Record<string, number>; // Field boosting values
    analyzers?: Record<string, any>;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isRealtimeSync: boolean;

  @Column('int', { default: 0 })
  documentCount: number;

  @Column({ nullable: true })
  lastSyncedAt?: Date;

  @Column('jsonb', { nullable: true })
  syncStats?: {
    total_documents: number;
    successful_syncs: number;
    failed_syncs: number;
    last_error?: string;
    sync_duration_ms: number;
    throughput_docs_per_sec: number;
  };

  @Column('simple-array', { nullable: true })
  tags?: string[];

  @OneToMany(() => SearchQuery, searchQuery => searchQuery.searchIndex)
  searchQueries: SearchQuery[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('search_queries')
@Index(['userId'])
@Index(['organizationId'])
@Index(['searchIndexId'])
@Index(['queryText'])
@Index(['executedAt'])
@Index(['hasResults'])
export class SearchQuery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  userId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid')
  searchIndexId: string;

  @ManyToOne(() => SearchIndex, searchIndex => searchIndex.searchQueries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'searchIndexId' })
  searchIndex: SearchIndex;

  @Column('text')
  queryText: string;

  @Column('varchar', { length: 255, nullable: true })
  normalizedQuery?: string; // Processed/normalized version for analytics

  @Column('jsonb', { nullable: true })
  filters?: Record<string, any>;

  @Column('jsonb', { nullable: true })
  facets?: Record<string, any>;

  @Column('jsonb', { nullable: true })
  sorting?: Array<{
    field: string;
    order: 'asc' | 'desc';
    boost?: number;
  }>;

  @Column('int', { default: 0 })
  resultsCount: number;

  @Column({ default: false })
  hasResults: boolean;

  @Column('decimal', { precision: 8, scale: 3, nullable: true })
  executionTimeMs?: number;

  @Column('int', { default: 0 })
  clickThroughCount: number; // How many results were clicked

  @Column('jsonb', { nullable: true })
  resultMetrics?: {
    total_hits: number;
    max_score: number;
    took_ms: number;
    timed_out: boolean;
    shards_info: {
      total: number;
      successful: number;
      skipped: number;
      failed: number;
    };
  };

  @Column('jsonb', { nullable: true })
  userContext?: {
    user_agent?: string;
    ip_address?: string;
    location?: {
      country?: string;
      city?: string;
      timezone?: string;
    };
    session_id?: string;
    referrer?: string;
    device_type?: string;
  };

  @Column('varchar', { length: 50, nullable: true })
  searchIntent?: string; // learning, research, browsing, specific

  @Column({ nullable: true })
  executedAt: Date;

  @OneToMany(() => SearchResultClick, click => click.searchQuery)
  resultClicks: SearchResultClick[];

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('search_result_clicks')
@Index(['searchQueryId'])
@Index(['resultId'])
@Index(['clickedAt'])
@Index(['position'])
export class SearchResultClick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  searchQueryId: string;

  @ManyToOne(() => SearchQuery, query => query.resultClicks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'searchQueryId' })
  searchQuery: SearchQuery;

  @Column('varchar', { length: 255 })
  resultId: string; // ID of the clicked result

  @Column({
    type: 'enum',
    enum: SearchResultType,
  })
  resultType: SearchResultType;

  @Column('varchar', { length: 500 })
  resultTitle: string;

  @Column('varchar', { length: 1000, nullable: true })
  resultUrl?: string;

  @Column('int')
  position: number; // Position in search results (1-based)

  @Column('decimal', { precision: 5, scale: 3, nullable: true })
  relevanceScore?: number;

  @Column('jsonb', { nullable: true })
  resultMetadata?: {
    category?: string;
    author?: string;
    tags?: string[];
    rating?: number;
    difficulty?: string;
    duration?: number;
    popularity_score?: number;
  };

  @Column('int', { default: 0 })
  timeSpentSeconds: number; // Time spent on result page

  @Column({ default: false })
  converted: boolean; // Whether click led to enrollment, purchase, etc.

  @Column({ nullable: true })
  clickedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('search_suggestions')
@Index(['organizationId'])
@Index(['suggestionType'])
@Index(['isActive'])
@Index(['popularity'])
export class SearchSuggestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({
    type: 'enum',
    enum: SearchSuggestionType,
  })
  suggestionType: SearchSuggestionType;

  @Column('varchar', { length: 255 })
  text: string;

  @Column('varchar', { length: 255, nullable: true })
  displayText?: string; // Formatted version for display

  @Column('varchar', { length: 500, nullable: true })
  description?: string;

  @Column('int', { default: 0 })
  popularity: number; // How often this suggestion is used

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  clickThroughRate: number; // CTR for this suggestion

  @Column('jsonb', { nullable: true })
  metadata?: {
    category?: string;
    tags?: string[];
    synonyms?: string[];
    related_terms?: string[];
    context?: string;
    target_audience?: string[];
  };

  @Column('simple-array', { nullable: true })
  relatedSuggestions?: string[]; // IDs of related suggestions

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPromoted: boolean; // Manually promoted suggestions

  @Column('int', { nullable: true })
  displayOrder?: number;

  @Column({ nullable: true })
  validFrom?: Date;

  @Column({ nullable: true })
  validUntil?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('search_filters')
@Index(['organizationId'])
@Index(['filterType'])
@Index(['isActive'])
export class SearchFilter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({
    type: 'enum',
    enum: SearchFilterType,
  })
  filterType: SearchFilterType;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 255 })
  displayName: string;

  @Column('varchar', { length: 500, nullable: true })
  description?: string;

  @Column('jsonb')
  configuration: {
    field_mapping: string; // Elasticsearch field name
    data_type: 'string' | 'number' | 'date' | 'boolean' | 'range';
    widget_type: 'checkbox' | 'radio' | 'dropdown' | 'range_slider' | 'date_picker';
    options?: Array<{
      value: string | number;
      label: string;
      count?: number;
      description?: string;
    }>;
    range_config?: {
      min: number;
      max: number;
      step?: number;
      unit?: string;
    };
    default_value?: any;
    multiple_selection?: boolean;
    is_faceted?: boolean; // Whether to show counts
  };

  @Column('int', { default: 0 })
  displayOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isRequired: boolean;

  @Column('simple-array', { nullable: true })
  applicableIndices?: string[]; // Which search indices this filter applies to

  @Column('jsonb', { nullable: true })
  validationRules?: {
    min_length?: number;
    max_length?: number;
    pattern?: string;
    custom_validation?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('search_analytics')
@Index(['organizationId'])
@Index(['date'])
@Index(['searchIndexId'])
export class SearchAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid', { nullable: true })
  searchIndexId?: string;

  @ManyToOne(() => SearchIndex, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'searchIndexId' })
  searchIndex?: SearchIndex;

  @Column('date')
  date: Date;

  @Column('int', { default: 0 })
  totalQueries: number;

  @Column('int', { default: 0 })
  uniqueUsers: number;

  @Column('int', { default: 0 })
  queriesWithResults: number;

  @Column('int', { default: 0 })
  queriesWithoutResults: number;

  @Column('int', { default: 0 })
  totalClicks: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  averageClickThroughRate: number;

  @Column('decimal', { precision: 8, scale: 3, default: 0 })
  averageExecutionTime: number;

  @Column('jsonb', { nullable: true })
  topQueries?: Array<{
    query: string;
    count: number;
    ctr: number;
    avg_position: number;
  }>;

  @Column('jsonb', { nullable: true })
  topResultsClicked?: Array<{
    result_id: string;
    result_title: string;
    result_type: string;
    clicks: number;
    unique_users: number;
  }>;

  @Column('jsonb', { nullable: true })
  queryIntentDistribution?: {
    learning: number;
    research: number;
    browsing: number;
    specific: number;
    other: number;
  };

  @Column('jsonb', { nullable: true })
  deviceBreakdown?: {
    desktop: number;
    mobile: number;
    tablet: number;
  };

  @Column('jsonb', { nullable: true })
  performanceMetrics?: {
    avg_response_time_ms: number;
    p95_response_time_ms: number;
    p99_response_time_ms: number;
    error_rate: number;
    timeout_rate: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('search_personalization')
@Index(['userId'])
@Index(['organizationId'])
@Index(['lastUpdated'])
export class SearchPersonalization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('jsonb')
  preferences: {
    preferred_categories: string[];
    preferred_instructors: string[];
    preferred_difficulty_levels: string[];
    preferred_content_types: string[];
    preferred_languages: string[];
    learning_goals: string[];
    interests: string[];
  };

  @Column('jsonb', { nullable: true })
  searchBehavior?: {
    frequently_used_filters: Record<string, number>;
    common_query_patterns: string[];
    preferred_result_types: Record<string, number>;
    click_behavior: {
      avg_position_clicked: number;
      time_spent_on_results: number;
      conversion_rate: number;
    };
    search_frequency: {
      queries_per_week: number;
      most_active_hours: number[];
      most_active_days: string[];
    };
  };

  @Column('jsonb', { nullable: true })
  boostingRules?: Array<{
    field: string;
    values: string[];
    boost_factor: number;
    condition?: string;
  }>;

  @Column('jsonb', { nullable: true })
  hiddenResults?: Array<{
    result_id: string;
    result_type: string;
    reason: string;
    hidden_at: string;
  }>;

  @Column({ nullable: true })
  lastUpdated?: Date;

  @Column('int', { default: 0 })
  profileCompleteness: number; // 0-100

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}