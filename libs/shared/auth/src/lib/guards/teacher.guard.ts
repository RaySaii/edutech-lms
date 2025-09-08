import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TEACHER_ROLES_KEY } from '../decorators/teacher-only.decorator';
import { UserRole, UserStatus } from '@edutech-lms/common';

@Injectable()
export class TeacherGuard implements CanActivate {
  private readonly logger = new Logger(TeacherGuard.name);
  
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const teacherRoles = this.reflector.getAllAndOverride<UserRole[]>(
      TEACHER_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    
    if (!teacherRoles) {
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
    
    // Check if user has teacher role
    const isTeacher = teacherRoles.includes(user.role);
    
    if (!isTeacher) {
      this.logger.warn(`Access denied: User ${user.email} with role ${user.role} is not authorized for teacher-only resource`);
    }
    
    return isTeacher;
  }
}