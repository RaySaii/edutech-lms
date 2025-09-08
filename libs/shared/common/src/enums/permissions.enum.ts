export enum Permission {
  // Course Permissions - Self-learning focused
  COURSE_READ = 'course:read',
  COURSE_ENROLL = 'course:enroll',
  COURSE_COMPLETE = 'course:complete',

  // Learning Permissions
  LEARNING_PROGRESS = 'learning:progress',
  LEARNING_CERTIFICATE = 'learning:certificate',
  LEARNING_REVIEW = 'learning:review',
  LEARNING_BOOKMARK = 'learning:bookmark',

  // User Management - Basic self-service
  USER_PROFILE_UPDATE = 'user:profile_update',
  USER_PASSWORD_CHANGE = 'user:password_change',
  USER_SETTINGS = 'user:settings',

  // Assessment Permissions - Self-assessment only
  ASSESSMENT_TAKE = 'assessment:take',
  ASSESSMENT_VIEW_RESULTS = 'assessment:view_results',
  ASSESSMENT_RETRY = 'assessment:retry',

  // Teacher Permissions - Course creation and management
  COURSE_CREATE = 'course:create',
  COURSE_UPDATE = 'course:update',
  COURSE_DELETE = 'course:delete',
  CONTENT_CREATE = 'content:create',
  CONTENT_UPDATE = 'content:update',
  CONTENT_DELETE = 'content:delete',
  STUDENT_PROGRESS_VIEW = 'student:progress_view',

  // Admin Permissions - System maintenance only
  ADMIN_SYSTEM = 'admin:system',
  ADMIN_COURSES = 'admin:courses',
  ADMIN_USERS = 'admin:users',
}

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  'admin': [
    // All permissions for system administration
    ...Object.values(Permission)
  ],
  
  'teacher': [
    // Student permissions + course creation/management
    Permission.COURSE_READ,
    Permission.COURSE_ENROLL,
    Permission.COURSE_COMPLETE,
    Permission.LEARNING_PROGRESS,
    Permission.LEARNING_CERTIFICATE,
    Permission.LEARNING_REVIEW,
    Permission.LEARNING_BOOKMARK,
    Permission.ASSESSMENT_TAKE,
    Permission.ASSESSMENT_VIEW_RESULTS,
    Permission.ASSESSMENT_RETRY,
    Permission.USER_PROFILE_UPDATE,
    Permission.USER_PASSWORD_CHANGE,
    Permission.USER_SETTINGS,
    // Teacher-specific permissions
    Permission.COURSE_CREATE,
    Permission.COURSE_UPDATE,
    Permission.COURSE_DELETE,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_UPDATE,
    Permission.CONTENT_DELETE,
    Permission.STUDENT_PROGRESS_VIEW,
  ],
  
  'student': [
    // Self-learning permissions
    Permission.COURSE_READ,
    Permission.COURSE_ENROLL,
    Permission.COURSE_COMPLETE,
    Permission.LEARNING_PROGRESS,
    Permission.LEARNING_CERTIFICATE,
    Permission.LEARNING_REVIEW,
    Permission.LEARNING_BOOKMARK,
    Permission.ASSESSMENT_TAKE,
    Permission.ASSESSMENT_VIEW_RESULTS,
    Permission.ASSESSMENT_RETRY,
    Permission.USER_PROFILE_UPDATE,
    Permission.USER_PASSWORD_CHANGE,
    Permission.USER_SETTINGS,
  ],
};