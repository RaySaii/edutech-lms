import { Column, Entity, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Course } from './course.entity';
import { User } from './user.entity';

@Entity('course_reviews')
@Index(['courseId', 'userId'], { unique: true })
export class CourseReview extends BaseEntity {
  @Column({ type: 'uuid' })
  courseId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'int' })
  rating: number;

  @Column('text', { nullable: true })
  comment: string;

  @Column({ type: 'boolean', default: true })
  isVerifiedPurchase: boolean;

  @Column({ type: 'json', nullable: true })
  helpfulVotes: {
    helpful: number;
    notHelpful: number;
    votedBy: string[];
  };

  @ManyToOne(() => Course, course => course.reviews)
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}