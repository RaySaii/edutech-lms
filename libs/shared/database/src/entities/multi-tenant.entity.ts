import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  CANCELLED = 'cancelled',
}

export enum TenantPlan {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  CUSTOM = 'custom',
}

export enum IsolationLevel {
  SHARED = 'shared',           // Shared database, tenant filtering
  SCHEMA = 'schema',           // Separate database schemas per tenant
  DATABASE = 'database',       // Separate databases per tenant
}

@Entity('tenants')
@Index(['subdomain'])
@Index(['domain'])
@Index(['status'])
@Index(['plan'])
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 200 })
  name: string;

  @Column('varchar', { length: 100, unique: true })
  subdomain: string; // e.g., 'acme' for acme.lms.com

  @Column('varchar', { length: 200, nullable: true })
  domain?: string; // Custom domain like learn.acme.com

  @Column('text', { nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.TRIAL,
  })
  status: TenantStatus;

  @Column({
    type: 'enum',
    enum: TenantPlan,
    default: TenantPlan.FREE,
  })
  plan: TenantPlan;

  @Column({
    type: 'enum',
    enum: IsolationLevel,
    default: IsolationLevel.SHARED,
  })
  isolationLevel: IsolationLevel;

  @Column('varchar', { length: 100, nullable: true })
  databaseName?: string; // For DATABASE isolation

  @Column('varchar', { length: 100, nullable: true })
  schemaName?: string; // For SCHEMA isolation

  @Column('uuid')
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column('varchar', { length: 500, nullable: true })
  logoUrl?: string;

  @Column('varchar', { length: 500, nullable: true })
  faviconUrl?: string;

  @Column('jsonb', { nullable: true })
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
    customCss?: string;
    headerLogo?: string;
    loginBackground?: string;
  };

  @Column('jsonb', { nullable: true })
  features?: {
    maxUsers?: number;
    maxCourses?: number;
    maxStorage?: number; // in GB
    videoStreaming?: boolean;
    liveStreaming?: boolean;
    customBranding?: boolean;
    ssoIntegration?: boolean;
    apiAccess?: boolean;
    analytics?: boolean;
    customDomain?: boolean;
    whiteLabeling?: boolean;
    bulkOperations?: boolean;
    advancedReporting?: boolean;
    customRoles?: boolean;
    automations?: boolean;
    integrations?: string[]; // Available integrations
  };

  @Column('jsonb', { nullable: true })
  limits?: {
    activeUsers?: number;
    totalCourses?: number;
    storageUsed?: number; // in GB
    bandwidthUsed?: number; // in GB
    apiCallsUsed?: number;
    monthlyApiLimit?: number;
    concurrentStreamers?: number;
  };

  @Column('jsonb', { nullable: true })
  settings?: {
    timezone?: string;
    language?: string;
    dateFormat?: string;
    currency?: string;
    allowUserRegistration?: boolean;
    requireEmailVerification?: boolean;
    enableMfa?: boolean;
    sessionTimeout?: number; // in minutes
    passwordPolicy?: {
      minLength?: number;
      requireUppercase?: boolean;
      requireNumbers?: boolean;
      requireSymbols?: boolean;
      expireAfterDays?: number;
    };
    dataRetention?: {
      userDataDays?: number;
      logDataDays?: number;
      backupRetentionDays?: number;
    };
  };

  @Column('jsonb', { nullable: true })
  integrations?: {
    sso?: {
      provider?: 'saml' | 'oauth2' | 'ldap';
      enabled?: boolean;
      config?: Record<string, any>;
    };
    webhooks?: Array<{
      id: string;
      url: string;
      events: string[];
      secret?: string;
      enabled: boolean;
    }>;
    apis?: Array<{
      name: string;
      type: 'rest' | 'graphql' | 'webhook';
      config: Record<string, any>;
      enabled: boolean;
    }>;
    thirdParty?: {
      zoom?: { apiKey?: string; secret?: string };
      slack?: { webhookUrl?: string };
      mailchimp?: { apiKey?: string; listId?: string };
      salesforce?: { clientId?: string; clientSecret?: string };
      googleWorkspace?: { clientId?: string; domain?: string };
    };
  };

  @OneToMany(() => TenantUser, tenantUser => tenantUser.tenant)
  tenantUsers: TenantUser[];

  @OneToMany(() => TenantInvitation, invitation => invitation.tenant)
  invitations: TenantInvitation[];

  @OneToMany(() => TenantAuditLog, log => log.tenant)
  auditLogs: TenantAuditLog[];

  @Column({ nullable: true })
  trialEndsAt?: Date;

  @Column({ nullable: true })
  suspendedAt?: Date;

  @Column('text', { nullable: true })
  suspensionReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastAccessAt?: Date;
}

