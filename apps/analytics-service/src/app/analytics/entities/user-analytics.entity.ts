import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('user_analytics')
@Index(['userId', 'date'])
@Index(['date'])
export class UserAnalyticsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('date')
  date: Date;

  @Column('int', { default: 0 })
  loginCount: number;

  @Column('int', { default: 0 })
  sessionDuration: number; // in minutes

  @Column('int', { default: 0 })
  pageViews: number;

  @Column('int', { default: 0 })
  coursesViewed: number;

  @Column('int', { default: 0 })
  lessonsCompleted: number;

  @Column('int', { default: 0 })
  quizzesTaken: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  avgQuizScore: number;

  @Column('int', { default: 0 })
  forumPosts: number;

  @Column('int', { default: 0 })
  certificatesEarned: number;

  @Column('json', { nullable: true })
  activityLog: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}