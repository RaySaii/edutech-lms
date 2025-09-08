import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('revenue_analytics')
@Index(['date'])
@Index(['source'])
export class RevenueAnalyticsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('date')
  date: Date;

  @Column('varchar', { length: 100 })
  source: string; // course_sales, subscriptions, certificates, etc.

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('varchar', { length: 10, default: 'USD' })
  currency: string;

  @Column('int', { default: 1 })
  transactionCount: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  refunds: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  taxes: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  fees: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  netRevenue: number;

  @Column('uuid', { nullable: true })
  courseId: string;

  @Column('varchar', { length: 100, nullable: true })
  paymentMethod: string;

  @Column('varchar', { length: 100, nullable: true })
  region: string;

  @Column('json', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}