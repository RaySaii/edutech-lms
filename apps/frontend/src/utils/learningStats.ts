/**
 * Shared utility functions for calculating learning statistics
 * This ensures consistency between Dashboard and My Learning pages
 */

interface Enrollment {
  id: string;
  progress?: number;
  enrolledAt: string;
  lastAccessedAt?: string;
  timeSpent?: number;
  course?: {
    id: string;
    title: string;
    description?: string;
    thumbnail?: string;
    instructor?: {
      firstName?: string;
      lastName?: string;
    };
    category?: string;
    rating?: number;
    status?: string;
  };
}

export interface LearningStats {
  totalCourses: number;
  enrolledCourses: number;
  completedCourses: number;
  averageProgress: number;
  totalTimeSpent: number; // in seconds
  totalHours: number; // calculated from timeSpent
  certificates: number;
  inProgressCourses: number;
  notStartedCourses: number;
}

/**
 * Calculate standardized learning statistics from enrollment data
 * @param enrollments Array of enrollment objects
 * @returns Standardized learning statistics
 */
export function calculateLearningStats(enrollments: Enrollment[]): LearningStats {
  const totalCourses = enrollments.length;
  const completedCourses = enrollments.filter(enrollment => enrollment.progress === 100).length;
  const inProgressCourses = enrollments.filter(enrollment => 
    (enrollment.progress || 0) > 0 && (enrollment.progress || 0) < 100
  ).length;
  const notStartedCourses = enrollments.filter(enrollment => (enrollment.progress || 0) === 0).length;
  
  // Calculate total time spent (sum all timeSpent values)
  const totalTimeSpent = enrollments.reduce((sum, enrollment) => 
    sum + (enrollment.timeSpent || 0), 0
  );
  
  // Calculate average progress
  const averageProgress = totalCourses > 0 
    ? enrollments.reduce((sum, enrollment) => sum + (enrollment.progress || 0), 0) / totalCourses
    : 0;
  
  const stats = {
    totalCourses,
    enrolledCourses: totalCourses, // Same as totalCourses for enrolled students
    completedCourses,
    averageProgress,
    totalTimeSpent,
    totalHours: totalTimeSpent / 3600, // Convert seconds to hours
    certificates: completedCourses, // Certificates = completed courses
    inProgressCourses,
    notStartedCourses
  };
  
  console.log('📊 Standardized Learning Stats:', stats);
  return stats;
}

/**
 * Format time duration in a human-readable format
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format date in a consistent format across the application
 * @param dateString ISO date string
 * @returns Formatted date
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Calculate progress percentage and ensure it's within 0-100 range
 * @param progress Raw progress value
 * @returns Sanitized progress percentage
 */
export function sanitizeProgress(progress?: number): number {
  if (typeof progress !== 'number' || isNaN(progress)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(progress)));
}