@Entity('tenant_users')
@Index(['tenantId'])
@Index(['userId'])
@Index(['role'])
export class TenantUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @ManyToOne(() => Tenant, tenant => tenant.tenantUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['owner', 'admin', 'manager', 'teacher', 'student', 'viewer'],
    default: 'student',
  })
  role: string;

  @Column({ default: true })
  isActive: boolean;

  @Column('simple-array', { nullable: true })
  permissions?: string[];

  @Column('jsonb', { nullable: true })
  preferences?: {
    notifications?: {
      email?: boolean;
      browser?: boolean;
      mobile?: boolean;
    };
    dashboard?: {
      layout?: string;
      widgets?: string[];
    };
    locale?: {
      language?: string;
      timezone?: string;
      dateFormat?: string;
    };
  };

  @Column('uuid', { nullable: true })
  invitedBy?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invitedBy' })
  inviter?: User;

  @CreateDateColumn()
  joinedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastLoginAt?: Date;
}

@Entity('tenant_invitations')
@Index(['tenantId'])
@Index(['email'])
@Index(['status'])
@Index(['expiresAt'])
export class TenantInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @ManyToOne(() => Tenant, tenant => tenant.invitations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column('varchar', { length: 320 })
  email: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['owner', 'admin', 'manager', 'teacher', 'student', 'viewer'],
    default: 'student',
  })
  role: string;

  @Column('simple-array', { nullable: true })
  permissions?: string[];

  @Column('varchar', { length: 500 })
  token: string; // Invitation token

  @Column('uuid')
  invitedBy: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invitedBy' })
  inviter: User;

  @Column('text', { nullable: true })
  message?: string;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  acceptedAt?: Date;

  @Column('uuid', { nullable: true })
  acceptedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('tenant_audit_logs')
@Index(['tenantId'])
@Index(['userId'])
@Index(['action'])
@Index(['createdAt'])
export class TenantAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @ManyToOne(() => Tenant, tenant => tenant.auditLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column('uuid', { nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column('varchar', { length: 100 })
  action: string; // e.g., 'user.created', 'course.published', 'settings.updated'

  @Column('varchar', { length: 100, nullable: true })
  resource?: string; // Resource type (user, course, etc.)

  @Column('uuid', { nullable: true })
  resourceId?: string; // ID of the affected resource

  @Column('jsonb', { nullable: true })
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };

  @Column('jsonb', { nullable: true })
  metadata?: {
    ip?: string;
    userAgent?: string;
    method?: string;
    endpoint?: string;
    duration?: number;
    success?: boolean;
    errorMessage?: string;
  };

  @Column({
    type: 'enum',
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info',
  })
  level: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('tenant_domains')
@Index(['tenantId'])
@Index(['domain'])
@Index(['isActive'])
export class TenantDomain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column('varchar', { length: 200, unique: true })
  domain: string;

  @Column({
    type: 'enum',
    enum: ['primary', 'alias', 'redirect'],
    default: 'primary',
  })
  type: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  sslEnabled: boolean;

  @Column('varchar', { length: 500, nullable: true })
  sslCertificate?: string;

  @Column({ nullable: true })
  sslExpiresAt?: Date;

  @Column('jsonb', { nullable: true })
  dnsRecords?: Array<{
    type: 'A' | 'CNAME' | 'TXT';
    name: string;
    value: string;
    ttl?: number;
    verified?: boolean;
  }>;

  @Column({ nullable: true })
  verifiedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('tenant_configurations')
@Index(['tenantId'])
@Index(['key'])
export class TenantConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column('varchar', { length: 100 })
  category: string; // e.g., 'branding', 'features', 'integrations'

  @Column('varchar', { length: 100 })
  key: string;

  @Column('jsonb')
  value: any;

  @Column({ default: true })
  isActive: boolean;

  @Column('text', { nullable: true })
  description?: string;

  @Column('uuid', { nullable: true })
  updatedBy?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updatedBy' })
  updater?: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('tenant_usage_metrics')
@Index(['tenantId'])
@Index(['date'])
@Index(['metricType'])
export class TenantUsageMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column('varchar', { length: 100 })
  metricType: string; // e.g., 'active_users', 'storage_used', 'api_calls'

  @Column('decimal', { precision: 15, scale: 4 })
  value: number;

  @Column('varchar', { length: 20, nullable: true })
  unit?: string; // e.g., 'bytes', 'count', 'minutes'

  @Column('date')
  date: Date;

  @Column({
    type: 'enum',
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    default: 'daily',
  })
  granularity: string;

  @Column('jsonb', { nullable: true })
  metadata?: {
    breakdown?: Record<string, number>;
    peak?: {
      value: number;
      timestamp: string;
    };
    average?: number;
  };

  @CreateDateColumn()
  createdAt: Date;
}