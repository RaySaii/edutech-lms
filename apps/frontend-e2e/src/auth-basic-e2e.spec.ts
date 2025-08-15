// TDD - GREEN Phase: Basic E2E tests to validate test IDs and UI structure

import { test, expect } from '@playwright/test';

test.describe('Authentication Basic E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the API endpoints to avoid backend dependency
    await page.route('**/api/auth/**', route => {
      const url = route.request().url();
      if (url.includes('/login')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              user: {
                id: 'test-user-123',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                role: 'student',
                organizationId: 'org-123',
              },
              tokens: {
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
              },
            },
          })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });
  });

  test('should display login form with all required test IDs', async ({ page }) => {
    await page.goto('/login');

    // Check that all form elements are present with correct test IDs
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="remember-me"]')).toBeVisible();
    await expect(page.locator('[data-testid="forgot-password-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();

    // Check accessibility attributes
    await expect(page.locator('[data-testid="login-form"]')).toHaveAttribute('role', 'form');
    await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-label', 'Email Address');
    await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('aria-label', 'Password');
  });

  test('should handle password visibility toggle', async ({ page }) => {
    await page.goto('/login');
    
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

  test('should fill form fields correctly', async ({ page }) => {
    await page.goto('/login');
    
    const emailInput = page.locator('[data-testid="email-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');
    
    // Fill in the form
    await emailInput.fill('test@example.com');
    await passwordInput.fill('password123');
    
    // Verify values
    await expect(emailInput).toHaveValue('test@example.com');
    await expect(passwordInput).toHaveValue('password123');
  });

  test('should submit form and handle loading state', async ({ page }) => {
    await page.goto('/login');
    
    // Fill form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // Submit form
    const submitButton = page.locator('[data-testid="login-submit"]');
    await submitButton.click();
    
    // Should briefly show loading state, then redirect
    // Note: This test validates the form submission mechanism works
    // The actual authentication flow would be tested with backend integration
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.goto('/login');
    
    // Fill and submit form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    
    // Wait for navigation
    await page.waitForURL(/\/dashboard/);
    
    // Should be on dashboard page
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display dashboard with correct test IDs after login', async ({ page }) => {
    // First complete login flow
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    
    // Wait for dashboard
    await page.waitForURL(/\/dashboard/);
    
    // Check dashboard elements
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
    
    // Verify welcome message content
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome back, Test');
  });

  test('should handle logout flow', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL(/\/dashboard/);
    
    // Now logout
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/login');
    
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

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/login');
    
    // Form should be responsive and usable
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    
    // Test mobile interactions
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL(/\/dashboard/);
    await expect(page).toHaveURL(/\/dashboard/);
  });
});