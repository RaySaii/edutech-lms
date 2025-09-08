import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { TenantService } from './tenant.service';
import { Tenant } from '@edutech-lms/database';

export interface TenantResolutionStrategy {
  resolve(request: Request): Promise<string | null>;
}

export class SubdomainStrategy implements TenantResolutionStrategy {
  constructor(private tenantService: TenantService) {}

  async resolve(request: Request): Promise<string | null> {
    const host = request.get('host') || request.get('x-forwarded-host');
    if (!host) return null;

    // Extract subdomain from host
    const parts = host.split('.');
    if (parts.length < 3) return null; // No subdomain

    const subdomain = parts[0];
    
    // Skip common subdomains
    if (['www', 'api', 'admin', 'app'].includes(subdomain)) {
      return null;
    }

    const tenant = await this.tenantService.getTenantBySubdomain(subdomain);
    return tenant?.id || null;
  }
}

export class DomainStrategy implements TenantResolutionStrategy {
  constructor(private tenantService: TenantService) {}

  async resolve(request: Request): Promise<string | null> {
    const host = request.get('host') || request.get('x-forwarded-host');
    if (!host) return null;

    const tenant = await this.tenantService.getTenantByDomain(host);
    return tenant?.id || null;
  }
}

export class HeaderStrategy implements TenantResolutionStrategy {
  async resolve(request: Request): Promise<string | null> {
    return request.get('x-tenant-id') || null;
  }
}

export class PathStrategy implements TenantResolutionStrategy {
  constructor(private tenantService: TenantService) {}

  async resolve(request: Request): Promise<string | null> {
    const pathParts = request.path.split('/');
    if (pathParts.length < 2) return null;

    const tenantIdentifier = pathParts[1];
    
    // Check if it's a tenant subdomain or ID
    if (tenantIdentifier && tenantIdentifier.length > 0) {
      // First try as subdomain
      let tenant = await this.tenantService.getTenantBySubdomain(tenantIdentifier);
      if (tenant) return tenant.id;

      // Then try as direct tenant ID
      try {
        tenant = await this.tenantService.getTenantById(tenantIdentifier);
        return tenant.id;
      } catch {
        return null;
      }
    }

    return null;
  }
}

@Injectable()
export class TenantResolverService {
  private readonly logger = new Logger(TenantResolverService.name);
  private strategies: TenantResolutionStrategy[] = [];

  constructor(private tenantService: TenantService) {
    // Initialize strategies in order of preference
    this.strategies = [
      new HeaderStrategy(),
      new DomainStrategy(tenantService),
      new SubdomainStrategy(tenantService),
      new PathStrategy(tenantService),
    ];
  }

  async resolveTenant(request: Request): Promise<Tenant | null> {
    let tenantId: string | null = null;

    // Try each strategy until we find a tenant
    for (const strategy of this.strategies) {
      try {
        tenantId = await strategy.resolve(request);
        if (tenantId) {
          this.logger.debug(`Tenant resolved via ${strategy.constructor.name}: ${tenantId}`);
          break;
        }
      } catch (error) {
        this.logger.warn(`Strategy ${strategy.constructor.name} failed: ${error.message}`);
        continue;
      }
    }

    if (!tenantId) {
      this.logger.debug('No tenant could be resolved from request');
      return null;
    }

    try {
      const tenant = await this.tenantService.getTenantById(tenantId);
      
      // Check tenant status
      if (tenant.status !== 'active') {
        this.logger.warn(`Tenant ${tenantId} is not active: ${tenant.status}`);
        return null;
      }

      // Update last access time
      await this.tenantService.updateTenant(tenantId, { 
        lastAccessAt: new Date() 
      });

      return tenant;
    } catch (error) {
      this.logger.error(`Failed to get tenant ${tenantId}: ${error.message}`);
      return null;
    }
  }

  async resolveTenantContext(request: Request): Promise<{
    tenant: Tenant;
    userId?: string;
    userRole?: string;
    permissions?: string[];
  } | null> {
    const tenant = await this.resolveTenant(request);
    if (!tenant) return null;

    // Get user context from request (assuming it's set by auth middleware)
    const userId = request.user?.['sub'];
    if (!userId) {
      return { tenant };
    }

    try {
      // Get user's role and permissions in this tenant
      const tenantUser = await this.tenantService.getTenantUsers(tenant.id);
      const userTenantData = tenantUser.users.find(tu => tu.userId === userId);

      if (userTenantData) {
        return {
          tenant,
          userId,
          userRole: userTenantData.role,
          permissions: userTenantData.permissions || [],
        };
      }

      // User exists but not in this tenant
      return { tenant };
    } catch (error) {
      this.logger.error(`Failed to resolve tenant context: ${error.message}`);
      return { tenant };
    }
  }

  /**
   * Generate tenant URLs for different purposes
   */
  generateTenantUrls(tenant: Tenant, baseUrl?: string): {
    primary: string;
    admin: string;
    api: string;
    custom?: string;
  } {
    const base = baseUrl || 'https://example.com';
    
    let primaryUrl: string;
    let customUrl: string | undefined;

    if (tenant.domain) {
      primaryUrl = `https://${tenant.domain}`;
      customUrl = primaryUrl;
    } else {
      primaryUrl = `https://${tenant.subdomain}.${this.extractDomain(base)}`;
    }

    return {
      primary: primaryUrl,
      admin: `${primaryUrl}/admin`,
      api: `${primaryUrl}/api`,
      custom: customUrl,
    };
  }

