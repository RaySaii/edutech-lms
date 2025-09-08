import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole, UserStatus } from '@edutech-lms/common';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    
    if (!requiredRoles) {
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
    
    // Check role hierarchy
    const hasRequiredRole = this.checkRoleAccess(user.role, requiredRoles);
    
    if (!hasRequiredRole) {
      this.logger.warn(`Access denied: User ${user.email} with role ${user.role} attempted to access resource requiring roles: ${requiredRoles.join(', ')}`);
    }
    
    return hasRequiredRole;
  }
  
  private checkRoleAccess(userRole: UserRole, requiredRoles: UserRole[]): boolean {
    // Define role hierarchy - simplified for self-learning system
    const roleHierarchy = {
      [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.STUDENT],
      [UserRole.STUDENT]: [UserRole.STUDENT],
    };
    
    const userPermissions = roleHierarchy[userRole] || [];
    return requiredRoles.some(role => userPermissions.includes(role));
  }
}