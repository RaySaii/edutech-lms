import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity('organizations')
export class Organization extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  settings: {
    theme: any;
    features: string[];
    limits: {
      maxUsers: number;
      maxCourses: number;
      storageLimit: number;
    };
  };

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => User, user => user.organization)
  users: User[];

  @OneToMany(() => Course, course => course.organization)
  courses: Course[];
}