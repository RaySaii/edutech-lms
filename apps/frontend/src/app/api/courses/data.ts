// Simple in-memory mock data to support E2E flows
export type Level = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface MockCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  status: 'draft' | 'published' | 'archived';
  level: Level;
  category?: string;
  enrollmentCount: number;
  rating: number;
  reviewCount: number;
  instructorId: string;
  instructor: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface MockEnrollment {
  id: string;
  enrolledAt: string;
  lastAccessedAt?: string;
  timeSpent?: number;
  progress?: number;
  course?: Pick<MockCourse, 'id' | 'title' | 'description' | 'category'> & {
    instructor?: { firstName?: string; lastName?: string };
  };
}

export const mockCourses: MockCourse[] = [
  {
    id: 'course-1',
    title: 'JavaScript Fundamentals',
    slug: 'javascript-fundamentals',
    description: 'Learn the basics of JavaScript with hands-on examples.',
    price: 0,
    status: 'published',
    level: 'beginner',
    category: 'programming',
    enrollmentCount: 1250,
    rating: 4.7,
    reviewCount: 320,
    instructorId: 'inst-1',
    instructor: { id: 'inst-1', firstName: 'Jane', lastName: 'Doe' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'course-2',
    title: 'Advanced JavaScript Patterns',
    slug: 'advanced-javascript-patterns',
    description: 'Deep dive into advanced patterns and best practices.',
    price: 99.99,
    status: 'published',
    level: 'intermediate',
    category: 'programming',
    enrollmentCount: 890,
    rating: 4.8,
    reviewCount: 220,
    instructorId: 'inst-2',
    instructor: { id: 'inst-2', firstName: 'John', lastName: 'Smith' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const mockEnrollments: MockEnrollment[] = [
  {
    id: 'enr-1',
    enrolledAt: new Date(Date.now() - 86400000).toISOString(),
    lastAccessedAt: new Date().toISOString(),
    timeSpent: 3600,
    progress: 25,
    course: {
      id: 'course-1',
      title: 'JavaScript Fundamentals',
      description: 'Learn the basics of JavaScript with hands-on examples.',
      category: 'programming',
      instructor: { firstName: 'Jane', lastName: 'Doe' },
    },
  },
];

export const findCourse = (id: string) => mockCourses.find((c) => c.id === id);

