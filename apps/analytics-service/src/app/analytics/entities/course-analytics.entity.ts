import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('course_analytics')
@Index(['courseId', 'date'])
@Index(['date'])
export class CourseAnalyticsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  courseId: string;

  @Column('date')
  date: Date;

  @Column('int', { default: 0 })
  enrollments: number;

  @Column('int', { default: 0 })
  completions: number;

  @Column('int', { default: 0 })
  dropouts: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  completionRate: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  avgProgress: number;

  @Column('int', { default: 0 })
  totalViews: number;

  @Column('int', { default: 0 })
  uniqueViews: number;

  @Column('int', { default: 0 })
  totalWatchTime: number; // in minutes

  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  avgRating: number;

  @Column('int', { default: 0 })
  totalReviews: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  revenue: number;

  @Column('json', { nullable: true })
  engagementMetrics: any;

  @Column('json', { nullable: true })
  dropoffPoints: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}