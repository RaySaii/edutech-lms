import { Column, Entity, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CourseStatus, CourseLevel } from '@edutech-lms/common';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Enrollment } from './enrollment.entity';
import { CourseReview } from './course-review.entity';

@Entity('courses')
@Index(['slug', 'organizationId'], { unique: true })
export class Course extends BaseEntity {
  @Column()
  title: string;

  @Column()
  slug: string;

  @Column('text')
  description: string;

  @Column('text', { nullable: true })
  shortDescription: string;

  @Column({ nullable: true })
  thumbnail: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  status: CourseStatus;

  @Column({
    type: 'enum',
    enum: CourseLevel,
    default: CourseLevel.BEGINNER,
  })
  level: CourseLevel;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'int', nullable: true })
  featuredOrder: number;

  @Column('json', { nullable: true })
  curriculum: {
    modules: Array<{
      id: string;
      title: string;
      lessons: Array<{
        id: string;
        title: string;
        type: 'video' | 'text' | 'quiz';
        content: string;
        duration: number;
      }>;
    }>;
  };

  @Column({ type: 'int', default: 0 })
  enrollmentCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  instructorId: string;

  @ManyToOne(() => Organization, org => org.courses)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  @OneToMany(() => Enrollment, enrollment => enrollment.course)
  enrollments: Enrollment[];

  @OneToMany(() => CourseReview, review => review.course)
  reviews: CourseReview[];

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;
}