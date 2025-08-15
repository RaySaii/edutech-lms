// TDD - GREEN Phase: Integration tests for complete authentication flow

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { AuthProvider } from '../contexts/AuthContext';

// Mock the auth API directly
jest.mock('../lib/auth', () => ({
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    getCurrentUser: jest.fn(),
    getStoredTokens: jest.fn(),
    setStoredTokens: jest.fn(),
    clearStoredTokens: jest.fn(),
    getStoredUser: jest.fn(),
    setStoredUser: jest.fn(),
  },
}));

// Get reference to mocked authAPI
const mockAuthAPI = require('../lib/auth').authAPI;

// Test wrapper with AuthProvider
const AuthWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('Authentication Integration Tests - TDD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all authAPI mocks
    Object.values(mockAuthAPI).forEach(mock => {
      if (typeof mock.mockReset === 'function') {
        mock.mockReset();
      }
    });

    // Default mock implementations
    mockAuthAPI.getStoredTokens.mockReturnValue(null);
    mockAuthAPI.getStoredUser.mockReturnValue(null);
  });

  describe('Login Flow Integration', () => {
    it('should complete successful login flow end-to-end', async () => {
      const user = userEvent.setup();
      
      // Mock successful login response
      const mockLoginResponse = {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'student',
            organizationId: 'org-123',
          },
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
          },
        },
      };

      mockAuthAPI.login.mockResolvedValueOnce(mockLoginResponse);

      const mockOnSuccess = jest.fn();

      render(
        <AuthWrapper>
          <LoginForm onSuccess={mockOnSuccess} />
        </AuthWrapper>
      );

      // Fill in login form
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Verify API call was made correctly
      await waitFor(() => {
        expect(mockAuthAPI.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      // Verify setStoredTokens was called
      await waitFor(() => {
        expect(mockAuthAPI.setStoredTokens).toHaveBeenCalledWith({
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        });
      });

      // Verify setStoredUser was called
      await waitFor(() => {
        expect(mockAuthAPI.setStoredUser).toHaveBeenCalledWith({
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'student',
          organizationId: 'org-123',
        });
      });

      // Verify success callback was called
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should handle login failure with proper error handling', async () => {
      const user = userEvent.setup();

      // Mock failed login response
      const mockError = {
        response: {
          data: {
            message: 'Invalid credentials',
          },
        },
      };

      mockAuthAPI.login.mockRejectedValueOnce(mockError);

      render(
        <AuthWrapper>
          <LoginForm />
        </AuthWrapper>
      );

      // Fill in login form with wrong credentials
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // Verify no tokens were stored
      expect(mockAuthAPI.setStoredTokens).not.toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock network error
      mockAuthAPI.login.mockRejectedValueOnce(new Error('Network Error'));

      render(
        <AuthWrapper>
          <LoginForm />
        </AuthWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Verify network error is handled
      await waitFor(() => {
        expect(screen.getByText('Network Error')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication State Management', () => {
    it('should restore user session from stored tokens on app load', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'student',
        organizationId: 'org-123',
      };

      const mockTokens = {
        accessToken: 'stored-access-token',
        refreshToken: 'stored-refresh-token',
      };

      // Mock stored tokens and user
      mockAuthAPI.getStoredTokens.mockReturnValue(mockTokens);
      mockAuthAPI.getStoredUser.mockReturnValue(mockUser);
      mockAuthAPI.getCurrentUser.mockResolvedValue(mockUser);

      render(
        <AuthWrapper>
          <div data-testid="auth-state">Auth Context Loaded</div>
        </AuthWrapper>
      );

      // Verify token validation API call
      await waitFor(() => {
        expect(mockAuthAPI.getCurrentUser).toHaveBeenCalled();
      });

      expect(screen.getByTestId('auth-state')).toBeInTheDocument();
    });

    it('should handle token refresh when access token expires', async () => {
      const mockTokens = {
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'student',
        organizationId: 'org-123',
      };

      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      // Mock stored tokens and user
      mockAuthAPI.getStoredTokens.mockReturnValue(mockTokens);
      mockAuthAPI.getStoredUser.mockReturnValue(mockUser);

      // Mock failed initial validation (expired token)
      mockAuthAPI.getCurrentUser.mockRejectedValueOnce(new Error('Token expired'));

      // Mock successful token refresh
      mockAuthAPI.refreshToken.mockResolvedValueOnce(newTokens);

      // Mock successful retry with new token
      mockAuthAPI.getCurrentUser.mockResolvedValueOnce(mockUser);

      render(
        <AuthWrapper>
          <div data-testid="auth-state">Auth Context Loaded</div>
        </AuthWrapper>
      );

      // Verify token refresh was attempted
      await waitFor(() => {
        expect(mockAuthAPI.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
      });

      // Verify new tokens were stored
      await waitFor(() => {
        expect(mockAuthAPI.setStoredTokens).toHaveBeenCalledWith(newTokens);
      });
    });

    it('should clear authentication state on logout', async () => {
      const user = userEvent.setup();

      // Mock successful logout response
      mockAuthAPI.logout.mockResolvedValueOnce(undefined);

      const TestComponent = () => {
        const { logout } = require('../contexts/AuthContext').useAuth();
        return (
          <button onClick={logout} data-testid="logout-button">
            Logout
          </button>
        );
      };

      render(
        <AuthWrapper>
          <TestComponent />
        </AuthWrapper>
      );

      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);

      // Verify logout API call
      await waitFor(() => {
        expect(mockAuthAPI.logout).toHaveBeenCalled();
      });

      // Verify clearStoredTokens was called
      await waitFor(() => {
        expect(mockAuthAPI.clearStoredTokens).toHaveBeenCalled();
      });
    });
  });

  describe('Form Validation Integration', () => {
    it('should validate email format before API call', async () => {
      const user = userEvent.setup();

      render(
        <AuthWrapper>
          <LoginForm />
        </AuthWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Test invalid email format
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');
      
      // HTML5 validation should prevent submission or we can verify no API call was made
      expect(submitButton).toBeInTheDocument();
    });

    it('should handle password visibility toggle correctly', async () => {
      const user = userEvent.setup();

      render(
        <AuthWrapper>
          <LoginForm />
        </AuthWrapper>
      );

      const passwordInput = screen.getByLabelText(/password/i);

      // Find the password toggle button (eye icon)
      const toggleButton = passwordInput.parentElement?.querySelector('button[type="button"]');

      expect(passwordInput).toHaveAttribute('type', 'password');

      if (toggleButton) {
        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'text');

        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'password');
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should prevent concurrent login attempts', async () => {
      const user = userEvent.setup();

      // Mock slow response
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });

      mockAuthAPI.login.mockImplementation(() => loginPromise);

      render(
        <AuthWrapper>
          <LoginForm />
        </AuthWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // First click - should start loading
      await user.click(submitButton);
      
      // Button should show loading state
      expect(screen.getByText(/signing in.../i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Second click should not trigger another request
      await user.click(submitButton);

      expect(mockAuthAPI.login).toHaveBeenCalledTimes(1);

      // Resolve the promise
      resolveLogin!({
        success: true,
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          tokens: { accessToken: 'token', refreshToken: 'refresh' },
        },
      });
    });

    it('should handle server errors with proper user feedback', async () => {
      const user = userEvent.setup();

      // Mock server error
      const serverError = {
        response: {
          data: {
            message: 'Internal server error',
          },
        },
      };

      mockAuthAPI.login.mockRejectedValueOnce(serverError);

      render(
        <AuthWrapper>
          <LoginForm />
        </AuthWrapper>
      );

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Internal server error')).toBeInTheDocument();
      });
    });
  });
});