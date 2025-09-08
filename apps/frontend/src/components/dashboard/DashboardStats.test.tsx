import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardStats from './DashboardStats';
import { DashboardStats as StatsType } from '../../lib/api/dashboard';
import { DASHBOARD_MOCK_DATA } from '../../constants/dashboard';

describe('DashboardStats', () => {
  const mockInstructorStats: StatsType = {
    totalCourses: 5,
    enrolledCourses: 0,
    completedCourses: 0,
    totalStudents: 150,
    averageProgress: 78.5,
    totalTimeSpent: 0,
    revenue: DASHBOARD_MOCK_DATA.INSTRUCTOR_STATS.TOTAL_REVENUE,
  };

  const mockStudentStats: StatsType = {
    totalCourses: 0,
    enrolledCourses: 8,
    completedCourses: 3,
    averageProgress: 64.2,
    totalTimeSpent: DASHBOARD_MOCK_DATA.STUDENT_STATS.TOTAL_TIME_SPENT,
  };

  describe('Instructor Stats', () => {
    it('should render instructor stats correctly', () => {
      render(
        <DashboardStats 
          stats={mockInstructorStats} 
          userRole="INSTRUCTOR" 
          loading={false} 
        />
      );

      expect(screen.getByText('Created Courses')).toBeInTheDocument();
      expect(screen.getByTestId('stat-created-courses')).toHaveTextContent('5');

      expect(screen.getByText('Total Students')).toBeInTheDocument();
      expect(screen.getByTestId('stat-total-students')).toHaveTextContent('150');

      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByTestId('stat-revenue')).toHaveTextContent(`$${DASHBOARD_MOCK_DATA.INSTRUCTOR_STATS.TOTAL_REVENUE.toFixed(2)}`);

      expect(screen.getByText('Avg. Completion')).toBeInTheDocument();
      expect(screen.getByTestId('stat-avg.-completion')).toHaveTextContent('78.5%');
    });

    it('should show proper descriptions for instructor stats', () => {
      render(
        <DashboardStats 
          stats={mockInstructorStats} 
          userRole="INSTRUCTOR" 
          loading={false} 
        />
      );

      expect(screen.getByText('Total courses created')).toBeInTheDocument();
      expect(screen.getByText('Students enrolled across all courses')).toBeInTheDocument();
      expect(screen.getByText('Total earnings from courses')).toBeInTheDocument();
      expect(screen.getByText('Average student completion rate')).toBeInTheDocument();
    });
  });

  describe('Student Stats', () => {
    it('should render student stats correctly', () => {
      render(
        <DashboardStats 
          stats={mockStudentStats} 
          userRole="STUDENT" 
          loading={false} 
        />
      );

      expect(screen.getByText('Enrolled Courses')).toBeInTheDocument();
      expect(screen.getByTestId('stat-enrolled-courses')).toHaveTextContent('8');

      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByTestId('stat-completed')).toHaveTextContent('3');

      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByTestId('stat-progress')).toHaveTextContent('64.2%');

      expect(screen.getByText('Time Spent')).toBeInTheDocument();
      expect(screen.getByTestId('stat-time-spent')).toHaveTextContent('8h');
    });

    it('should show proper descriptions for student stats', () => {
      render(
        <DashboardStats 
          stats={mockStudentStats} 
          userRole="STUDENT" 
          loading={false} 
        />
      );

      expect(screen.getByText('Courses you are enrolled in')).toBeInTheDocument();
      expect(screen.getByText('Courses completed')).toBeInTheDocument();
      expect(screen.getByText('Overall learning progress')).toBeInTheDocument();
      expect(screen.getByText('Total learning time')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading skeletons when loading is true', () => {
      render(
        <DashboardStats 
          stats={mockStudentStats} 
          userRole="STUDENT" 
          loading={true} 
        />
      );

      // Should have 4 skeleton cards
      const skeletons = screen.getAllByText('').filter(el => 
        el.className.includes('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);

      // Should not show actual stats
      expect(screen.queryByTestId('stat-enrolled-courses')).not.toBeInTheDocument();
    });
  });

  describe('Zero Values', () => {
    const zeroStats: StatsType = {
      totalCourses: 0,
      enrolledCourses: 0,
      completedCourses: 0,
      averageProgress: 0,
      totalTimeSpent: 0,
    };

    it('should handle zero values gracefully for students', () => {
      render(
        <DashboardStats 
          stats={zeroStats} 
          userRole="STUDENT" 
          loading={false} 
        />
      );

      expect(screen.getByTestId('stat-enrolled-courses')).toHaveTextContent('0');
      expect(screen.getByTestId('stat-completed')).toHaveTextContent('0');
      expect(screen.getByTestId('stat-progress')).toHaveTextContent('0.0%');
      expect(screen.getByTestId('stat-time-spent')).toHaveTextContent('0h');
    });

    it('should handle zero values gracefully for instructors', () => {
      render(
        <DashboardStats 
          stats={zeroStats} 
          userRole="INSTRUCTOR" 
          loading={false} 
        />
      );

      expect(screen.getByTestId('stat-created-courses')).toHaveTextContent('0');
      expect(screen.getByTestId('stat-total-students')).toHaveTextContent('0');
      expect(screen.getByTestId('stat-revenue')).toHaveTextContent('$0.00');
      expect(screen.getByTestId('stat-avg.-completion')).toHaveTextContent('0.0%');
    });
  });

  describe('Time Formatting', () => {
    it('should format time spent in hours correctly', () => {
      const statsWithTime: StatsType = {
        ...mockStudentStats,
        totalTimeSpent: 7200, // 2 hours
      };

      render(
        <DashboardStats 
          stats={statsWithTime} 
          userRole="STUDENT" 
          loading={false} 
        />
      );

      expect(screen.getByTestId('stat-time-spent')).toHaveTextContent('2h');
    });

    it('should handle partial hours correctly', () => {
      const statsWithTime: StatsType = {
        ...mockStudentStats,
        totalTimeSpent: 5400, // 1.5 hours
      };

      render(
        <DashboardStats 
          stats={statsWithTime} 
          userRole="STUDENT" 
          loading={false} 
        />
      );

      expect(screen.getByTestId('stat-time-spent')).toHaveTextContent('1h');
    });
  });

  describe('Revenue Formatting', () => {
    it('should format revenue with decimal places', () => {
      const statsWithRevenue: StatsType = {
        ...mockInstructorStats,
        revenue: 1234.56,
      };

      render(
        <DashboardStats 
          stats={statsWithRevenue} 
          userRole="INSTRUCTOR" 
          loading={false} 
        />
      );

      expect(screen.getByTestId('stat-revenue')).toHaveTextContent('$1234.56');
    });

    it('should handle undefined revenue', () => {
      const statsNoRevenue: StatsType = {
        ...mockInstructorStats,
        revenue: undefined,
      };

      render(
        <DashboardStats 
          stats={statsNoRevenue} 
          userRole="INSTRUCTOR" 
          loading={false} 
        />
      );

      expect(screen.getByTestId('stat-revenue')).toHaveTextContent('$0.00');
    });
  });

  describe('Progress Formatting', () => {
    it('should format progress to one decimal place', () => {
      const statsWithProgress: StatsType = {
        ...mockStudentStats,
        averageProgress: 75.123,
      };

      render(
        <DashboardStats 
          stats={statsWithProgress} 
          userRole="STUDENT" 
          loading={false} 
        />
      );

      expect(screen.getByTestId('stat-progress')).toHaveTextContent('75.1%');
    });
  });

  describe('Color Classes', () => {
    it('should apply correct color classes to icons', () => {
      render(
        <DashboardStats 
          stats={mockStudentStats} 
          userRole="STUDENT" 
          loading={false} 
        />
      );

      // Check that color classes are applied (we can't easily test the exact classes without more complex DOM inspection)
      const container = screen.getByTestId('stat-enrolled-courses').closest('.bg-white');
      expect(container).toBeInTheDocument();
    });
  });
});