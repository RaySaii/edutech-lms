import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  status: 'draft' | 'published' | 'archived';
  level: string;
  thumbnail?: string;
  tags: string[];
  enrollmentCount: number;
  rating: string;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  instructorId: string;
  organizationId: string;
}

interface TeacherStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalStudents: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
}

export const useTeacherCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        
        if (!token) {
          throw new Error('No access token found');
        }

        // Fetch instructor courses
        const response = await fetch('http://localhost:3000/api/courses/my-courses', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch courses: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          const coursesData = Array.isArray(data.data) ? data.data : [data.data];
          setCourses(coursesData);
          
          // Calculate stats from real course data
          const totalCourses = coursesData.length;
          const publishedCourses = coursesData.filter((c: Course) => c.status === 'published').length;
          const draftCourses = coursesData.filter((c: Course) => c.status === 'draft').length;
          const totalStudents = coursesData.reduce((sum: number, c: Course) => sum + (c.enrollmentCount || 0), 0);
          const totalRevenue = coursesData.reduce((sum: number, c: Course) => sum + (c.price * (c.enrollmentCount || 0)), 0);
          const totalReviews = coursesData.reduce((sum: number, c: Course) => sum + (c.reviewCount || 0), 0);
          const averageRating = totalReviews > 0 
            ? coursesData.reduce((sum: number, c: Course) => sum + parseFloat(c.rating || '0'), 0) / coursesData.length
            : 0;

          setStats({
            totalCourses,
            publishedCourses,
            draftCourses,
            totalStudents,
            totalRevenue,
            averageRating,
            totalReviews
          });
        } else {
          // Handle case where no courses exist yet
          setCourses([]);
          setStats({
            totalCourses: 0,
            publishedCourses: 0,
            draftCourses: 0,
            totalStudents: 0,
            totalRevenue: 0,
            averageRating: 0,
            totalReviews: 0
          });
        }
      } catch (err) {
        console.error('Error fetching teacher courses:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch courses');
        
        // Set empty state on error
        setCourses([]);
        setStats({
          totalCourses: 0,
          publishedCourses: 0,
          draftCourses: 0,
          totalStudents: 0,
          totalRevenue: 0,
          averageRating: 0,
          totalReviews: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user]);

  const refetch = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch('http://localhost:3000/api/courses/my-courses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch courses: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        const coursesData = Array.isArray(data.data) ? data.data : [data.data];
        setCourses(coursesData);
        
        const totalCourses = coursesData.length;
        const publishedCourses = coursesData.filter((c: Course) => c.status === 'published').length;
        const draftCourses = coursesData.filter((c: Course) => c.status === 'draft').length;
        const totalStudents = coursesData.reduce((sum: number, c: Course) => sum + (c.enrollmentCount || 0), 0);
        const totalRevenue = coursesData.reduce((sum: number, c: Course) => sum + (c.price * (c.enrollmentCount || 0)), 0);
        const totalReviews = coursesData.reduce((sum: number, c: Course) => sum + (c.reviewCount || 0), 0);
        const averageRating = totalReviews > 0 
          ? coursesData.reduce((sum: number, c: Course) => sum + parseFloat(c.rating || '0'), 0) / coursesData.length
          : 0;

        setStats({
          totalCourses,
          publishedCourses,
          draftCourses,
          totalStudents,
          totalRevenue,
          averageRating,
          totalReviews
        });
      }
    } catch (err) {
      console.error('Error refetching teacher courses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  return {
    courses,
    stats,
    loading,
    error,
    refetch
  };
};

export default useTeacherCourses;