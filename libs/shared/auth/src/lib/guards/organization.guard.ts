import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@edutech-lms/common';

@Injectable()
export class OrganizationGuard implements CanActivate {
  private readonly logger = new Logger(OrganizationGuard.name);
  
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      this.logger.warn('Access denied: No user found in request');
      return false;
    }
    
    // Global admins can access any organization
    if (user.role === UserRole.ADMIN) {
      return true;
    }
    
    // Extract organization ID from request params, query, or body
    const requestOrgId = request.params?.organizationId || 
                        request.query?.organizationId || 
                        request.body?.organizationId;
    
    // If no organization ID in request, allow (route doesn't require org check)
    if (!requestOrgId) {
      return true;
    }
    
    // Check if user belongs to the requested organization
    const hasAccess = user.organizationId === requestOrgId;
    
    if (!hasAccess) {
      this.logger.warn(
        `Organization access denied: User ${user.email} from org ${user.organizationId} ` +
        `attempted to access org ${requestOrgId}`
      );
    }
    
    return hasAccess;
  }
}