import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Organization } from '@edutech-lms/database';
import { UserRole, PermissionType } from '@edutech-lms/common';

export interface AdvancedPermissionContext {
  action: PermissionType;
  resource?: string;
  resourceId?: string;
  organizationId?: string;
  courseId?: string;
  conditionalChecks?: Array<{
    condition: string;
    value: any;
  }>;
}

@Injectable()
export class AdvancedPermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<AdvancedPermissionContext[]>(
      'advanced-permissions',
      context.getHandler()
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Load full user with relationships
    const fullUser = await this.userRepository.findOne({
      where: { id: user.sub },
      relations: ['organization', 'enrollments', 'permissions']
    });

    if (!fullUser) {
      throw new ForbiddenException('User not found');
    }

    // Check each required permission
    for (const permission of requiredPermissions) {
      const hasPermission = await this.checkAdvancedPermission(
        fullUser,
        permission,
        request
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Insufficient permissions for action: ${permission.action}`
        );
      }
    }

    return true;
  }

  private async checkAdvancedPermission(
    user: User,
    permission: AdvancedPermissionContext,
    request: any
  ): Promise<boolean> {
    // Role-based permissions
    if (!this.hasRolePermission(user.role, permission.action)) {
      return false;
    }

    // Organization-level permissions
    if (permission.organizationId) {
      if (!user.organization || user.organization.id !== permission.organizationId) {
        return false;
      }
    }

    // Resource ownership checks
    if (permission.resource && permission.resourceId) {
      const hasResourceAccess = await this.checkResourceAccess(
        user,
        permission.resource,
        permission.resourceId
      );
      if (!hasResourceAccess) {
        return false;
      }
    }

    // Course-specific permissions
    if (permission.courseId) {
      const hasCourseAccess = await this.checkCourseAccess(
        user,
        permission.courseId,
        permission.action
      );
      if (!hasCourseAccess) {
        return false;
      }
    }

    // Conditional checks
    if (permission.conditionalChecks) {
      for (const check of permission.conditionalChecks) {
        const conditionMet = await this.evaluateCondition(
          user,
          check,
          request
        );
        if (!conditionMet) {
          return false;
        }
      }
    }

    return true;
  }

  private hasRolePermission(userRole: UserRole, action: PermissionType): boolean {
    const rolePermissions = {
      [UserRole.SUPER_ADMIN]: [
        PermissionType.SYSTEM_ADMIN,
        PermissionType.USER_MANAGEMENT,
        PermissionType.ORGANIZATION_MANAGEMENT,
        PermissionType.COURSE_MANAGEMENT,
        PermissionType.CONTENT_MANAGEMENT,
        PermissionType.ANALYTICS_VIEW,
        PermissionType.BILLING_MANAGEMENT,
        PermissionType.SETTINGS_MANAGEMENT,
      ],
      [UserRole.ADMIN]: [
        PermissionType.USER_MANAGEMENT,
        PermissionType.ORGANIZATION_MANAGEMENT,
        PermissionType.COURSE_MANAGEMENT,
        PermissionType.CONTENT_MANAGEMENT,
        PermissionType.ANALYTICS_VIEW,
        PermissionType.SETTINGS_MANAGEMENT,
      ],
      [UserRole.TEACHER]: [
        PermissionType.COURSE_CREATE,
        PermissionType.COURSE_EDIT,
        PermissionType.CONTENT_CREATE,
        PermissionType.CONTENT_EDIT,
        PermissionType.ASSESSMENT_MANAGEMENT,
        PermissionType.STUDENT_PROGRESS_VIEW,
        PermissionType.GRADING,
      ],
      [UserRole.STUDENT]: [
        PermissionType.COURSE_VIEW,
        PermissionType.CONTENT_VIEW,
        PermissionType.ASSESSMENT_TAKE,
        PermissionType.PROGRESS_VIEW,
        PermissionType.DISCUSSION_PARTICIPATE,
      ],
      [UserRole.GUEST]: [
        PermissionType.COURSE_VIEW,
        PermissionType.CONTENT_VIEW,
      ],
    };

    return rolePermissions[userRole]?.includes(action) || false;
  }

  private async checkResourceAccess(
    user: User,
    resource: string,
    resourceId: string
  ): Promise<boolean> {
    switch (resource) {
      case 'course':
        return this.checkCourseOwnership(user, resourceId);
      case 'content':
        return this.checkContentAccess(user, resourceId);
      case 'assessment':
        return this.checkAssessmentAccess(user, resourceId);
      case 'user':
        return this.checkUserAccess(user, resourceId);
      default:
        return false;
    }
  }

  private async checkCourseAccess(
    user: User,
    courseId: string,
    action: PermissionType
  ): Promise<boolean> {
    // Check if user is enrolled in the course
    const isEnrolled = user.enrollments?.some(
      enrollment => enrollment.courseId === courseId
    );

    if (action === PermissionType.COURSE_VIEW && isEnrolled) {
      return true;
    }

    // Check if user is the course creator/teacher
    return this.checkCourseOwnership(user, courseId);
  }

  private async checkCourseOwnership(user: User, courseId: string): Promise<boolean> {
    // In a real implementation, you would query the course repository
    // to check if the user is the creator/instructor of the course
    return true; // Placeholder
  }

  private async checkContentAccess(user: User, contentId: string): Promise<boolean> {
    // Check content access based on course enrollment or creation
    return true; // Placeholder
  }

  private async checkAssessmentAccess(user: User, assessmentId: string): Promise<boolean> {
    // Check assessment access based on course enrollment or creation
    return true; // Placeholder
  }

  private async checkUserAccess(user: User, targetUserId: string): Promise<boolean> {
    // Users can access their own data, admins can access any user data
    return user.id === targetUserId || 
           user.role === UserRole.ADMIN || 
           user.role === UserRole.SUPER_ADMIN;
  }

  private async evaluateCondition(
    user: User,
    check: { condition: string; value: any },
    request: any
  ): Promise<boolean> {
    switch (check.condition) {
      case 'is_active':
        return user.isActive === check.value;
      case 'email_verified':
        return user.emailVerified === check.value;
      case 'within_trial_period':
        return this.isWithinTrialPeriod(user, check.value);
      case 'has_subscription':
        return this.hasActiveSubscription(user);
      case 'request_time':
        return this.isWithinTimeRange(check.value);
      case 'ip_whitelist':
        return this.isIpWhitelisted(request.ip, check.value);
      default:
        return false;
    }
  }

  private isWithinTrialPeriod(user: User, trialDays: number): boolean {
    const trialEndDate = new Date(user.createdAt);
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);
    return new Date() <= trialEndDate;
  }

  private hasActiveSubscription(user: User): boolean {
    // Check if user has active subscription
    return true; // Placeholder
  }

  private isWithinTimeRange(timeRange: { start: string; end: string }): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const startTime = this.parseTime(timeRange.start);
    const endTime = this.parseTime(timeRange.end);
    
    return currentTime >= startTime && currentTime <= endTime;
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private isIpWhitelisted(clientIp: string, whitelist: string[]): boolean {
    return whitelist.includes(clientIp);
  }
}