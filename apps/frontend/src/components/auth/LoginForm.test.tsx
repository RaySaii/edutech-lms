// TDD - RED Phase: Write failing tests first for LoginForm component

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

// Mock the AuthContext
const mockLogin = jest.fn();
const mockUseAuth = {
  login: mockLogin,
  isLoading: false,
  user: null,
  logout: jest.fn(),
  refreshToken: jest.fn()
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Lock: () => <div data-testid="lock-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />
}));

describe('LoginForm - TDD Component Tests', () => {
  const mockOnSuccess = jest.fn();
  const mockOnRegisterClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin.mockReset();
    mockUseAuth.isLoading = false;
  });

  describe('Rendering and Initial State', () => {
    it('should render login form with all required elements', () => {
      render(<LoginForm />);

      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
      expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render email input with proper attributes', () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('name', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(emailInput).toBeRequired();
    });

    it('should render password input with proper attributes', () => {
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('name', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
      expect(passwordInput).toBeRequired();
    });

    it('should render remember me checkbox', () => {
      render(<LoginForm />);

      const checkbox = screen.getByLabelText(/remember me/i);
      expect(checkbox).toHaveAttribute('type', 'checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should render forgot password link', () => {
      render(<LoginForm />);

      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
    });

    it('should render sign up button when onRegisterClick is provided', () => {
      render(<LoginForm onRegisterClick={mockOnRegisterClick} />);

      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should update email input when user types', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password input when user types', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(passwordInput, 'password123');

      expect(passwordInput).toHaveValue('password123');
    });

    it('should toggle password visibility when eye icon is clicked', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button

      expect(passwordInput).toHaveAttribute('type', 'password');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should call onRegisterClick when sign up button is clicked', async () => {
      const user = userEvent.setup();
      render(<LoginForm onRegisterClick={mockOnRegisterClick} />);

      const signUpButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(signUpButton);

      expect(mockOnRegisterClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Submission', () => {
    it('should call login with correct credentials when form is submitted', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({ success: true });

      render(<LoginForm onSuccess={mockOnSuccess} />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should call onSuccess when login is successful', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({ success: true });

      render(<LoginForm onSuccess={mockOnSuccess} />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should display error message when login fails', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Invalid credentials';
      mockLogin.mockResolvedValue({ success: false, message: errorMessage });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display error message when login throws exception', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Network error';
      mockLogin.mockRejectedValue(new Error(errorMessage));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should clear error message when form is resubmitted', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce({ success: false, message: 'Error' });
      mockLogin.mockResolvedValueOnce({ success: true });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // First submission - should show error
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });

      // Second submission - should clear error
      await user.clear(passwordInput);
      await user.type(passwordInput, 'correctpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('Error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      mockUseAuth.isLoading = true;
      render(<LoginForm />);

      expect(screen.getByText(/signing in.../i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /signing in.../i })).toBeDisabled();
    });

    it('should disable form inputs during loading', () => {
      mockUseAuth.isLoading = true;
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /signing in.../i });

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('should show loading spinner during submission', () => {
      mockUseAuth.isLoading = true;
      render(<LoginForm />);

      const spinner = screen.getByText(/signing in.../i).querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and ARIA attributes', () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
      
      const emailLabel = screen.getByText('Email Address');
      const passwordLabel = screen.getByText('Password');
      
      expect(emailLabel).toHaveAttribute('for', 'email');
      expect(passwordLabel).toHaveAttribute('for', 'password');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<LoginForm onRegisterClick={mockOnRegisterClick} />);

      await user.tab(); // Focus email input
      expect(screen.getByLabelText(/email address/i)).toHaveFocus();

      await user.tab(); // Focus password input
      expect(screen.getByLabelText(/password/i)).toHaveFocus();

      await user.tab(); // Focus password toggle button
      await user.tab(); // Focus remember me checkbox
      await user.tab(); // Focus forgot password link
      await user.tab(); // Focus submit button
      expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus();

      await user.tab(); // Focus sign up button
      expect(screen.getByRole('button', { name: /sign up/i })).toHaveFocus();
    });
  });
});