import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission, ROLE_PERMISSIONS, UserStatus } from '@edutech-lms/common';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);
  
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    
    if (!requiredPermissions) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      this.logger.warn('Access denied: No user found in request');
      return false;
    }
    
    // Check if user account is active
    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(`Access denied: User ${user.email} account status is ${user.status}`);
      return false;
    }
    
    // Get user permissions based on role
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    
    // Check if user has all required permissions
    const hasPermissions = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasPermissions) {
      this.logger.warn(
        `Access denied: User ${user.email} with role ${user.role} lacks permissions: ${
          requiredPermissions.filter(p => !userPermissions.includes(p)).join(', ')
        }`
      );
    }
    
    return hasPermissions;
  }
}