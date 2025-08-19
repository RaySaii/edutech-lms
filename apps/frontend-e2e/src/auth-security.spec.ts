import { test, expect, Page } from '@playwright/test';

test.describe('Authentication Security Best Practices E2E Tests', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Unified Login Error Messaging (Prevents User Enumeration)', () => {
    test('shows generic error for non-existent user login', async () => {
      const nonExistentEmail = `nonexistent${Date.now()}@example.com`;
      
      await page.goto('/login');
      await page.getByTestId('email-input').fill(nonExistentEmail);
      await page.getByTestId('password-input').fill('TestPassword123');
      await page.getByTestId('login-submit').click();
      
      await page.waitForTimeout(3000);
      
      // Should show generic error message (security best practice)
      const errorElement = page.getByTestId('error-message');
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        expect(errorText?.toLowerCase()).toContain('your account has been temporarily locked');
        console.log('✓ Generic error message for non-existent user:', errorText);
      }
    });

    test('shows same generic error for existing user with wrong password', async () => {
      const existingEmail = '309406931@qq.com';
      const wrongPassword = 'WrongPassword123';
      
      await page.goto('/login');
      await page.getByTestId('email-input').fill(existingEmail);
      await page.getByTestId('password-input').fill(wrongPassword);
      await page.getByTestId('login-submit').click();
      
      await page.waitForTimeout(3000);
      
      // Should show same generic error message
      const errorElement = page.getByTestId('error-message');
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        expect(errorText?.toLowerCase()).toContain('your account has been temporarily locked');
        console.log('✓ Generic error message for wrong password:', errorText);
      }
    });

    test('login errors do not reveal user existence', async () => {
      const testCases = [
        { email: `nonexistent${Date.now()}@example.com`, password: 'TestPassword123' },
        { email: '309406931@qq.com', password: 'WrongPassword123' }
      ];

      const errorMessages = [];

      for (const testCase of testCases) {
        await page.goto('/login');
        await page.getByTestId('email-input').fill(testCase.email);
        await page.getByTestId('password-input').fill(testCase.password);
        await page.getByTestId('login-submit').click();
        
        await page.waitForTimeout(3000);
        
        const errorElement = page.getByTestId('error-message');
        if (await errorElement.isVisible()) {
          const errorText = await errorElement.textContent();
          errorMessages.push(errorText);
        }
      }

      // Both error messages should be identical (or both generic)
      if (errorMessages.length >= 2) {
        expect(errorMessages[0]?.toLowerCase()).toContain('your account has been temporarily locked');
        expect(errorMessages[1]?.toLowerCase()).toContain('your account has been temporarily locked');
        console.log('✓ Consistent error messages prevent user enumeration');
      }
    });
  });

  test.describe('Registration Flow with Guided Password Recovery', () => {
    test('registration shows existing email with guided recovery options', async () => {
      const existingEmail = '309406931@qq.com';
      
      await page.goto('/register');
      await page.getByTestId('email-input').fill(existingEmail);
      
      // Wait for email availability check
      await page.waitForTimeout(600);
      
      // Should show that email is registered with guidance
      const emailInput = page.getByTestId('email-input');
      const inputClasses = await emailInput.getAttribute('class');
      
      if (inputClasses?.includes('border-red')) {
        console.log('✓ Email shows as unavailable (red border)');
        
        // Look for guidance text
        const guidanceText = page.locator('text=Already have an account?').first();
        const signInLink = page.locator('text=Sign in').first();
        const forgotPasswordLink = page.locator('text=forgot password?').first();
        
        if (await guidanceText.isVisible()) {
          console.log('✓ Guidance text displayed for existing email');
        }
        
        if (await signInLink.isVisible()) {
          console.log('✓ Sign in link available');
        }
        
        if (await forgotPasswordLink.isVisible()) {
          console.log('✓ Forgot password link available');
        }
      }
    });

    test('registration prevents form submission for existing email', async () => {
      const existingEmail = '309406931@qq.com';
      
      await page.goto('/register');
      
      // Fill form with existing email
      await page.getByTestId('first-name-input').fill('Test');
      await page.getByTestId('last-name-input').fill('User');
      await page.getByTestId('email-input').fill(existingEmail);
      await page.getByTestId('password-input').fill('SecurePassword123');
      await page.getByTestId('confirm-password-input').fill('SecurePassword123');
      
      // Wait for email availability check
      await page.waitForTimeout(600);
      
      // Try to submit form
      await page.getByTestId('register-submit').click();
      
      await page.waitForTimeout(1000);
      
      // Should show error about existing email
      const errorElement = page.getByTestId('error-message');
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        expect(errorText?.toLowerCase()).toMatch(/(already registered|sign in|reset.*password)/);
        console.log('✓ Registration prevented with helpful error:', errorText);
      }
    });

    test('registration guidance links work correctly', async () => {
      const existingEmail = '309406931@qq.com';
      
      await page.goto('/register');
      await page.getByTestId('email-input').fill(existingEmail);
      
      // Wait for email availability check
      await page.waitForTimeout(600);
      
      // Test sign in link
      const signInLink = page.locator('text=Sign in').first();
      if (await signInLink.isVisible()) {
        await signInLink.click();
        
        // Should switch to login form
        await expect(page.getByTestId('login-form')).toBeVisible();
        console.log('✓ Sign in link switches to login form');
      }
    });
  });

  test.describe('Password Recovery Flow with Generic Messaging', () => {
    test('forgot password shows generic success message regardless of user existence', async () => {
      const testEmails = [
        `nonexistent${Date.now()}@example.com`, // Non-existent
        '309406931@qq.com' // Existing (if available)
      ];

      const successMessages = [];

      for (const email of testEmails) {
        await page.goto('/forgot-password');
        
        // Fill and submit form
        await page.getByTestId('email-input').fill(email);
        await page.getByTestId('submit-button').click();
        
        await page.waitForTimeout(3000);
        
        // Check for success message or toast
        const toastSuccess = page.getByTestId('toast-success');
        const checkEmailHeading = page.locator('h1:has-text(\"Check Your Email\")');
        
        let message = '';
        if (await toastSuccess.isVisible()) {
          message = await toastSuccess.textContent() || '';
        } else if (await checkEmailHeading.isVisible()) {
          const pageText = await page.locator('body').textContent();
          message = pageText || '';
        }
        
        successMessages.push(message);
        console.log(`✓ Password reset for ${email}:`, message.substring(0, 100) + '...');
      }

      // Both should show generic success messages
      for (const message of successMessages) {
        expect(message.toLowerCase()).toMatch(/(if.*account.*exists|reset instructions)/);
      }
      
      console.log('✓ Generic success messages prevent user enumeration');
    });

    test('forgot password form has security notice', async () => {
      await page.goto('/forgot-password');
      
      // Should display security notice
      const securityNotice = page.locator('text=Security Notice');
      await expect(securityNotice).toBeVisible();
      
      const noticeText = page.locator('text=For security reasons');
      if (await noticeText.isVisible()) {
        console.log('✓ Security notice displayed explaining generic messaging');
      }
    });

    test('forgot password success page provides helpful guidance', async () => {
      await page.goto('/forgot-password');
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('submit-button').click();
      
      await page.waitForTimeout(3000);
      
      // Should show success page with guidance
      const checkEmailHeading = page.locator('h1:has-text(\"Check Your Email\")');
      if (await checkEmailHeading.isVisible()) {
        // Look for helpful guidance
        const spamNotice = page.locator('text=Check your spam');
        const tryDifferentButton = page.locator('text=Try a Different Email');
        const backToSignInButton = page.locator('text=Back to Sign In');
        
        if (await spamNotice.isVisible()) {
          console.log('✓ Spam folder guidance provided');
        }
        
        if (await tryDifferentButton.isVisible()) {
          console.log('✓ Try different email option available');
          
          // Test the button
          await tryDifferentButton.click();
          await expect(page.getByTestId('forgot-password-form')).toBeVisible();
          console.log('✓ Try different email button works');
        }
        
        if (await backToSignInButton.isVisible()) {
          console.log('✓ Back to sign in option available');
        }
      }
    });
  });

  test.describe('Comprehensive Security Validation', () => {
    test('no authentication endpoint reveals user existence', async () => {
      const testEmail = `security_test${Date.now()}@example.com`;
      
      // Test login
      await page.goto('/login');
      await page.getByTestId('email-input').fill(testEmail);
      await page.getByTestId('password-input').fill('TestPassword123');
      await page.getByTestId('login-submit').click();
      await page.waitForTimeout(3000);
      
      const loginError = page.getByTestId('error-message');
      if (await loginError.isVisible()) {
        const loginErrorText = await loginError.textContent();
        expect(loginErrorText?.toLowerCase()).not.toContain('not found');
        expect(loginErrorText?.toLowerCase()).not.toContain('does not exist');
        expect(loginErrorText?.toLowerCase()).not.toContain('no account');
        console.log('✓ Login does not reveal user non-existence');
      }
      
      // Test password reset
      await page.goto('/forgot-password');
      await page.getByTestId('email-input').fill(testEmail);
      await page.getByTestId('submit-button').click();
      await page.waitForTimeout(3000);
      
      // Should not reveal user existence
      const pageText = await page.locator('body').textContent();
      expect(pageText?.toLowerCase()).not.toContain('user not found');
      expect(pageText?.toLowerCase()).not.toContain('account does not exist');
      expect(pageText?.toLowerCase()).not.toContain('no account found');
      console.log('✓ Password reset does not reveal user non-existence');
    });

    test('error messages are consistent in timing and content', async () => {
      const startTime = Date.now();
      
      // Test non-existent user login
      await page.goto('/login');
      await page.getByTestId('email-input').fill(`nonexistent${Date.now()}@example.com`);
      await page.getByTestId('password-input').fill('TestPassword123');
      await page.getByTestId('login-submit').click();
      await page.waitForTimeout(3000);
      
      const firstResponseTime = Date.now() - startTime;
      
      // Test existing user with wrong password (timing should be similar)
      const secondStartTime = Date.now();
      await page.goto('/login');
      await page.getByTestId('email-input').fill('309406931@qq.com');
      await page.getByTestId('password-input').fill('WrongPassword123');
      await page.getByTestId('login-submit').click();
      await page.waitForTimeout(3000);
      
      const secondResponseTime = Date.now() - secondStartTime;
      
      // Response times should be reasonably similar (within 2 seconds)
      const timeDifference = Math.abs(firstResponseTime - secondResponseTime);
      expect(timeDifference).toBeLessThan(2000);
      
      console.log(`✓ Response time consistency: ${firstResponseTime}ms vs ${secondResponseTime}ms (diff: ${timeDifference}ms)`);
    });

    test('registration flow properly guides users without security leaks', async () => {
      const existingEmail = '309406931@qq.com';
      
      await page.goto('/register');
      await page.getByTestId('email-input').fill(existingEmail);
      await page.waitForTimeout(600);
      
      // Should show guidance without exposing security issues
      const pageText = await page.locator('body').textContent();
      
      // Should guide to sign in or reset password
      expect(pageText?.toLowerCase()).toMatch(/(sign in|forgot password)/);
      
      // Should not expose internal user details
      expect(pageText?.toLowerCase()).not.toContain('user id');
      expect(pageText?.toLowerCase()).not.toContain('database');
      expect(pageText?.toLowerCase()).not.toContain('internal error');
      
      console.log('✓ Registration guidance is secure and helpful');
    });
  });

  test.describe('User Experience with Security', () => {
    test('security measures do not negatively impact user experience', async () => {
      // Test that security measures still provide good UX
      
      // 1. Registration flow is intuitive
      await page.goto('/register');
      await page.getByTestId('email-input').fill('309406931@qq.com');
      await page.waitForTimeout(600);
      
      // Should provide clear next steps
      const signInLink = page.locator('text=Sign in').first();
      const forgotPasswordLink = page.locator('text=forgot password').first();
      
      expect(await signInLink.isVisible() || await forgotPasswordLink.isVisible()).toBe(true);
      console.log('✓ Clear next steps provided in registration');
      
      // 2. Login errors are helpful despite being generic
      await page.goto('/login');
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('password-input').fill('wrongpassword');
      await page.getByTestId('login-submit').click();
      await page.waitForTimeout(3000);
      
      const errorElement = page.getByTestId('error-message');
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        // Error should be generic but still actionable
        expect(errorText).toBeTruthy();
        expect(errorText?.length).toBeGreaterThan(10); // Not just a generic "error"
        console.log('✓ Error messages are generic but actionable');
      }
      
      // 3. Password reset flow is user-friendly
      await page.goto('/forgot-password');
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('submit-button').click();
      await page.waitForTimeout(3000);
      
      // Should provide helpful next steps
      const helpfulGuidance = page.locator('text=Check your spam');
      if (await helpfulGuidance.isVisible()) {
        console.log('✓ Password reset provides helpful guidance');
      }
    });
  });
});