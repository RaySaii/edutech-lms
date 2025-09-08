import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import QuickActions from './QuickActions';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('QuickActions', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    } as any);

    jest.clearAllMocks();
  });

  describe('Student Quick Actions', () => {
    it('should render student quick actions', () => {
      render(<QuickActions userRole="STUDENT" />);

      expect(screen.getByTestId('quick-action-browse-courses')).toBeInTheDocument();
      expect(screen.getByText('Browse Courses')).toBeInTheDocument();
      expect(screen.getByText('Discover new learning opportunities')).toBeInTheDocument();

      expect(screen.getByTestId('quick-action-my-learning')).toBeInTheDocument();
      expect(screen.getByText('My Learning')).toBeInTheDocument();
      expect(screen.getByText('Continue your enrolled courses')).toBeInTheDocument();

      expect(screen.getByTestId('quick-action-progress')).toBeInTheDocument();
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('Track your learning progress')).toBeInTheDocument();

      expect(screen.getByTestId('quick-action-account-settings')).toBeInTheDocument();
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
      expect(screen.getByText('Manage your profile and preferences')).toBeInTheDocument();
    });

    it('should navigate correctly for student actions', () => {
      render(<QuickActions userRole="STUDENT" />);

      fireEvent.click(screen.getByTestId('quick-action-browse-courses'));
      expect(mockPush).toHaveBeenCalledWith('/courses');

      fireEvent.click(screen.getByTestId('quick-action-my-learning'));
      expect(mockPush).toHaveBeenCalledWith('/courses/enrollments/my');

      fireEvent.click(screen.getByTestId('quick-action-progress'));
      expect(mockPush).toHaveBeenCalledWith('/progress');

      fireEvent.click(screen.getByTestId('quick-action-account-settings'));
      expect(mockPush).toHaveBeenCalledWith('/settings');
    });
  });

  describe('Instructor Quick Actions', () => {
    it('should render instructor quick actions', () => {
      render(<QuickActions userRole="INSTRUCTOR" />);

      expect(screen.getByTestId('quick-action-create-course')).toBeInTheDocument();
      expect(screen.getByText('Create Course')).toBeInTheDocument();
      expect(screen.getByText('Start building a new course')).toBeInTheDocument();

      expect(screen.getByTestId('quick-action-my-courses')).toBeInTheDocument();
      expect(screen.getByText('My Courses')).toBeInTheDocument();
      expect(screen.getByText('Manage your existing courses')).toBeInTheDocument();

      expect(screen.getByTestId('quick-action-students')).toBeInTheDocument();
      expect(screen.getByText('Students')).toBeInTheDocument();
      expect(screen.getByText('View enrolled students')).toBeInTheDocument();

      expect(screen.getByTestId('quick-action-analytics')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('View course performance')).toBeInTheDocument();
    });

    it('should navigate correctly for instructor actions', () => {
      render(<QuickActions userRole="INSTRUCTOR" />);

      fireEvent.click(screen.getByTestId('quick-action-create-course'));
      expect(mockPush).toHaveBeenCalledWith('/courses/create');

      fireEvent.click(screen.getByTestId('quick-action-my-courses'));
      expect(mockPush).toHaveBeenCalledWith('/courses?filter=my-courses');

      fireEvent.click(screen.getByTestId('quick-action-students'));
      expect(mockPush).toHaveBeenCalledWith('/students');

      fireEvent.click(screen.getByTestId('quick-action-analytics'));
      expect(mockPush).toHaveBeenCalledWith('/analytics');
    });
  });

  describe('Role-based Actions', () => {
    it('should not show instructor actions for students', () => {
      render(<QuickActions userRole="STUDENT" />);

      expect(screen.queryByTestId('quick-action-create-course')).not.toBeInTheDocument();
      expect(screen.queryByTestId('quick-action-students')).not.toBeInTheDocument();
      expect(screen.queryByTestId('quick-action-analytics')).not.toBeInTheDocument();
    });

    it('should not show student-specific actions for instructors', () => {
      render(<QuickActions userRole="INSTRUCTOR" />);

      expect(screen.queryByTestId('quick-action-browse-courses')).not.toBeInTheDocument();
      expect(screen.queryByTestId('quick-action-my-learning')).not.toBeInTheDocument();
    });

    it('should handle unknown roles gracefully', () => {
      render(<QuickActions userRole="UNKNOWN_ROLE" />);

      // Should default to student actions
      expect(screen.getByTestId('quick-action-browse-courses')).toBeInTheDocument();
      expect(screen.getByTestId('quick-action-my-learning')).toBeInTheDocument();
      expect(screen.getByTestId('quick-action-progress')).toBeInTheDocument();
      expect(screen.getByTestId('quick-action-account-settings')).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('should apply hover effects', () => {
      render(<QuickActions userRole="STUDENT" />);

      const browseCoursesButton = screen.getByTestId('quick-action-browse-courses');
      
      expect(browseCoursesButton).toHaveClass('hover:shadow-md');
      expect(browseCoursesButton).toHaveClass('transition-all');
    });

    it('should have proper grid layout', () => {
      render(<QuickActions userRole="STUDENT" />);

      const container = screen.getByText('Quick Actions').nextElementSibling;
      expect(container).toHaveClass('grid');
      expect(container).toHaveClass('grid-cols-1');
      expect(container).toHaveClass('md:grid-cols-2');
    });
  });

  describe('Accessibility', () => {
    it('should have proper button elements', () => {
      render(<QuickActions userRole="STUDENT" />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4); // 4 quick actions for students

      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
        expect(button).toBeEnabled();
      });
    });

    it('should have descriptive text content', () => {
      render(<QuickActions userRole="INSTRUCTOR" />);

      // Each action should have both a title and description
      expect(screen.getByText('Create Course')).toBeInTheDocument();
      expect(screen.getByText('Start building a new course')).toBeInTheDocument();

      expect(screen.getByText('My Courses')).toBeInTheDocument();
      expect(screen.getByText('Manage your existing courses')).toBeInTheDocument();
    });
  });

  describe('Icon Rendering', () => {
    it('should render icons for all actions', () => {
      render(<QuickActions userRole="STUDENT" />);

      // Check that each button contains an SVG icon
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const svg = button.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Clicks', () => {
    it('should handle multiple rapid clicks', () => {
      render(<QuickActions userRole="STUDENT" />);

      const browseButton = screen.getByTestId('quick-action-browse-courses');
      
      fireEvent.click(browseButton);
      fireEvent.click(browseButton);
      fireEvent.click(browseButton);

      expect(mockPush).toHaveBeenCalledTimes(3);
      expect(mockPush).toHaveBeenCalledWith('/courses');
    });
  });
});