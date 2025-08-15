import { Column, Entity, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { EnrollmentStatus } from '@edutech-lms/common';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity('enrollments')
@Unique(['userId', 'courseId'])
export class Enrollment extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  courseId: string;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  status: EnrollmentStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  enrolledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progress: number;

  @Column({ type: 'int', default: 0 })
  timeSpent: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  @Column('json', { nullable: true })
  progressData: {
    completedLessons: string[];
    currentLesson: string;
    quizScores: Array<{
      lessonId: string;
      score: number;
      attempts: number;
    }>;
  };

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating: number;

  @Column('text', { nullable: true })
  review: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  paidAmount: number;

  @Column({ type: 'timestamp', nullable: true })
  paymentDate: Date;

  @ManyToOne(() => User, user => user.enrollments)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Course, course => course.enrollments)
  @JoinColumn({ name: 'courseId' })
  course: Course;
}