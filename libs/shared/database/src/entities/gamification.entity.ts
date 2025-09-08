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

export enum AchievementType {
  COMPLETION = 'completion',
  STREAK = 'streak',
  SKILL = 'skill',
  SOCIAL = 'social',
  TIME = 'time',
  ASSESSMENT = 'assessment',
  MILESTONE = 'milestone',
  SPECIAL = 'special',
}

export enum AchievementRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export enum BadgeCategory {
  LEARNER = 'learner',
  ACHIEVER = 'achiever',
  EXPLORER = 'explorer',
  COLLABORATOR = 'collaborator',
  EXPERT = 'expert',
  LEADER = 'leader',
  PIONEER = 'pioneer',
}

export enum QuestStatus {
  LOCKED = 'locked',
  AVAILABLE = 'available',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

export enum LeaderboardType {
  GLOBAL = 'global',
  ORGANIZATION = 'organization',
  COURSE = 'course',
  SKILL = 'skill',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ALL_TIME = 'all_time',
}

@Entity('user_points')
@Index(['userId'])
@Index(['organizationId'])
@Index(['pointType'])
export class UserPoints {
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

  @Column('varchar', { length: 50 })
  pointType: string; // learning, social, bonus, achievement

  @Column('int', { default: 0 })
  currentPoints: number;

  @Column('int', { default: 0 })
  lifetimePoints: number;

  @Column('int', { default: 1 })
  currentLevel: number;

  @Column('int', { default: 0 })
  pointsToNextLevel: number;

  @Column('jsonb', { nullable: true })
  pointsHistory?: Array<{
    date: string;
    points: number;
    reason: string;
    source: string;
  }>;

  @Column('jsonb', { nullable: true })
  levelBenefits?: {
    unlocked_features?: string[];
    badges?: string[];
    multipliers?: Record<string, number>;
    special_access?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('achievements')
@Index(['organizationId'])
@Index(['type'])
@Index(['category'])
@Index(['isActive'])
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('text')
  description: string;

  @Column('varchar', { length: 500, nullable: true })
  iconUrl?: string;

  @Column({
    type: 'enum',
    enum: AchievementType,
  })
  type: AchievementType;

  @Column({
    type: 'enum',
    enum: BadgeCategory,
  })
  category: BadgeCategory;

  @Column({
    type: 'enum',
    enum: AchievementRarity,
    default: AchievementRarity.COMMON,
  })
  rarity: AchievementRarity;

  @Column('jsonb')
  criteria: {
    type: string;
    target: number;
    conditions?: Record<string, any>;
    time_limit?: number; // days
    requires_consecutive?: boolean;
    specific_content?: string[];
    specific_courses?: string[];
    skill_level?: string;
    assessment_score?: number;
  };

  @Column('jsonb')
  rewards: {
    points: number;
    badges?: string[];
    unlocks?: string[];
    titles?: string[];
    special_access?: string[];
    certificates?: boolean;
  };

  @Column('int', { default: 0 })
  pointsValue: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isSecret: boolean; // Hidden until unlocked

  @Column('int', { default: 0 })
  totalEarned: number; // How many users earned this

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  rarityPercentage: number; // What % of users have this

  @Column('varchar', { length: 100, nullable: true })
  prerequisiteAchievement?: string; // Must have this achievement first

  @Column({ nullable: true })
  availableFrom?: Date;

  @Column({ nullable: true })
  availableUntil?: Date;

  @OneToMany(() => UserAchievement, userAchievement => userAchievement.achievement)
  userAchievements: UserAchievement[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('user_achievements')
@Index(['userId'])
@Index(['achievementId'])
@Index(['earnedAt'])
export class UserAchievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  achievementId: string;

  @ManyToOne(() => Achievement, achievement => achievement.userAchievements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'achievementId' })
  achievement: Achievement;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  progress: number; // 0-100

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ nullable: true })
  earnedAt?: Date;

  @Column({ nullable: true })
  notifiedAt?: Date;

