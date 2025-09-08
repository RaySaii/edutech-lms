export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}


export enum MetricType {
  USER_ENGAGEMENT = 'user_engagement',
  COURSE_COMPLETION = 'course_completion',
  ASSESSMENT_PERFORMANCE = 'assessment_performance',
  REVENUE = 'revenue',
  SYSTEM_USAGE = 'system_usage',
}

export enum AggregationType {
  COUNT = 'count',
  SUM = 'sum',
  AVERAGE = 'average',
  MINIMUM = 'minimum',
  MAXIMUM = 'maximum',
  PERCENTAGE = 'percentage',
}