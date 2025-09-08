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

export enum RecommendationType {
  CONTENT_BASED = 'content_based',
  COLLABORATIVE = 'collaborative',
  HYBRID = 'hybrid',
  TRENDING = 'trending',
  CAREER_PATH = 'career_path',
  SKILL_GAP = 'skill_gap',
  CONTEXTUAL = 'contextual',
}

export enum RecommendationStatus {
  ACTIVE = 'active',
  CLICKED = 'clicked',
  ENROLLED = 'enrolled',
  DISMISSED = 'dismissed',
  EXPIRED = 'expired',
}

export enum LearningStyle {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  READING = 'reading',
  KINESTHETIC = 'kinesthetic',
  MIXED = 'mixed',
}

export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

@Entity('user_learning_profiles')
@Index(['organizationId'])
@Index(['userId'])
export class UserLearningProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('jsonb')
  interests: {
    topics: string[];
    categories: string[];
    skills: string[];
    career_goals: string[];
  };

  @Column({
    type: 'enum',
    enum: LearningStyle,
    default: LearningStyle.MIXED,
  })
  learningStyle: LearningStyle;

  @Column('jsonb')
  preferences: {
    content_types: string[]; // video, text, interactive, etc.
    duration_preference: 'short' | 'medium' | 'long';
    difficulty_preference: SkillLevel;
    language: string;
    timezone: string;
    available_hours: {
      weekday: number; // hours per day
      weekend: number;
    };
  };

  @Column('jsonb')
  skillLevels: Record<string, {
    level: SkillLevel;
    confidence: number; // 0-1
    last_assessed: string;
    evidence_count: number;
  }>;

  @Column('jsonb')
  learningBehavior: {
    session_patterns: {
      preferred_times: string[];
      average_duration: number;
      frequency_per_week: number;
    };
    completion_rate: number;
    engagement_score: number;
    help_seeking_frequency: number;
    social_learning_preference: number; // 0-1
  };

  @Column('jsonb', { nullable: true })
  careerPath?: {
    current_role: string;
    target_role: string;
    industry: string;
    experience_years: number;
    required_skills: string[];
    skill_gaps: string[];
  };

  @Column({ nullable: true })
  lastProfiledAt?: Date;

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  profileCompleteness: number; // 0-1

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('content_features')
@Index(['contentId'])
@Index(['organizationId'])
export class ContentFeatures {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid')
  contentId: string;

