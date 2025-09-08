import { SetMetadata } from '@nestjs/common';
import { PermissionType } from '@edutech-lms/common';

export interface AdvancedPermissionConfig {
  action: PermissionType;
  resource?: string;
  resourceParam?: string; // Parameter name from request
  organizationParam?: string;
  courseParam?: string;
  conditionalChecks?: Array<{
    condition: string;
    value: any;
  }>;
  errorMessage?: string;
}

export const RequireAdvancedPermissions = (...permissions: AdvancedPermissionConfig[]) =>
  SetMetadata('advanced-permissions', permissions);

// Convenience decorators for common permission patterns

export const RequireCourseAccess = (action: PermissionType, courseParam: string = 'courseId') =>
  RequireAdvancedPermissions({
    action,
    resource: 'course',
    courseParam,
  });

export const RequireContentAccess = (action: PermissionType, contentParam: string = 'contentId') =>
  RequireAdvancedPermissions({
    action,
    resource: 'content',
    resourceParam: contentParam,
  });

export const RequireAssessmentAccess = (action: PermissionType, assessmentParam: string = 'assessmentId') =>
  RequireAdvancedPermissions({
    action,
    resource: 'assessment',
    resourceParam: assessmentParam,
  });

export const RequireUserAccess = (action: PermissionType, userParam: string = 'userId') =>
  RequireAdvancedPermissions({
    action,
    resource: 'user',
    resourceParam: userParam,
  });

export const RequireOrganizationAccess = (action: PermissionType, orgParam: string = 'organizationId') =>
  RequireAdvancedPermissions({
    action,
    organizationParam: orgParam,
  });

export const RequireActiveSubscription = (action: PermissionType) =>
  RequireAdvancedPermissions({
    action,
    conditionalChecks: [
      { condition: 'has_subscription', value: true }
    ],
    errorMessage: 'Active subscription required',
  });

export const RequireVerifiedEmail = (action: PermissionType) =>
  RequireAdvancedPermissions({
    action,
    conditionalChecks: [
      { condition: 'email_verified', value: true }
    ],
    errorMessage: 'Email verification required',
  });

export const RequireBusinessHours = (action: PermissionType, start: string = '09:00', end: string = '17:00') =>
  RequireAdvancedPermissions({
    action,
    conditionalChecks: [
      { condition: 'request_time', value: { start, end } }
    ],
    errorMessage: 'Action only allowed during business hours',
  });

export const RequireIpWhitelist = (action: PermissionType, whitelist: string[]) =>
  RequireAdvancedPermissions({
    action,
    conditionalChecks: [
      { condition: 'ip_whitelist', value: whitelist }
    ],
    errorMessage: 'Access denied from this IP address',
  });

// Composite decorators for complex scenarios

export const RequireCourseTeacherOrAdmin = (courseParam: string = 'courseId') =>
  RequireAdvancedPermissions(
    {
      action: PermissionType.COURSE_EDIT,
      resource: 'course',
      courseParam,
    },
    {
      action: PermissionType.USER_MANAGEMENT, // Admin fallback
    }
  );

export const RequireCourseEnrollmentOrTeacher = (courseParam: string = 'courseId') =>
  RequireAdvancedPermissions(
    {
      action: PermissionType.COURSE_VIEW,
      resource: 'course',
      courseParam,
    }
  );

export const RequireTrialOrSubscription = (action: PermissionType, trialDays: number = 30) =>
  RequireAdvancedPermissions({
    action,
    conditionalChecks: [
      { condition: 'within_trial_period', value: trialDays },
      { condition: 'has_subscription', value: true }
    ],
    errorMessage: 'Trial period expired or subscription required',
  });

export const RequireOrganizationOwnerOrSuperAdmin = (orgParam: string = 'organizationId') =>
  RequireAdvancedPermissions(
    {
      action: PermissionType.ORGANIZATION_MANAGEMENT,
      organizationParam: orgParam,
    },
    {
      action: PermissionType.SYSTEM_ADMIN, // Super admin fallback
    }
  );