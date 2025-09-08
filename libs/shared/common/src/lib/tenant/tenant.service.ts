import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource } from 'typeorm';
import { 
  Tenant, 
  TenantUser, 
  TenantInvitation, 
  TenantAuditLog, 
  TenantDomain,
  TenantConfiguration,
  TenantUsageMetric,
  TenantStatus,
  TenantPlan,
  IsolationLevel,
  User,
} from '@edutech-lms/database';
import * as crypto from 'crypto';

export interface CreateTenantData {
  name: string;
  subdomain: string;
  ownerId: string;
  plan?: TenantPlan;
  isolationLevel?: IsolationLevel;
  domain?: string;
  features?: any;
  branding?: any;
}

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
  permissions: string[];
}

export interface TenantInviteData {
  email: string;
  role: string;
  permissions?: string[];
  message?: string;
  expiresInDays?: number;
}

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantUser)
    private tenantUserRepository: Repository<TenantUser>,
    @InjectRepository(TenantInvitation)
    private invitationRepository: Repository<TenantInvitation>,
    @InjectRepository(TenantAuditLog)
    private auditLogRepository: Repository<TenantAuditLog>,
    @InjectRepository(TenantDomain)
    private domainRepository: Repository<TenantDomain>,
    @InjectRepository(TenantConfiguration)
    private configRepository: Repository<TenantConfiguration>,
    @InjectRepository(TenantUsageMetric)
    private usageMetricRepository: Repository<TenantUsageMetric>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async createTenant(data: CreateTenantData): Promise<Tenant> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if subdomain is available
      const existingTenant = await this.tenantRepository.findOne({
        where: { subdomain: data.subdomain },
      });

      if (existingTenant) {
        throw new BadRequestException(`Subdomain '${data.subdomain}' is already taken`);
      }

      // Validate owner exists
      const owner = await this.userRepository.findOne({ where: { id: data.ownerId } });
      if (!owner) {
        throw new NotFoundException(`Owner user ${data.ownerId} not found`);
      }

      // Create tenant
      const tenant = this.tenantRepository.create({
        name: data.name,
        subdomain: data.subdomain,
        domain: data.domain,
        ownerId: data.ownerId,
        plan: data.plan || TenantPlan.FREE,
        isolationLevel: data.isolationLevel || IsolationLevel.SHARED,
        status: data.plan === TenantPlan.FREE ? TenantStatus.TRIAL : TenantStatus.ACTIVE,
        features: this.getDefaultFeatures(data.plan || TenantPlan.FREE),
        branding: data.branding || this.getDefaultBranding(),
        settings: this.getDefaultSettings(),
        trialEndsAt: data.plan === TenantPlan.FREE ? 
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : // 30 days trial
          undefined,
        ...data,
      });

      const savedTenant = await queryRunner.manager.save(tenant);

      // Create database/schema if needed
      if (data.isolationLevel === IsolationLevel.DATABASE) {
        await this.createTenantDatabase(savedTenant, queryRunner);
      } else if (data.isolationLevel === IsolationLevel.SCHEMA) {
        await this.createTenantSchema(savedTenant, queryRunner);
      }

      // Add owner as tenant user
      const tenantUser = this.tenantUserRepository.create({
        tenantId: savedTenant.id,
        userId: data.ownerId,
        role: 'owner',
        permissions: this.getOwnerPermissions(),
      });

      await queryRunner.manager.save(tenantUser);

      // Create custom domain if provided
      if (data.domain) {
        await this.addCustomDomain(savedTenant.id, data.domain, 'primary', queryRunner);
      }

      // Log tenant creation
      await this.logAuditEvent(
        savedTenant.id,
        data.ownerId,
        'tenant.created',
        'tenant',
        savedTenant.id,
        { before: null, after: savedTenant },
        queryRunner
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Tenant created: ${savedTenant.id} (${savedTenant.subdomain})`);
      return savedTenant;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create tenant: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({
      where: { subdomain, status: TenantStatus.ACTIVE },
      relations: ['owner'],
    });
  }

  async getTenantByDomain(domain: string): Promise<Tenant | null> {
    const tenantDomain = await this.domainRepository.findOne({
      where: { domain, isActive: true },
      relations: ['tenant'],
    });

    return tenantDomain?.tenant || null;
  }

  async getTenantById(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      relations: ['owner'],
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    return tenant;
  }

  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
    const tenant = await this.getTenantById(tenantId);
    
    // Store original data for audit
    const originalData = { ...tenant };

    Object.assign(tenant, updates);
    const updatedTenant = await this.tenantRepository.save(tenant);

    // Log update
    await this.logAuditEvent(
      tenantId,
      null, // System update - could be enhanced to track the updating user
      'tenant.updated',
      'tenant',
      tenantId,
      { before: originalData, after: updatedTenant }
    );

    this.logger.log(`Tenant updated: ${tenantId}`);
    return updatedTenant;
  }

  async suspendTenant(tenantId: string, reason: string): Promise<Tenant> {
    const tenant = await this.getTenantById(tenantId);
    
    tenant.status = TenantStatus.SUSPENDED;
    tenant.suspendedAt = new Date();
    tenant.suspensionReason = reason;

    const suspendedTenant = await this.tenantRepository.save(tenant);

    await this.logAuditEvent(
      tenantId,
      null,
      'tenant.suspended',
      'tenant',
      tenantId,
      { before: { status: TenantStatus.ACTIVE }, after: { status: TenantStatus.SUSPENDED, reason } }
    );

    this.logger.log(`Tenant suspended: ${tenantId} - ${reason}`);
    return suspendedTenant;
  }

  async reactivateTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.getTenantById(tenantId);
    
    tenant.status = TenantStatus.ACTIVE;
    tenant.suspendedAt = null;
    tenant.suspensionReason = null;

    const reactivatedTenant = await this.tenantRepository.save(tenant);

    await this.logAuditEvent(
      tenantId,
      null,
      'tenant.reactivated',
      'tenant',
      tenantId,
      { before: { status: TenantStatus.SUSPENDED }, after: { status: TenantStatus.ACTIVE } }
    );

    this.logger.log(`Tenant reactivated: ${tenantId}`);
    return reactivatedTenant;
  }

  async inviteUser(tenantId: string, inviterUserId: string, data: TenantInviteData): Promise<TenantInvitation> {
    const tenant = await this.getTenantById(tenantId);
    
    // Check if user is already a member
    const existingMember = await this.tenantUserRepository.findOne({
      where: { tenantId, user: { email: data.email } },
      relations: ['user'],
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this tenant');
    }

    // Check for existing pending invitation
    const existingInvitation = await this.invitationRepository.findOne({
      where: { tenantId, email: data.email, status: 'pending' },
    });

    if (existingInvitation) {
      throw new BadRequestException('User already has a pending invitation');
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || 7));

    const invitation = this.invitationRepository.create({
      tenantId,
      email: data.email,
      role: data.role,
      permissions: data.permissions || this.getDefaultPermissions(data.role),
      token,
      invitedBy: inviterUserId,
      message: data.message,
      expiresAt,
    });

    const savedInvitation = await this.invitationRepository.save(invitation);

    // Log invitation
    await this.logAuditEvent(
      tenantId,
      inviterUserId,
      'user.invited',
      'invitation',
      savedInvitation.id,
      { 
        before: null, 
        after: { email: data.email, role: data.role } 
      }
    );

    this.logger.log(`User invited to tenant ${tenantId}: ${data.email}`);
    return savedInvitation;
  }

  async acceptInvitation(token: string, userId: string): Promise<TenantUser> {
    const invitation = await this.invitationRepository.findOne({
      where: { token, status: 'pending' },
      relations: ['tenant'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or already used');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create tenant user
      const tenantUser = this.tenantUserRepository.create({
        tenantId: invitation.tenantId,
        userId,
        role: invitation.role,
        permissions: invitation.permissions,
        invitedBy: invitation.invitedBy,
      });

      const savedTenantUser = await queryRunner.manager.save(tenantUser);

      // Update invitation
      invitation.status = 'accepted';
      invitation.acceptedAt = new Date();
      invitation.acceptedBy = userId;
      await queryRunner.manager.save(invitation);

      // Log acceptance
      await this.logAuditEvent(
        invitation.tenantId,
        userId,
        'invitation.accepted',
        'invitation',
        invitation.id,
        { before: { status: 'pending' }, after: { status: 'accepted' } },
        queryRunner
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Invitation accepted: ${token} by user ${userId}`);
      return savedTenantUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTenantUsers(tenantId: string, page: number = 1, limit: number = 20): Promise<{
    users: TenantUser[];
    total: number;
  }> {
    const [users, total] = await this.tenantUserRepository.findAndCount({
      where: { tenantId, isActive: true },
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { joinedAt: 'DESC' },
    });

    return { users, total };
  }

  async updateUserRole(
    tenantId: string,
    userId: string,
    newRole: string,
    permissions: string[],
    updatedBy: string
  ): Promise<TenantUser> {
    const tenantUser = await this.tenantUserRepository.findOne({
      where: { tenantId, userId },
    });

    if (!tenantUser) {
      throw new NotFoundException('User not found in this tenant');
    }

    const oldRole = tenantUser.role;
    const oldPermissions = tenantUser.permissions;

    tenantUser.role = newRole;
    tenantUser.permissions = permissions;

    const updatedTenantUser = await this.tenantUserRepository.save(tenantUser);

    // Log role update
    await this.logAuditEvent(
      tenantId,
      updatedBy,
      'user.role_updated',
      'tenant_user',
      tenantUser.id,
      { 
        before: { role: oldRole, permissions: oldPermissions },
        after: { role: newRole, permissions }
      }
    );

    this.logger.log(`User role updated in tenant ${tenantId}: ${userId} -> ${newRole}`);
    return updatedTenantUser;
  }

  async removeUserFromTenant(tenantId: string, userId: string, removedBy: string): Promise<void> {
    const tenantUser = await this.tenantUserRepository.findOne({
      where: { tenantId, userId },
    });

    if (!tenantUser) {
      throw new NotFoundException('User not found in this tenant');
    }

    // Can't remove the owner
    if (tenantUser.role === 'owner') {
      throw new ForbiddenException('Cannot remove the tenant owner');
    }

    await this.tenantUserRepository.remove(tenantUser);

    // Log removal
    await this.logAuditEvent(
      tenantId,
      removedBy,
      'user.removed',
      'tenant_user',
      tenantUser.id,
      { 
        before: { userId, role: tenantUser.role },
        after: null 
      }
    );

    this.logger.log(`User removed from tenant ${tenantId}: ${userId}`);
  }

  async addCustomDomain(
    tenantId: string, 
    domain: string, 
    type: 'primary' | 'alias' | 'redirect' = 'primary',
    queryRunner?: QueryRunner
  ): Promise<TenantDomain> {
    const manager = queryRunner?.manager || this.dataSource.manager;

    // Check if domain is already taken
    const existingDomain = await manager.findOne(TenantDomain, {
      where: { domain },
    });

    if (existingDomain) {
      throw new BadRequestException(`Domain '${domain}' is already in use`);
    }

    const tenantDomain = manager.create(TenantDomain, {
      tenantId,
      domain,
      type,
      isVerified: false,
      isActive: true,
      sslEnabled: false,
      dnsRecords: this.generateDnsRecords(domain),
    });

    return manager.save(tenantDomain);
  }

  async verifyDomain(domainId: string): Promise<TenantDomain> {
    const domain = await this.domainRepository.findOne({ where: { id: domainId } });
    if (!domain) {
      throw new NotFoundException(`Domain ${domainId} not found`);
    }

    // In a real implementation, you would verify DNS records here
    const dnsVerified = await this.verifyDnsRecords(domain.domain, domain.dnsRecords || []);
    
    if (dnsVerified) {
      domain.isVerified = true;
      domain.verifiedAt = new Date();
      
      // Enable SSL if verification successful
      await this.enableSslForDomain(domain);
    }

    return this.domainRepository.save(domain);
  }

  async getTenantConfiguration(tenantId: string, category?: string): Promise<TenantConfiguration[]> {
    const whereClause: any = { tenantId, isActive: true };
    if (category) {
      whereClause.category = category;
    }

    return this.configRepository.find({
      where: whereClause,
      order: { category: 'ASC', key: 'ASC' },
    });
  }

  async setTenantConfiguration(
    tenantId: string,
    category: string,
    key: string,
    value: any,
    updatedBy?: string
  ): Promise<TenantConfiguration> {
    let config = await this.configRepository.findOne({
      where: { tenantId, category, key },
    });

    if (config) {
      config.value = value;
      config.updatedBy = updatedBy;
    } else {
      config = this.configRepository.create({
        tenantId,
        category,
        key,
        value,
        updatedBy,
      });
    }

    return this.configRepository.save(config);
  }

  async recordUsageMetric(
    tenantId: string,
    metricType: string,
    value: number,
    unit?: string,
    metadata?: any
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let metric = await this.usageMetricRepository.findOne({
      where: { tenantId, metricType, date: today, granularity: 'daily' },
    });

    if (metric) {
      metric.value = value;
      metric.metadata = metadata;
    } else {
      metric = this.usageMetricRepository.create({
        tenantId,
        metricType,
        value,
        unit,
        date: today,
        granularity: 'daily',
        metadata,
      });
    }

    await this.usageMetricRepository.save(metric);
  }

  async getTenantUsage(tenantId: string, days: number = 30): Promise<TenantUsageMetric[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.usageMetricRepository.find({
      where: { tenantId },
      order: { date: 'DESC' },
    });
  }

  private async createTenantDatabase(tenant: Tenant, queryRunner: QueryRunner): Promise<void> {
    const databaseName = `tenant_${tenant.subdomain}_${tenant.id.replace(/-/g, '_')}`;
    
    // In a real implementation, you would create the database here
    // This is a simplified example
    await queryRunner.query(`CREATE DATABASE ${databaseName}`);
    
    tenant.databaseName = databaseName;
    await queryRunner.manager.save(tenant);
  }

  private async createTenantSchema(tenant: Tenant, queryRunner: QueryRunner): Promise<void> {
    const schemaName = `tenant_${tenant.subdomain}`;
    
    // In a real implementation, you would create the schema and tables here
    await queryRunner.query(`CREATE SCHEMA ${schemaName}`);
    
    tenant.schemaName = schemaName;
    await queryRunner.manager.save(tenant);
  }

  private getDefaultFeatures(plan: TenantPlan): any {
    const featuresByPlan = {
      [TenantPlan.FREE]: {
        maxUsers: 10,
        maxCourses: 5,
        maxStorage: 1, // 1GB
        videoStreaming: false,
        liveStreaming: false,
        customBranding: false,
        ssoIntegration: false,
        apiAccess: false,
        analytics: false,
        customDomain: false,
      },
      [TenantPlan.STARTER]: {
        maxUsers: 50,
        maxCourses: 25,
        maxStorage: 10, // 10GB
        videoStreaming: true,
        liveStreaming: false,
        customBranding: true,
        ssoIntegration: false,
        apiAccess: true,
        analytics: true,
        customDomain: false,
      },
      [TenantPlan.PROFESSIONAL]: {
        maxUsers: 200,
        maxCourses: 100,
        maxStorage: 50, // 50GB
        videoStreaming: true,
        liveStreaming: true,
        customBranding: true,
        ssoIntegration: true,
        apiAccess: true,
        analytics: true,
        customDomain: true,
      },
      [TenantPlan.ENTERPRISE]: {
        maxUsers: -1, // Unlimited
        maxCourses: -1, // Unlimited
        maxStorage: 500, // 500GB
        videoStreaming: true,
        liveStreaming: true,
        customBranding: true,
        ssoIntegration: true,
        apiAccess: true,
        analytics: true,
        customDomain: true,
        whiteLabeling: true,
        advancedReporting: true,
        customRoles: true,
      },
    };

    return featuresByPlan[plan] || featuresByPlan[TenantPlan.FREE];
  }

  private getDefaultBranding(): any {
    return {
      primaryColor: '#3b82f6',
      secondaryColor: '#64748b',
      accentColor: '#0ea5e9',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'Inter, sans-serif',
    };
  }

  private getDefaultSettings(): any {
    return {
      timezone: 'UTC',
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      currency: 'USD',
      allowUserRegistration: true,
      requireEmailVerification: true,
      enableMfa: false,
      sessionTimeout: 60, // minutes
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSymbols: false,
        expireAfterDays: 90,
      },
    };
  }

  private getOwnerPermissions(): string[] {
    return [
      'tenant.manage',
      'users.manage',
      'courses.manage',
      'content.manage',
      'analytics.view',
      'settings.manage',
      'billing.manage',
    ];
  }

  private getDefaultPermissions(role: string): string[] {
    const permissionsByRole = {
      admin: ['users.manage', 'courses.manage', 'content.manage', 'analytics.view'],
      manager: ['courses.manage', 'content.manage', 'users.view'],
      teacher: ['courses.create', 'content.create', 'students.view'],
      student: ['courses.view', 'content.view'],
      viewer: ['courses.view'],
    };

    return permissionsByRole[role] || permissionsByRole.student;
  }

  private generateDnsRecords(domain: string): any[] {
    return [
      {
        type: 'CNAME',
        name: domain,
        value: 'lms.example.com',
        ttl: 300,
        verified: false,
      },
      {
        type: 'TXT',
        name: `_verification.${domain}`,
        value: crypto.randomBytes(16).toString('hex'),
        ttl: 300,
        verified: false,
      },
    ];
  }

  private async verifyDnsRecords(domain: string, records: any[]): Promise<boolean> {
    // In a real implementation, you would check DNS records here
    // This is a simplified mock
    return true;
  }

  private async enableSslForDomain(domain: TenantDomain): Promise<void> {
    // In a real implementation, you would provision SSL certificate here
    domain.sslEnabled = true;
    domain.sslExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
  }

  private async logAuditEvent(
    tenantId: string,
    userId: string | null,
    action: string,
    resource?: string,
    resourceId?: string,
    changes?: any,
    queryRunner?: QueryRunner
  ): Promise<void> {
    const manager = queryRunner?.manager || this.dataSource.manager;

    const auditLog = manager.create(TenantAuditLog, {
      tenantId,
      userId,
      action,
      resource,
      resourceId,
      changes,
      level: 'info',
    });

    await manager.save(auditLog);
  }
}