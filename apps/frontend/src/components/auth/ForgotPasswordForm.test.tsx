import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { authAPI } from '../../lib/auth';
import { useToast } from '../ui/toast';

// Mock dependencies
jest.mock('../../lib/auth');
jest.mock('../ui/toast');

const mockAuthAPI = authAPI as jest.Mocked<typeof authAPI>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('ForgotPasswordForm - Security Best Practices', () => {
  const mockShowSuccess = jest.fn();
  const mockShowError = jest.fn();
  const mockOnBackClick = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    mockUseToast.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
      toasts: [],
      removeToast: jest.fn(),
    });
    
    jest.clearAllMocks();
  });

  describe('Generic Messaging Security', () => {
    test('shows generic success message regardless of user existence', async () => {
      // Mock API success
      mockAuthAPI.forgotPassword.mockResolvedValue({
        success: true,
        message: 'Password reset instructions sent'
      });

      render(<ForgotPasswordForm onBackClick={mockOnBackClick} onSuccess={mockOnSuccess} />);

      // Submit form
      const emailInput = screen.getByTestId('email-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith(
          'Password Reset Requested',
          'If an account with this email exists, you will receive password reset instructions.'
        );
      });

      // Should show success state
      expect(screen.getByText('Check Your Email')).toBeInTheDocument();
    });

    test('shows same generic message even when API fails', async () => {
      // Mock API failure
      mockAuthAPI.forgotPassword.mockRejectedValue(new Error('User not found'));

      render(<ForgotPasswordForm onBackClick={mockOnBackClick} onSuccess={mockOnSuccess} />);

      const emailInput = screen.getByTestId('email-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should still show generic success message
        expect(mockShowSuccess).toHaveBeenCalledWith(
          'Password Reset Requested',
          'If an account with this email exists, you will receive password reset instructions.'
        );
      });

      // Should show success state (prevents user enumeration)
      expect(screen.getByText('Check Your Email')).toBeInTheDocument();
    });

    test('does not expose error details to prevent user enumeration', async () => {
      // Mock specific error that could reveal user information
      mockAuthAPI.forgotPassword.mockRejectedValue(new Error('User not found in database'));

      render(<ForgotPasswordForm onBackClick={mockOnBackClick} onSuccess={mockOnSuccess} />);

      const emailInput = screen.getByTestId('email-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should not show the actual error
        expect(screen.queryByText(/user not found/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/database/i)).not.toBeInTheDocument();
        
        // Should show generic success instead
        expect(mockShowSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Security Notice and Education', () => {
    test('displays security notice explaining generic messaging', () => {
      render(<ForgotPasswordForm onBackClick={mockOnBackClick} />);

      // Should display security notice
      expect(screen.getByText('Security Notice')).toBeInTheDocument();
      expect(screen.getByText(/security reasons/i)).toBeInTheDocument();
      expect(screen.getByText(/won't receive confirmation/i)).toBeInTheDocument();
    });

    test('educates users about the security practice', () => {
      render(<ForgotPasswordForm onBackClick={mockOnBackClick} />);

      const securityText = screen.getByText(/For security reasons/i);
      expect(securityText).toBeInTheDocument();
      
      // Should explain why we don't confirm account existence
      expect(securityText.textContent).toMatch(/account exists.*email.*won't receive confirmation/i);
    });
  });

  describe('Success State Security', () => {
    test('success state does not reveal whether email was found', async () => {
      mockAuthAPI.forgotPassword.mockResolvedValue({
        success: true,
        message: 'Reset instructions sent'
      });

      render(<ForgotPasswordForm onBackClick={mockOnBackClick} onSuccess={mockOnSuccess} />);

      // Submit form
      fireEvent.change(screen.getByTestId('email-input'), { 
        target: { value: 'test@example.com' } 
      });
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      });

      // Success message should be generic
      const successMessage = screen.getByText(/If an account with.*exists/i);
      expect(successMessage).toBeInTheDocument();
      
      // Should not say "we sent" or "email sent"
      expect(screen.queryByText(/we sent/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/email sent/i)).not.toBeInTheDocument();
    });

    test('success state provides helpful guidance without security issues', async () => {
      mockAuthAPI.forgotPassword.mockResolvedValue({
        success: true,
        message: 'Reset instructions sent'
      });

      render(<ForgotPasswordForm onBackClick={mockOnBackClick} onSuccess={mockOnSuccess} />);

      fireEvent.change(screen.getByTestId('email-input'), { 
        target: { value: 'test@example.com' } 
      });
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        // Should provide helpful guidance
        expect(screen.getByText(/Check your spam/i)).toBeInTheDocument();
        expect(screen.getByText(/Make sure the email address is correct/i)).toBeInTheDocument();
        expect(screen.getByText(/Wait a few more minutes/i)).toBeInTheDocument();
      });

      // Should have options to try again or go back
      expect(screen.getByText('Try a Different Email')).toBeInTheDocument();
      expect(screen.getByText('Back to Sign In')).toBeInTheDocument();
    });
  });

  describe('Form Security Features', () => {
    test('form has proper security attributes', () => {
      render(<ForgotPasswordForm onBackClick={mockOnBackClick} />);

      const emailInput = screen.getByTestId('email-input');
      
      // Should have proper input attributes
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
    });

    test('prevents submission without email', () => {
      render(<ForgotPasswordForm onBackClick={mockOnBackClick} />);

      const submitButton = screen.getByTestId('submit-button');
      
      // Button should be disabled without email
      expect(submitButton).toBeDisabled();
    });

    test('handles loading state securely', async () => {
      // Mock slow API response
      mockAuthAPI.forgotPassword.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true, message: 'OK' }), 100))
      );

      render(<ForgotPasswordForm onBackClick={mockOnBackClick} />);

      const emailInput = screen.getByTestId('email-input');
      const submitButton = screen.getByTestId('submit-button');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      // Should show loading state
      expect(screen.getByText('Sending...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Navigation and User Flow', () => {
    test('back to sign in works correctly', () => {
      render(<ForgotPasswordForm onBackClick={mockOnBackClick} />);

      const backButton = screen.getByTestId('back-button');
      fireEvent.click(backButton);

      expect(mockOnBackClick).toHaveBeenCalled();
    });

    test('try different email works in success state', async () => {
      mockAuthAPI.forgotPassword.mockResolvedValue({
        success: true,
        message: 'OK'
      });

      render(<ForgotPasswordForm onBackClick={mockOnBackClick} />);

      // Submit form to get to success state
      fireEvent.change(screen.getByTestId('email-input'), { 
        target: { value: 'test@example.com' } 
      });
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      });

      // Click try different email
      const tryDifferentButton = screen.getByText('Try a Different Email');
      fireEvent.click(tryDifferentButton);

      // Should return to form
      expect(screen.getByTestId('forgot-password-form')).toBeInTheDocument();
    });

    test('success state back to sign in works', async () => {
      mockAuthAPI.forgotPassword.mockResolvedValue({
        success: true,
        message: 'OK'
      });

      render(<ForgotPasswordForm onBackClick={mockOnBackClick} />);

      // Get to success state
      fireEvent.change(screen.getByTestId('email-input'), { 
        target: { value: 'test@example.com' } 
      });
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      });

      // Click back to sign in from success state
      const backButtons = screen.getAllByText('Back to Sign In');
      fireEvent.click(backButtons[0]);

      expect(mockOnBackClick).toHaveBeenCalled();
    });
  });

  describe('Accessibility and UX', () => {
    test('maintains good UX while being secure', () => {
      render(<ForgotPasswordForm onBackClick={mockOnBackClick} />);

      // Should have clear headings
      expect(screen.getByText('Reset Password')).toBeInTheDocument();
      
      // Should have helpful description
      expect(screen.getByText(/Enter your email address/i)).toBeInTheDocument();
      
      // Should have proper labels
      const emailInput = screen.getByTestId('email-input');
      expect(screen.getByLabelText('Email Address')).toBe(emailInput);
    });

    test('success state is accessible and informative', async () => {
      mockAuthAPI.forgotPassword.mockResolvedValue({
        success: true,
        message: 'OK'
      });

      render(<ForgotPasswordForm onBackClick={mockOnBackClick} />);

      fireEvent.change(screen.getByTestId('email-input'), { 
        target: { value: 'user@example.com' } 
      });
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        // Should have clear success indication
        expect(screen.getByText('Check Your Email')).toBeInTheDocument();
        
        // Should show the email they entered
        expect(screen.getByText(/user@example.com/)).toBeInTheDocument();
        
        // Should have actionable next steps
        expect(screen.getByText('Try a Different Email')).toBeInTheDocument();
        expect(screen.getByText('Back to Sign In')).toBeInTheDocument();
      });
    });
  });
});