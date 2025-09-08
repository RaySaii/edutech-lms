import { 
  Injectable, 
  CanActivate, 
  ExecutionContext, 
  ForbiddenException,
  UnauthorizedException,
  Logger 
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantResolverService } from '@edutech-lms/common';
import { getTenantMetadata } from '../decorators/tenant.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private reflector: Reflector,
    private tenantResolver: TenantResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = getTenantMetadata(this.reflector, context);
    const request = context.switchToHttp().getRequest();

    try {
      // Resolve tenant context from request
      const tenantContext = await this.tenantResolver.resolveTenantContext(request);
      
      // If no tenant metadata is specified, allow access
      if (!metadata.required && !metadata.roles && !metadata.permissions) {
        if (tenantContext) {
          request.tenant = tenantContext.tenant;
          request.tenantContext = tenantContext;
        }
        return true;
      }

      // If tenant is required but not found
      if (metadata.required && !tenantContext) {
        throw new ForbiddenException('Tenant context is required but not found');
      }

      // If tenant found, add to request
      if (tenantContext) {
        request.tenant = tenantContext.tenant;
        request.tenantContext = tenantContext;

        // Check user authentication if roles or permissions are required
        if ((metadata.roles || metadata.permissions) && !tenantContext.userId) {
          throw new UnauthorizedException('User must be authenticated for tenant role/permission checks');
        }

        // Check tenant roles
        if (metadata.roles && metadata.roles.length > 0) {
          if (!tenantContext.userRole || !this.hasRequiredRole(tenantContext.userRole, metadata.roles)) {
            throw new ForbiddenException(
              `User role '${tenantContext.userRole}' does not meet required roles: ${metadata.roles.join(', ')}`
            );
          }
        }

        // Check tenant permissions
        if (metadata.permissions && metadata.permissions.length > 0) {
          const userPermissions = tenantContext.permissions || [];
          const hasAllPermissions = metadata.permissions.every(
            permission => userPermissions.includes(permission)
          );

          if (!hasAllPermissions) {
            const missingPermissions = metadata.permissions.filter(
              permission => !userPermissions.includes(permission)
            );
            throw new ForbiddenException(
              `Missing required permissions: ${missingPermissions.join(', ')}`
            );
          }
        }
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error(`Tenant guard error: ${error.message}`);
      throw new ForbiddenException('Tenant access validation failed');
    }
  }

  private hasRequiredRole(userRole: string, requiredRoles: string[]): boolean {
    // Define role hierarchy
    const roleHierarchy = {
      'viewer': 0,
      'student': 1,
      'teacher': 2,
      'manager': 3,
      'admin': 4,
      'owner': 5,
    };

    const userRoleLevel = roleHierarchy[userRole] ?? -1;
    
    // Check if user role meets any of the required roles
    return requiredRoles.some(role => {
      const requiredLevel = roleHierarchy[role] ?? 999;
      return userRoleLevel >= requiredLevel;
    });
  }
}