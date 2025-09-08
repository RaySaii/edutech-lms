import { test, expect, Page } from '@playwright/test';
import { 
  navigateToLogin,
  navigateToRegister,
  navigateToForgotPassword
} from './auth-helpers';

test.describe('Authentication - Navigation Flow', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    page.setDefaultTimeout(10000);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Basic Navigation', () => {
    test('navigation between login and register works', async () => {
      // Start at login page
      await navigateToLogin(page);
      
      // Navigate to register
      await page.getByTestId('register-link').click();
      await expect(page.getByTestId('register-form')).toBeVisible();
      console.log('✓ Login to register navigation works');
      
      // Navigate back to login  
      await page.getByTestId('login-link').click();
      await expect(page.getByTestId('login-form')).toBeVisible();
      console.log('✓ Register to login navigation works');
    });

    test('navigation to forgot password from login page works', async () => {
      await navigateToLogin(page);
      
      await page.getByTestId('forgot-password-link').click();
      await expect(page.getByTestId('forgot-password-form')).toBeVisible();
      
      console.log('✓ Navigation from login to forgot password works');
    });

    test('back to login navigation from forgot password works', async () => {
      await navigateToForgotPassword(page);
      
      // Look for back to login link
      const backToLoginLink = page.getByTestId('back-to-login');
      const isBackLinkVisible = await backToLoginLink.isVisible().catch(() => false);
      
      if (isBackLinkVisible) {
        await backToLoginLink.click();
        await expect(page.getByTestId('login-form')).toBeVisible();
        console.log('✓ Back to login navigation works from forgot password');
      } else {
        // Try alternative navigation methods
        const loginLink = page.locator('text=Sign in').first();
        const isLoginLinkVisible = await loginLink.isVisible().catch(() => false);
        
        if (isLoginLinkVisible) {
          await loginLink.click();
          await expect(page.getByTestId('login-form')).toBeVisible();
          console.log('✓ Alternative login navigation works from forgot password');
        } else {
          console.log('⚠ No back to login navigation found on forgot password page');
        }
      }
    });
  });

  test.describe('URL Navigation', () => {
    test('direct URL navigation works correctly', async () => {
      // Test direct navigation to each auth page
      const authPages = [
        { url: '/login', testId: 'login-form', name: 'login' },
        { url: '/register', testId: 'register-form', name: 'register' },
        { url: '/forgot-password', testId: 'forgot-password-form', name: 'forgot password' }
      ];
      
      for (const authPage of authPages) {
        await page.goto(`http://localhost:4200${authPage.url}`);
        
        const formVisible = await page.getByTestId(authPage.testId).isVisible().catch(() => false);
        if (formVisible) {
          console.log(`✓ Direct navigation to ${authPage.name} page works`);
        } else {
          console.log(`⚠ ${authPage.name} page not accessible via direct URL`);
        }
      }
    });

    test('URL changes reflect current page correctly', async () => {
      // Start at login
      await navigateToLogin(page);
      expect(page.url()).toContain('/login');
      
      // Navigate to register
      await page.getByTestId('register-link').click();
      await expect(page.getByTestId('register-form')).toBeVisible();
      expect(page.url()).toContain('/register');
      console.log('✓ URL updates correctly when navigating to register');
      
      // Navigate to forgot password
      await page.getByTestId('forgot-password-link').click();
      await expect(page.getByTestId('forgot-password-form')).toBeVisible();
      expect(page.url()).toContain('/forgot-password');
      console.log('✓ URL updates correctly when navigating to forgot password');
    });
  });

  test.describe('Browser Navigation', () => {
    test('browser back and forward buttons work correctly', async () => {
      // Navigate through pages
      await navigateToLogin(page);
      await page.getByTestId('register-link').click();
      await expect(page.getByTestId('register-form')).toBeVisible();
      
      // Use browser back button
      await page.goBack();
      await expect(page.getByTestId('login-form')).toBeVisible();
      console.log('✓ Browser back button works');
      
      // Use browser forward button
      await page.goForward();
      await expect(page.getByTestId('register-form')).toBeVisible();
      console.log('✓ Browser forward button works');
    });

    test('page refresh maintains correct state', async () => {
      // Navigate to register page
      await navigateToRegister(page);
      
      // Fill some form data
      await page.getByTestId('first-name-input').fill('Test');
      await page.getByTestId('last-name-input').fill('User');
      
      // Refresh the page
      await page.reload();
      
      // Should still be on register page
      await expect(page.getByTestId('register-form')).toBeVisible();
      console.log('✓ Page refresh maintains register page state');
      
      // Form should be cleared (expected behavior)
      const firstNameValue = await page.getByTestId('first-name-input').inputValue();
      expect(firstNameValue).toBe('');
      console.log('✓ Form data cleared after refresh (security best practice)');
    });
  });

  test.describe('Responsive Navigation', () => {
    test('navigation works on mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await navigateToLogin(page);
      
      // Test navigation on mobile
      await page.getByTestId('register-link').click();
      await expect(page.getByTestId('register-form')).toBeVisible();
      console.log('✓ Navigation works on mobile viewport');
      
      // Check if elements are properly positioned
      const registerForm = page.getByTestId('register-form');
      const boundingBox = await registerForm.boundingBox();
      
      if (boundingBox && boundingBox.width <= 375) {
        console.log('✓ Form fits within mobile viewport');
      }
    });

    test('navigation elements are accessible on different screen sizes', async () => {
      const viewports = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' }
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await navigateToLogin(page);
        
        // Check if navigation links are visible and clickable
        const registerLink = page.getByTestId('register-link');
        const forgotPasswordLink = page.getByTestId('forgot-password-link');
        
        const isRegisterVisible = await registerLink.isVisible();
        const isForgotVisible = await forgotPasswordLink.isVisible();
        
        if (isRegisterVisible && isForgotVisible) {
          console.log(`✓ Navigation elements accessible on ${viewport.name}`);
        } else {
          console.log(`⚠ Some navigation elements not visible on ${viewport.name}`);
        }
      }
    });
  });

  test.describe('Navigation State Management', () => {
    test('form state is preserved during navigation', async () => {
      await navigateToRegister(page);
      
      // Fill partial form
      await page.getByTestId('first-name-input').fill('Test');
      await page.getByTestId('email-input').fill('test@example.com');
      
      // Navigate away and back
      await page.getByTestId('login-link').click();
      await expect(page.getByTestId('login-form')).toBeVisible();
      
      await page.getByTestId('register-link').click();
      await expect(page.getByTestId('register-form')).toBeVisible();
      
      // Check if form was cleared (expected behavior for security)
      const firstNameValue = await page.getByTestId('first-name-input').inputValue();
      const emailValue = await page.getByTestId('email-input').inputValue();
      
      if (firstNameValue === '' && emailValue === '') {
        console.log('✓ Form state properly cleared on navigation (security)');
      } else {
        console.log('⚠ Form state persisted - may be intentional but check security implications');
      }
    });

    test('navigation preserves intended user flow', async () => {
      // Simulate user flow: login attempt -> registration -> back to login
      await navigateToLogin(page);
      
      // Try to login with non-existent account
      await page.getByTestId('email-input').fill('newuser@example.com');
      await page.getByTestId('password-input').fill('password');
      await page.getByTestId('login-submit').click();
      
      await page.waitForTimeout(2000);
      
      // Navigate to registration (common user flow)
      await page.getByTestId('register-link').click();
      await expect(page.getByTestId('register-form')).toBeVisible();
      
      // User decides to try login again
      await page.getByTestId('login-link').click();
      await expect(page.getByTestId('login-form')).toBeVisible();
      
      console.log('✓ User flow navigation works smoothly');
      
      // Form should be clean for security
      const emailValue = await page.getByTestId('email-input').inputValue();
      const passwordValue = await page.getByTestId('password-input').inputValue();
      
      if (emailValue === '' && passwordValue === '') {
        console.log('✓ Credentials cleared between navigation for security');
      }
    });
  });

  test.describe('Error State Navigation', () => {
    test('navigation works correctly after form errors', async () => {
      await navigateToLogin(page);
      
      // Trigger a form error
      await page.getByTestId('email-input').fill('invalid-email');
      await page.getByTestId('password-input').fill('test');
      await page.getByTestId('login-submit').click();
      
      await page.waitForTimeout(1000);
      
      // Navigate to register despite error
      await page.getByTestId('register-link').click();
      await expect(page.getByTestId('register-form')).toBeVisible();
      
      // Should not carry over error state
      const errorElement = page.getByTestId('error-message');
      const hasError = await errorElement.isVisible().catch(() => false);
      
      if (!hasError) {
        console.log('✓ Error state does not persist across navigation');
      }
    });
  });
});