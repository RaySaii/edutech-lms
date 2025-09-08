import { CourseStatus, CourseLevel } from '@edutech-lms/common';

export interface CourseLesson {
  id: string;
  title: string;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  content: string;
  duration: number;
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

export interface CourseCurriculum {
  modules: CourseModule[];
}

export interface CourseInstructor {
  id: string;
  firstName: string;
  lastName: string;
}

export interface CourseData {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  thumbnail?: string;
  price: number;
  status: CourseStatus;
  level: CourseLevel;
  tags?: string[];
  curriculum?: CourseCurriculum;
  enrollmentCount: number;
  rating: number;
  reviewCount: number;
  organizationId: string;
  instructorId: string;
  instructor: CourseInstructor;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  enrollment?: any; // User's enrollment data if available
}

export interface CourseResponse {
  success: boolean;
  message?: string;
  data: CourseData;
}

export interface CoursesResponse {
  success: boolean;
  data: {
    courses: CourseData[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}