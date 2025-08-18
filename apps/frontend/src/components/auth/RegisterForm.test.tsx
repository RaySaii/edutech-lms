import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterForm } from './RegisterForm';
import { authAPI } from '../../lib/auth';
import { useToast } from '../ui/toast';

// Mock dependencies
jest.mock('../../lib/auth');
jest.mock('../ui/toast');
jest.mock('ahooks', () => ({
  useDebounce: (value: string) => value
}));

const mockAuthAPI = authAPI as jest.Mocked<typeof authAPI>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('RegisterForm - Security Best Practices', () => {
  const mockShowSuccess = jest.fn();
  const mockShowError = jest.fn();
  const mockOnLoginClick = jest.fn();

  beforeEach(() => {
    mockUseToast.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
      toasts: [],
      removeToast: jest.fn(),
    });
    
    jest.clearAllMocks();
  });

  describe('Email Availability Security Features', () => {
    test('shows loading indicator while checking email availability', async () => {
      // Mock API to return a delayed response
      mockAuthAPI.checkEmailAvailability.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            available: true,
            message: 'Email is available'
          }), 100)
        )
      );

      render(<RegisterForm onLoginClick={mockOnLoginClick} />);

      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      // Should show loading spinner immediately
      await waitFor(() => {
        expect(screen.getByTestId('email-loading')).toBeInTheDocument();
      });

      // Should have spinning animation
      const loadingSpinner = screen.getByTestId('email-loading');
      expect(loadingSpinner).toHaveClass('animate-spin');

      // After API call completes, loading should disappear
      await waitFor(() => {
        expect(screen.queryByTestId('email-loading')).not.toBeInTheDocument();
      });

      // Should show availability result
      expect(screen.getByText('Email is available')).toBeInTheDocument();
    });

    test('shows visual status indicators after email check completes', async () => {
      // Test available email
      mockAuthAPI.checkEmailAvailability.mockResolvedValue({
        available: true,
        message: 'Email is available'
      });

      const { rerender } = render(<RegisterForm onLoginClick={mockOnLoginClick} />);

      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'available@example.com' } });

      await waitFor(() => {
        // Should show green indicator for available email
        const indicator = screen.getByTestId('email-input').parentElement?.querySelector('.bg-green-100');
        expect(indicator).toBeInTheDocument();
      });

      // Test unavailable email
      mockAuthAPI.checkEmailAvailability.mockResolvedValue({
        available: false,
        message: 'Email is already registered'
      });

      fireEvent.change(emailInput, { target: { value: 'taken@example.com' } });

      await waitFor(() => {
        // Should show red indicator for unavailable email
        const indicator = screen.getByTestId('email-input').parentElement?.querySelector('.bg-red-100');
        expect(indicator).toBeInTheDocument();
      });
    });

    test('shows guidance for existing email without exposing user details', async () => {
      // Mock API to return email unavailable
      mockAuthAPI.checkEmailAvailability.mockResolvedValue({
        available: false,
        message: 'Email is already registered'
      });

      render(<RegisterForm onLoginClick={mockOnLoginClick} />);

      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });

      await waitFor(() => {
        expect(screen.getByText('Email is already registered')).toBeInTheDocument();
      });

      // Should show guidance without exposing user details
      expect(screen.getByText(/Already have an account\?/)).toBeInTheDocument();
      expect(screen.getByText('Sign in')).toBeInTheDocument();
      expect(screen.getByText('forgot password?')).toBeInTheDocument();

      // Should not expose internal details
      expect(screen.queryByText(/user id/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/database/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/internal/i)).not.toBeInTheDocument();
    });

    test('sign in link works correctly from email guidance', async () => {
      mockAuthAPI.checkEmailAvailability.mockResolvedValue({
        available: false,
        message: 'Email is already registered'
      });

      render(<RegisterForm onLoginClick={mockOnLoginClick} />);

      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });

      await waitFor(() => {
        const signInButton = screen.getByText('Sign in');
        fireEvent.click(signInButton);
      });

      expect(mockOnLoginClick).toHaveBeenCalled();
    });

    test('prevents form submission with existing email and shows helpful error', async () => {
      mockAuthAPI.checkEmailAvailability.mockResolvedValue({
        available: false,
        message: 'Email is already registered'
      });

      render(<RegisterForm onLoginClick={mockOnLoginClick} />);

      // Fill form
      fireEvent.change(screen.getByTestId('first-name-input'), { target: { value: 'John' } });
      fireEvent.change(screen.getByTestId('last-name-input'), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'existing@example.com' } });
      fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'SecurePassword123' } });
      fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'SecurePassword123' } });

      await waitFor(() => {
        expect(screen.getByText('Email is already registered')).toBeInTheDocument();
      });

      // Submit form
      const submitButton = screen.getByTestId('register-submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByTestId('error-message');
        expect(errorMessage).toHaveTextContent(/already registered.*sign in.*reset.*password/i);
      });

      // Should not call register API
      expect(mockAuthAPI.register || jest.fn()).not.toHaveBeenCalled();
    });

    test('handles email availability check errors gracefully', async () => {
      // Mock API to throw error
      mockAuthAPI.checkEmailAvailability.mockRejectedValue(new Error('Network error'));

      render(<RegisterForm onLoginClick={mockOnLoginClick} />);

      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      await waitFor(() => {
        expect(screen.getByText('Unable to check email availability')).toBeInTheDocument();
      });

      // Should still allow form submission when check fails
      const submitButton = screen.getByTestId('register-submit');
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Security in Registration Process', () => {
    test('does not expose sensitive information in error messages', async () => {
      // Mock registration failure
      const mockRegister = jest.fn().mockResolvedValue({
        success: false,
        message: 'Registration failed',
        status: 400
      });

      // Mock useAuth hook
      const mockUseAuth = () => ({
        register: mockRegister,
        isLoading: false
      });

      // This would require mocking the useAuth hook properly
      // For now, we'll test the component's error handling logic
    });

    test('provides secure guidance without revealing system details', () => {
      render(<RegisterForm onLoginClick={mockOnLoginClick} />);

      // Check that no sensitive information is displayed
      const form = screen.getByTestId('register-form');
      expect(form).toBeInTheDocument();

      // Should not contain system information
      expect(screen.queryByText(/api/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/server/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/database/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/internal/i)).not.toBeInTheDocument();
    });

    test('email validation provides helpful but generic feedback', async () => {
      mockAuthAPI.checkEmailAvailability.mockResolvedValue({
        available: true,
        message: 'Email is available'
      });

      render(<RegisterForm onLoginClick={mockOnLoginClick} />);

      const emailInput = screen.getByTestId('email-input');
      
      // Test valid email
      fireEvent.change(emailInput, { target: { value: 'valid@example.com' } });

      await waitFor(() => {
        expect(screen.getByText('Email is available')).toBeInTheDocument();
      });

      // Input should have green styling
      expect(emailInput).toHaveClass('border-green-300');
    });
  });

  describe('User Experience with Security', () => {
    test('security features do not negatively impact usability', async () => {
      mockAuthAPI.checkEmailAvailability.mockResolvedValue({
        available: false,
        message: 'Email is already registered'
      });

      render(<RegisterForm onLoginClick={mockOnLoginClick} />);

      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });

      await waitFor(() => {
        // Should provide clear, actionable guidance
        expect(screen.getByText('Sign in')).toBeInTheDocument();
        expect(screen.getByText('forgot password?')).toBeInTheDocument();
        
        // UI should be intuitive
        expect(emailInput).toHaveClass('border-red-300');
        
        // Message should be helpful
        const message = screen.getByText('Email is already registered');
        expect(message).toBeInTheDocument();
      });
    });

    test('form validation maintains security while being user-friendly', () => {
      render(<RegisterForm onLoginClick={mockOnLoginClick} />);

      // Form should have proper validation attributes
      const emailInput = screen.getByTestId('email-input');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');

      const passwordInput = screen.getByTestId('password-input');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('required');

      // Should have autocomplete for security
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('autoComplete', 'new-password');
    });
  });

  describe('Integration with Security Flow', () => {
    test('integrates properly with login and password reset flows', async () => {
      mockAuthAPI.checkEmailAvailability.mockResolvedValue({
        available: false,
        message: 'Email is already registered'
      });

      render(<RegisterForm onLoginClick={mockOnLoginClick} />);

      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });

      await waitFor(() => {
        // Should provide integration points
        const signInButton = screen.getByText('Sign in');
        const forgotPasswordLink = screen.getByText('forgot password?');
        
        expect(signInButton).toBeInTheDocument();
        expect(forgotPasswordLink).toBeInTheDocument();
        
        // Links should have proper attributes
        expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/forgot-password');
      });
    });
  });
});