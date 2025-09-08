import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('event_tracking')
@Index(['eventType', 'timestamp'])
@Index(['userId', 'timestamp'])
@Index(['timestamp'])
export class EventTrackingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 100 })
  eventType: string; // login, logout, course_view, lesson_complete, quiz_start, etc.

  @Column('uuid', { nullable: true })
  userId: string;

  @Column('uuid', { nullable: true })
  sessionId: string;

  @Column('uuid', { nullable: true })
  courseId: string;

  @Column('uuid', { nullable: true })
  lessonId: string;

  @Column('varchar', { length: 255, nullable: true })
  pagePath: string;

  @Column('varchar', { length: 255, nullable: true })
  referrer: string;

  @Column('varchar', { length: 255, nullable: true })
  userAgent: string;

  @Column('varchar', { length: 45, nullable: true })
  ipAddress: string;

  @Column('varchar', { length: 100, nullable: true })
  deviceType: string; // desktop, mobile, tablet

  @Column('varchar', { length: 100, nullable: true })
  browser: string;

  @Column('varchar', { length: 100, nullable: true })
  operatingSystem: string;

  @Column('json', { nullable: true })
  eventData: any; // additional event-specific data

  @Column('int', { nullable: true })
  duration: number; // in seconds for timed events

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;
}