import { Column, Entity, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserRole, UserStatus } from '@edutech-lms/common';
import { Organization } from './organization.entity';
import { Enrollment } from './enrollment.entity';

@Entity('users')
@Index(['email', 'organizationId'], { unique: true })
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, org => org.users)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ nullable: true })
  emailVerifiedAt: Date;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  totpSecret: string;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column('text', { array: true, nullable: true })
  backupCodes: string[];

  @OneToMany(() => Enrollment, enrollment => enrollment.user)
  enrollments: Enrollment[];
}