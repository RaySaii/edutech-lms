// TDD - RED Phase: E2E tests for complete authentication workflow

import { test, expect, Page } from '@playwright/test';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User'
};

const invalidCredentials = {
  email: 'invalid@example.com',
  password: 'wrongpassword'
};

// Helper functions
async function navigateToLogin(page: Page) {
  await page.goto('/login');
  await expect(page).toHaveTitle(/EduTech LMS/);
}

async function fillLoginForm(page: Page, email: string, password: string) {
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
}

async function submitLoginForm(page: Page) {
  await page.click('[data-testid="login-submit"]');
}

async function expectLoginSuccess(page: Page) {
  // Should redirect to dashboard after successful login
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}

async function expectLoginError(page: Page, errorMessage: string) {
  await expect(page.locator('[data-testid="error-message"]')).toContainText(errorMessage);
}

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a page first, then clear auth state
    await page.goto('/');
    await page.context().clearCookies();
    try {
      await page.evaluate(() => localStorage.clear());
    } catch (error) {
      // Ignore localStorage errors in beforeEach - will be cleared when navigating to login
    }
  });

  test.describe('Login Flow', () => {
    test('should display login form correctly', async ({ page }) => {
      await navigateToLogin(page);

      // Check that all form elements are present
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();
      await expect(page.locator('[data-testid="forgot-password-link"]')).toBeVisible();
      await expect(page.locator('[data-testid="register-link"]')).toBeVisible();

      // Check form labels and accessibility
      await expect(page.locator('label[for="email"]')).toContainText('Email Address');
      await expect(page.locator('label[for="password"]')).toContainText('Password');
    });

    test('should successfully login with valid credentials', async ({ page }) => {
      await navigateToLogin(page);
      
      await fillLoginForm(page, testUser.email, testUser.password);
      await submitLoginForm(page);
      
      // Wait for authentication to complete
      await page.waitForLoadState('networkidle');
      
      // Should redirect to dashboard
      await expectLoginSuccess(page);
      
      // Verify user is authenticated by checking for user-specific content
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText(`Welcome, ${testUser.firstName}`);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await navigateToLogin(page);
      
      await fillLoginForm(page, invalidCredentials.email, invalidCredentials.password);
      await submitLoginForm(page);
      
      // Should stay on login page and show error
      await expect(page).toHaveURL(/\/login/);
      await expectLoginError(page, 'Invalid credentials');
    });

    test('should validate email format', async ({ page }) => {
      await navigateToLogin(page);
      
      await fillLoginForm(page, 'invalid-email', testUser.password);
      await submitLoginForm(page);
      
      // Should show validation error
      await expect(page.locator('[data-testid="email-validation-error"]')).toBeVisible();
    });

    test('should require password field', async ({ page }) => {
      await navigateToLogin(page);
      
      await page.fill('[data-testid="email-input"]', testUser.email);
      // Leave password empty
      await submitLoginForm(page);
      
      // Should show validation error
      await expect(page.locator('[data-testid="password-validation-error"]')).toBeVisible();
    });

    test('should toggle password visibility', async ({ page }) => {
      await navigateToLogin(page);
      
      const passwordInput = page.locator('[data-testid="password-input"]');
      const toggleButton = page.locator('[data-testid="password-toggle"]');
      
      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Click toggle to show password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      
      // Click toggle again to hide password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should handle loading state during login', async ({ page }) => {
      await navigateToLogin(page);
      
      await fillLoginForm(page, testUser.email, testUser.password);
      
      // Submit form and immediately check loading state
      const submitButton = page.locator('[data-testid="login-submit"]');
      await submitButton.click();
      
      // Button should be disabled and show loading text
      await expect(submitButton).toBeDisabled();
      await expect(submitButton).toContainText('Signing in...');
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, testUser.email, testUser.password);
      await submitLoginForm(page);
      await expectLoginSuccess(page);
      
      // Reload the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should still be authenticated
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should redirect to login when not authenticated', async ({ page }) => {
      // Try to access protected route without authentication
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });

    test('should handle token expiration gracefully', async ({ page }) => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, testUser.email, testUser.password);
      await submitLoginForm(page);
      await expectLoginSuccess(page);
      
      // Simulate token expiration by clearing tokens
      await page.evaluate(() => {
        localStorage.removeItem('auth_tokens');
      });
      
      // Try to navigate to another protected route
      await page.goto('/profile');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Logout Flow', () => {
    test('should successfully logout user', async ({ page }) => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, testUser.email, testUser.password);
      await submitLoginForm(page);
      await expectLoginSuccess(page);
      
      // Click user menu and logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Should redirect to login and clear auth state
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      // Verify auth tokens are cleared
      const tokens = await page.evaluate(() => localStorage.getItem('auth_tokens'));
      expect(tokens).toBeNull();
    });

    test('should prevent access to protected routes after logout', async ({ page }) => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, testUser.email, testUser.password);
      await submitLoginForm(page);
      await expectLoginSuccess(page);
      
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      await expect(page).toHaveURL(/\/login/);
      
      // Try to access protected route
      await page.goto('/dashboard');
      
      // Should redirect back to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure by intercepting and failing the login request
      await page.route('**/api/auth/login', route => {
        route.abort('failed');
      });
      
      await navigateToLogin(page);
      await fillLoginForm(page, testUser.email, testUser.password);
      await submitLoginForm(page);
      
      // Should show network error message
      await expectLoginError(page, 'Network error');
    });

    test('should handle server errors gracefully', async ({ page }) => {
      // Simulate server error
      await page.route('**/api/auth/login', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Internal server error'
          })
        });
      });
      
      await navigateToLogin(page);
      await fillLoginForm(page, testUser.email, testUser.password);
      await submitLoginForm(page);
      
      // Should show server error message
      await expectLoginError(page, 'Internal server error');
    });

    test('should clear error messages on retry', async ({ page }) => {
      // First attempt with invalid credentials
      await navigateToLogin(page);
      await fillLoginForm(page, invalidCredentials.email, invalidCredentials.password);
      await submitLoginForm(page);
      await expectLoginError(page, 'Invalid credentials');
      
      // Second attempt with valid credentials
      await fillLoginForm(page, testUser.email, testUser.password);
      await submitLoginForm(page);
      
      // Error should be cleared and login should succeed
      await expectLoginSuccess(page);
    });
  });

  test.describe('Accessibility and UX', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await navigateToLogin(page);
      
      // Tab through form elements
      await page.keyboard.press('Tab'); // Email input
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Password input
      await expect(page.locator('[data-testid="password-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Password toggle
      await expect(page.locator('[data-testid="password-toggle"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Remember me checkbox
      await expect(page.locator('[data-testid="remember-me"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Forgot password link
      await expect(page.locator('[data-testid="forgot-password-link"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Submit button
      await expect(page.locator('[data-testid="login-submit"]')).toBeFocused();
    });

    test('should support form submission with Enter key', async ({ page }) => {
      await navigateToLogin(page);
      await fillLoginForm(page, testUser.email, testUser.password);
      
      // Press Enter to submit
      await page.keyboard.press('Enter');
      
      // Should attempt to submit form
      await page.waitForLoadState('networkidle');
      await expectLoginSuccess(page);
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await navigateToLogin(page);
      
      // Check ARIA labels
      await expect(page.locator('[data-testid="login-form"]')).toHaveAttribute('role', 'form');
      await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-label', 'Email Address');
      await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('aria-label', 'Password');
      
      // Check error announcements
      await fillLoginForm(page, 'invalid-email', 'password');
      await submitLoginForm(page);
      
      await expect(page.locator('[data-testid="error-message"]')).toHaveAttribute('role', 'alert');
    });
  });

  test.describe('Mobile Experience', () => {
    test('should work correctly on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await navigateToLogin(page);
      
      // Form should be responsive and usable
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      
      // Test mobile interactions
      await fillLoginForm(page, testUser.email, testUser.password);
      await submitLoginForm(page);
      
      await expectLoginSuccess(page);
    });
  });
});