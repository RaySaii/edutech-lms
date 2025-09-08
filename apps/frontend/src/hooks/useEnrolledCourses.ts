import { useState, useEffect } from 'react';
import { courseAPI } from '../lib/api/courses';

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

interface UseEnrolledCoursesResult {
  enrolledCourses: Enrollment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useEnrolledCourses(): UseEnrolledCoursesResult {
  const [enrolledCourses, setEnrolledCourses] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrolledCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 useEnrolledCourses: Starting fetch...');
      const response = await courseAPI.getMyEnrollments();
      console.log('📡 useEnrolledCourses: API response:', response);
      if (response.success) {
        console.log('✅ useEnrolledCourses: Success, setting courses:', response.data?.length || 0, 'courses');
        setEnrolledCourses(response.data || []);
      } else {
        console.log('❌ useEnrolledCourses: API returned success=false');
        setError('Failed to load enrolled courses');
      }
    } catch (error) {
      console.error('❌ useEnrolledCourses: API call failed:', error);
      setError('Failed to load enrolled courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  return {
    enrolledCourses,
    loading,
    error,
    refetch: fetchEnrolledCourses,
  };
}