  @ManyToOne(() => Content, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId' })
  content: Content;

  @Column('jsonb')
  topics: string[]; // extracted topics/keywords

  @Column('jsonb')
  skills: string[]; // skills taught/required

  @Column('jsonb')
  categories: string[]; // content categories

  @Column({
    type: 'enum',
    enum: SkillLevel,
    default: SkillLevel.BEGINNER,
  })
  difficultyLevel: SkillLevel;

  @Column('jsonb')
  prerequisites: string[]; // required prior knowledge

  @Column('jsonb')
  learningObjectives: string[];

  @Column('jsonb')
  contentCharacteristics: {
    content_type: string; // video, text, interactive, etc.
    duration_minutes: number;
    interactivity_level: number; // 0-1
    multimedia_richness: number; // 0-1
    practical_exercises: boolean;
    assessments_included: boolean;
  };

  @Column('jsonb')
  languageFeatures: {
    primary_language: string;
    reading_level: number; // grade level
    technical_complexity: number; // 0-1
    jargon_density: number; // 0-1
  };

  @Column('jsonb')
  engagement: {
    average_rating: number;
    completion_rate: number;
    engagement_score: number;
    time_to_complete: number;
  };

  @Column('jsonb', { nullable: true })
  aiExtractedFeatures?: {
    key_concepts: string[];
    sentiment_score: number;
    readability_score: number;
    conceptual_complexity: number;
    practical_application_score: number;
  };

  @Column({ nullable: true })
  lastAnalyzedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('recommendation_models')
@Index(['organizationId'])
@Index(['modelType'])
@Index(['isActive'])
export class RecommendationModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('varchar', { length: 100 })
  modelName: string;

  @Column({
    type: 'enum',
    enum: RecommendationType,
  })
  modelType: RecommendationType;

  @Column('text')
  description: string;

  @Column('jsonb')
  configuration: {
    algorithm: string;
    parameters: Record<string, any>;
    feature_weights: Record<string, number>;
    similarity_threshold: number;
    min_confidence: number;
  };

  @Column('jsonb')
  trainingData: {
    user_interactions: number;
    content_items: number;
    training_period_days: number;
    last_training: string;
    data_quality_score: number;
  };

  @Column('jsonb')
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    click_through_rate: number;
    conversion_rate: number;
    user_satisfaction: number;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column('varchar', { length: 50, default: '1.0.0' })
  version: string;

  @Column({ nullable: true })
  lastTrainedAt?: Date;

  @Column({ nullable: true })
  nextTrainingAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('user_recommendations')
@Index(['userId'])
@Index(['organizationId'])
@Index(['status'])
@Index(['recommendationType'])
@Index(['createdAt'])
export class UserRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  contentId: string;

  @ManyToOne(() => Content, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId' })
  content: Content;

  @Column('uuid', { nullable: true })
  courseId?: string;

  @ManyToOne(() => Course, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @Column('uuid')
  modelId: string;

  @ManyToOne(() => RecommendationModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'modelId' })
  model: RecommendationModel;

  @Column({
    type: 'enum',
    enum: RecommendationType,
  })
  recommendationType: RecommendationType;

  @Column('decimal', { precision: 5, scale: 4 })
  confidenceScore: number; // 0-1

  @Column('decimal', { precision: 5, scale: 4 })
  relevanceScore: number; // 0-1

  @Column('jsonb')
  reasoning: {
    primary_factors: string[];
    user_similarity_matches?: string[]; // similar user IDs
    content_similarity_matches?: string[]; // similar content IDs
    skill_gap_addressed?: string[];
    career_alignment?: string;
    contextual_factors?: string[];
  };

  @Column('jsonb')
  metadata: {
    recommendation_context: string; // where it was shown
    personalization_level: number; // 0-1
    novelty_score: number; // 0-1
    diversity_contribution: number; // 0-1
    temporal_relevance: number; // 0-1
  };

  @Column({
    type: 'enum',
    enum: RecommendationStatus,
    default: RecommendationStatus.ACTIVE,
  })
  status: RecommendationStatus;

  @Column('int', { default: 0 })
  impressions: number; // times shown to user

  @Column({ nullable: true })
  viewedAt?: Date;

  @Column({ nullable: true })
  clickedAt?: Date;

  @Column({ nullable: true })
  enrolledAt?: Date;

  @Column({ nullable: true })
  dismissedAt?: Date;

  @Column({ nullable: true })
  expiresAt?: Date;

  @Column('jsonb', { nullable: true })
  userFeedback?: {
    rating: number; // 1-5
    relevance: number; // 1-5
    helpful: boolean;
    reason_dismissed?: string;
    comments?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('recommendation_interactions')
@Index(['userId'])
@Index(['recommendationId'])
@Index(['interactionType'])
@Index(['createdAt'])
export class RecommendationInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  recommendationId: string;

  @ManyToOne(() => UserRecommendation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recommendationId' })
  recommendation: UserRecommendation;

  @Column('varchar', { length: 50 })
  interactionType: string; // view, click, dismiss, enroll, rate, share

  @Column('jsonb', { nullable: true })
  interactionData?: {
    duration?: number; // time spent viewing
    scroll_depth?: number; // how much of content was viewed
    device_type?: string;
    platform?: string;
    referrer?: string;
    context?: string; // where interaction happened
  };

  @Column('varchar', { length: 45, nullable: true })
  ipAddress?: string;

  @Column('varchar', { length: 500, nullable: true })
  userAgent?: string;

  @Column('varchar', { length: 100, nullable: true })
  sessionId?: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('content_similarity_matrix')
@Index(['contentId1'])
@Index(['contentId2'])
@Index(['similarityScore'])
export class ContentSimilarityMatrix {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  contentId1: string;

  @ManyToOne(() => Content, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId1' })
  content1: Content;

  @Column('uuid')
  contentId2: string;

  @ManyToOne(() => Content, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId2' })
  content2: Content;

  @Column('decimal', { precision: 5, scale: 4 })
  similarityScore: number; // 0-1

  @Column('jsonb')
  similarityFactors: {
    topic_similarity: number;
    skill_similarity: number;
    difficulty_similarity: number;
    content_type_similarity: number;
    user_behavior_similarity: number;
  };

  @Column('varchar', { length: 100 })
  algorithmUsed: string;

  @Column({ nullable: true })
  lastCalculatedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('user_similarity_matrix')
@Index(['userId1'])
@Index(['userId2'])
@Index(['similarityScore'])
export class UserSimilarityMatrix {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId1: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId1' })
  user1: User;

  @Column('uuid')
  userId2: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId2' })
  user2: User;

  @Column('decimal', { precision: 5, scale: 4 })
  similarityScore: number; // 0-1

  @Column('jsonb')
  similarityFactors: {
    interest_similarity: number;
    behavior_similarity: number;
    skill_level_similarity: number;
    learning_style_similarity: number;
    career_path_similarity: number;
  };

  @Column('varchar', { length: 100 })
  algorithmUsed: string;

  @Column({ nullable: true })
  lastCalculatedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('recommendation_experiments')
@Index(['organizationId'])
@Index(['experimentName'])
@Index(['isActive'])
export class RecommendationExperiment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('varchar', { length: 100 })
  experimentName: string;

  @Column('text')
  description: string;

  @Column('jsonb')
  configuration: {
    control_model_id: string;
    test_model_ids: string[];
    traffic_split: Record<string, number>; // model_id -> percentage
    target_metrics: string[];
    min_sample_size: number;
    max_duration_days: number;
  };

  @Column('jsonb')
  targetAudience: {
    user_segments?: string[];
    skill_levels?: SkillLevel[];
    learning_styles?: LearningStyle[];
    min_activity_level?: number;
  };

  @Column({ default: false })
  isActive: boolean;

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  endedAt?: Date;

  @Column('jsonb', { nullable: true })
  results?: {
    participants: number;
    metrics: Record<string, {
      control: number;
      test_variants: Record<string, number>;
      statistical_significance: number;
    }>;
    winner?: string;
    confidence_level: number;
    recommendations: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}