  @Column('jsonb', { nullable: true })
  progressData?: {
    current_value: number;
    target_value: number;
    milestones_reached: string[];
    tracking_data: Record<string, any>;
  };

  @Column('jsonb', { nullable: true })
  earnedRewards?: {
    points_awarded: number;
    badges_unlocked: string[];
    features_unlocked: string[];
    titles_earned: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('badges')
@Index(['organizationId'])
@Index(['category'])
@Index(['isActive'])
export class Badge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('text')
  description: string;

  @Column('varchar', { length: 500, nullable: true })
  iconUrl?: string;

  @Column({
    type: 'enum',
    enum: BadgeCategory,
  })
  category: BadgeCategory;

  @Column('varchar', { length: 50, nullable: true })
  color?: string; // Hex color for badge

  @Column('jsonb', { nullable: true })
  design?: {
    shape: string;
    background_color: string;
    border_color: string;
    text_color: string;
    icon_style: string;
    animation?: string;
  };

  @Column('jsonb')
  requirements: {
    achievements?: string[]; // Achievement IDs required
    points?: number; // Minimum points required
    level?: number; // Minimum level required
    courses_completed?: number;
    time_spent?: number; // minutes
    streak_days?: number;
    social_actions?: number;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column('int', { default: 0 })
  totalAwarded: number;

  @OneToMany(() => UserBadge, userBadge => userBadge.badge)
  userBadges: UserBadge[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('user_badges')
@Index(['userId'])
@Index(['badgeId'])
@Index(['earnedAt'])
export class UserBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  badgeId: string;

  @ManyToOne(() => Badge, badge => badge.userBadges, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'badgeId' })
  badge: Badge;

  @Column()
  earnedAt: Date;

  @Column({ default: false })
  isDisplayed: boolean; // User chooses to display this badge

  @Column({ nullable: true })
  displayOrder?: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('quests')
@Index(['organizationId'])
@Index(['status'])
@Index(['difficulty'])
export class Quest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('varchar', { length: 100 })
  title: string;

  @Column('text')
  description: string;

  @Column('text', { nullable: true })
  lore?: string; // Story/background for the quest

  @Column('varchar', { length: 500, nullable: true })
  imageUrl?: string;

  @Column('varchar', { length: 50 })
  difficulty: string; // easy, medium, hard, epic

  @Column('int', { default: 1 })
  estimatedDays: number;

  @Column('jsonb')
  objectives: Array<{
    id: string;
    description: string;
    type: string; // complete_course, earn_points, streak, assessment
    target: number;
    current?: number;
    completed: boolean;
    reward_points: number;
  }>;

  @Column('jsonb')
  prerequisites: {
    level?: number;
    achievements?: string[];
    quests_completed?: string[];
    courses_completed?: string[];
    points?: number;
  };

  @Column('jsonb')
  rewards: {
    points: number;
    experience: number;
    badges?: string[];
    achievements?: string[];
    unlocks?: string[];
    title?: string;
    certificate?: boolean;
  };

  @Column({
    type: 'enum',
    enum: QuestStatus,
    default: QuestStatus.AVAILABLE,
  })
  status: QuestStatus;

  @Column({ nullable: true })
  startsAt?: Date;

  @Column({ nullable: true })
  endsAt?: Date;

  @Column({ default: false })
  isRepeatable: boolean;

  @Column('int', { nullable: true })
  repeatCooldownDays?: number;

  @Column('int', { default: 0 })
  participantCount: number;

  @Column('int', { default: 0 })
  completionCount: number;

  @OneToMany(() => UserQuest, userQuest => userQuest.quest)
  userQuests: UserQuest[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('user_quests')
@Index(['userId'])
@Index(['questId'])
@Index(['status'])
export class UserQuest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  questId: string;

  @ManyToOne(() => Quest, quest => quest.userQuests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questId' })
  quest: Quest;

  @Column({
    type: 'enum',
    enum: QuestStatus,
    default: QuestStatus.AVAILABLE,
  })
  status: QuestStatus;

  @Column({ nullable: true })
  startedAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  overallProgress: number; // 0-100

  @Column('jsonb', { nullable: true })
  objectiveProgress?: Record<string, {
    current: number;
    target: number;
    completed: boolean;
    completed_at?: string;
  }>;

  @Column('jsonb', { nullable: true })
  earnedRewards?: {
    points: number;
    experience: number;
    badges: string[];
    achievements: string[];
    unlocks: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('leaderboards')
@Index(['organizationId'])
@Index(['type'])
@Index(['isActive'])
export class Leaderboard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: LeaderboardType,
  })
  type: LeaderboardType;

  @Column('varchar', { length: 50 })
  metric: string; // points, courses_completed, streak_days, assessment_score

  @Column('varchar', { length: 20 })
  timeframe: string; // daily, weekly, monthly, all_time

  @Column('jsonb', { nullable: true })
  filters?: {
    course_ids?: string[];
    skill_categories?: string[];
    user_roles?: string[];
    min_level?: number;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  isPublic: boolean;

  @Column('int', { default: 100 })
  maxEntries: number;

  @Column({ nullable: true })
  lastUpdatedAt?: Date;

  @Column('jsonb', { nullable: true })
  prizes?: Array<{
    rank: number;
    reward: {
      points?: number;
      badges?: string[];
      achievements?: string[];
      titles?: string[];
      special_access?: string[];
    };
  }>;

  @OneToMany(() => LeaderboardEntry, entry => entry.leaderboard)
  entries: LeaderboardEntry[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('leaderboard_entries')
@Index(['leaderboardId'])
@Index(['userId'])
@Index(['rank'])
@Index(['score'])
export class LeaderboardEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  leaderboardId: string;

  @ManyToOne(() => Leaderboard, leaderboard => leaderboard.entries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leaderboardId' })
  leaderboard: Leaderboard;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('int')
  rank: number;

  @Column('decimal', { precision: 15, scale: 2 })
  score: number;

  @Column('int', { nullable: true })
  previousRank?: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  previousScore?: number;

  @Column('jsonb', { nullable: true })
  metadata?: {
    streak_days?: number;
    courses_completed?: number;
    achievements_earned?: number;
    time_spent?: number;
    last_activity?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('user_streaks')
@Index(['userId'])
@Index(['streakType'])
@Index(['isActive'])
export class UserStreak {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar', { length: 50 })
  streakType: string; // daily_login, learning_session, course_completion

  @Column('int', { default: 0 })
  currentStreak: number;

  @Column('int', { default: 0 })
  longestStreak: number;

  @Column({ nullable: true })
  lastActivityDate?: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column('jsonb', { nullable: true })
  streakData?: {
    milestones_reached: number[];
    bonus_points_earned: number;
    achievements_unlocked: string[];
    streak_multiplier: number;
  };

  @Column('simple-array', { nullable: true })
  activityDates?: string[]; // Store last 30 days of activity

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('gamification_events')
@Index(['userId'])
@Index(['eventType'])
@Index(['createdAt'])
export class GamificationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar', { length: 100 })
  eventType: string; // achievement_earned, level_up, badge_unlocked, quest_completed

  @Column('jsonb')
  eventData: {
    points_awarded?: number;
    level_reached?: number;
    achievement_id?: string;
    badge_id?: string;
    quest_id?: string;
    streak_milestone?: number;
    leaderboard_rank?: number;
    rewards?: Record<string, any>;
  };

  @Column('varchar', { length: 100, nullable: true })
  sourceType?: string; // course, assessment, content, social

  @Column('uuid', { nullable: true })
  sourceId?: string;

  @Column({ default: false })
  isNotified: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('user_titles')
@Index(['userId'])
@Index(['isActive'])
export class UserTitle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar', { length: 100 })
  title: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column('varchar', { length: 50, nullable: true })
  color?: string; // Display color for title

  @Column()
  earnedAt: Date;

  @Column({ default: false })
  isActive: boolean; // Currently displayed title

  @Column('varchar', { length: 100, nullable: true })
  earnedFrom?: string; // What achievement/quest gave this title

  @CreateDateColumn()
  createdAt: Date;
}