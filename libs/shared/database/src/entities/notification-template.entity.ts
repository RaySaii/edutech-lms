import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { NotificationCategory } from './notification.entity';

export enum TemplateStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

@Entity('notification_templates')
@Unique(['category', 'locale', 'version'])
@Index(['category', 'status'])
export class NotificationTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: NotificationCategory,
  })
  @Index()
  category: NotificationCategory;

  @Column({ length: 10, default: 'en' })
  locale: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({
    type: 'enum',
    enum: TemplateStatus,
    default: TemplateStatus.DRAFT,
  })
  @Index()
  status: TemplateStatus;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  htmlTemplate: string;

  @Column({ type: 'text' })
  textTemplate: string;

  @Column({ type: 'text', nullable: true })
  smsTemplate?: string;

  @Column({ type: 'text', nullable: true })
  pushTemplate?: string;

  @Column({ type: 'json', nullable: true })
  variables?: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'url';
    description: string;
    required: boolean;
    defaultValue?: any;
  }[];

  @Column({ type: 'json', nullable: true })
  metadata?: {
    tags?: string[];
    author?: string;
    approvedBy?: string;
    approvedAt?: Date;
    testData?: any;
    previewUrl?: string;
    analyticsEnabled?: boolean;
  };

  @Column({ nullable: true })
  parentTemplateId?: string;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string;
}