export * from './lib/shared-database.module';
export * from './entities/base.entity';
export * from './entities/user.entity';
export * from './entities/organization.entity';
export * from './entities/course.entity';
export * from './entities/enrollment.entity';
export * from './entities/course-review.entity';
export * from './entities/content.entity';
export * from './entities/content-progress.entity';
export * from './entities/notification.entity';
export * from './entities/notification-preference.entity';
export * from './entities/notification-template.entity';

// Export notification enums separately for better importing
export {
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  NotificationCategory,
} from './entities/notification.entity';

export {
  NotificationFrequency,
} from './entities/notification-preference.entity';

export {
  TemplateStatus,
} from './entities/notification-template.entity';
export * from './entities/content-version.entity';
export * from './entities/media-asset.entity';
export * from './entities/content-approval.entity';
export * from './entities/assessment.entity';
export * from './entities/assessment-question.entity';
export * from './entities/assessment-attempt.entity';
export * from './entities/assessment-answer.entity';

// Export course enums from shared-common
export { EnrollmentStatus } from '../../../shared/common/src/enums/course.enums';

// Export analytics enums
export {
  MetricType,
  AggregationType,
  ReportType,
  ReportFormat,
} from './entities/analytics.entity';

// Export all entity files
export * from './entities';