  /**
   * Check if a request is for a tenant-specific resource
   */
  isTenantRequest(request: Request): boolean {
    const host = request.get('host') || request.get('x-forwarded-host') || '';
    const tenantHeader = request.get('x-tenant-id');
    const pathHasTenant = request.path.split('/').length > 2;

    return !!(
      tenantHeader ||
      this.hasSubdomain(host) ||
      this.isCustomDomain(host) ||
      pathHasTenant
    );
  }

  /**
   * Extract the base domain from a URL
   */
  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return 'localhost:3000';
    }
  }

  /**
   * Check if host has a subdomain
   */
  private hasSubdomain(host: string): boolean {
    const parts = host.split('.');
    return parts.length >= 3 && !['www', 'api', 'admin', 'app'].includes(parts[0]);
  }

  /**
   * Check if this is a custom domain (not a subdomain of main domain)
   */
  private isCustomDomain(host: string): boolean {
    // This would need to be configured based on your main domain
    const mainDomains = ['localhost', 'example.com', 'yourdomain.com'];
    return !mainDomains.some(domain => host.includes(domain));
  }

  /**
   * Validate tenant access for specific operations
   */
  async validateTenantAccess(
    tenantId: string, 
    userId: string, 
    requiredRole?: string,
    requiredPermissions?: string[]
  ): Promise<boolean> {
    try {
      const { users } = await this.tenantService.getTenantUsers(tenantId);
      const userTenant = users.find(tu => tu.userId === userId);

      if (!userTenant || !userTenant.isActive) {
        return false;
      }

      // Check role requirement
      if (requiredRole) {
        const roleHierarchy = ['viewer', 'student', 'teacher', 'manager', 'admin', 'owner'];
        const userRoleLevel = roleHierarchy.indexOf(userTenant.role);
        const requiredRoleLevel = roleHierarchy.indexOf(requiredRole);
        
        if (userRoleLevel < requiredRoleLevel) {
          return false;
        }
      }

      // Check permissions
      if (requiredPermissions && requiredPermissions.length > 0) {
        const userPermissions = userTenant.permissions || [];
        const hasAllPermissions = requiredPermissions.every(
          permission => userPermissions.includes(permission)
        );
        
        if (!hasAllPermissions) {
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to validate tenant access: ${error.message}`);
      return false;
    }
  }

  /**
   * Get tenant-specific configuration
   */
  async getTenantConfig(tenantId: string, category?: string): Promise<Record<string, any>> {
    try {
      const configs = await this.tenantService.getTenantConfiguration(tenantId, category);
      
      const configMap = {};
      configs.forEach(config => {
        if (!configMap[config.category]) {
          configMap[config.category] = {};
        }
        configMap[config.category][config.key] = config.value;
      });

      return configMap;
    } catch (error) {
      this.logger.error(`Failed to get tenant config: ${error.message}`);
      return {};
    }
  }

  /**
   * Check if tenant has reached usage limits
   */
  async checkUsageLimits(tenantId: string): Promise<{
    withinLimits: boolean;
    limits: Record<string, any>;
    current: Record<string, any>;
    warnings: string[];
  }> {
    try {
      const tenant = await this.tenantService.getTenantById(tenantId);
      const usage = await this.tenantService.getTenantUsage(tenantId, 1); // Get today's usage
      
      const limits = tenant.features || {};
      const currentUsage = tenant.limits || {};
      const warnings: string[] = [];
      let withinLimits = true;

      // Check user limit
      if (limits.maxUsers && limits.maxUsers > 0) {
        if (currentUsage.activeUsers >= limits.maxUsers) {
          withinLimits = false;
          warnings.push(`User limit reached: ${currentUsage.activeUsers}/${limits.maxUsers}`);
        } else if (currentUsage.activeUsers >= limits.maxUsers * 0.8) {
          warnings.push(`User limit warning: ${currentUsage.activeUsers}/${limits.maxUsers} (80% full)`);
        }
      }

      // Check course limit
      if (limits.maxCourses && limits.maxCourses > 0) {
        if (currentUsage.totalCourses >= limits.maxCourses) {
          withinLimits = false;
          warnings.push(`Course limit reached: ${currentUsage.totalCourses}/${limits.maxCourses}`);
        }
      }

      // Check storage limit
      if (limits.maxStorage && limits.maxStorage > 0) {
        if (currentUsage.storageUsed >= limits.maxStorage) {
          withinLimits = false;
          warnings.push(`Storage limit reached: ${currentUsage.storageUsed}GB/${limits.maxStorage}GB`);
        }
      }

      return {
        withinLimits,
        limits,
        current: currentUsage,
        warnings,
      };
    } catch (error) {
      this.logger.error(`Failed to check usage limits: ${error.message}`);
      return {
        withinLimits: true,
        limits: {},
        current: {},
        warnings: [],
      };
    }
  }
}