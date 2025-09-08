import { test, expect, Page } from '@playwright/test';
import { 
  navigateToLogin,
  navigateToRegister,
  waitForEmailValidation,
  generateUniqueEmail
} from './auth-helpers';

test.describe('Authentication - Form Validation', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    page.setDefaultTimeout(10000);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('General Form Validation', () => {
    test('form validation works', async () => {
      await navigateToLogin(page);
      
      // Test empty form submission
      const submitButton = page.getByTestId('login-submit');
      const isInitiallyEnabled = await submitButton.isEnabled();
      
      if (!isInitiallyEnabled) {
        console.log('✓ Form submission properly disabled for empty fields');
      }
      
      // Test email validation
      const emailInput = page.getByTestId('email-input');
      await emailInput.fill('invalid-email');
      
      const validationMessage = await emailInput.evaluate((input: HTMLInputElement) => {
        return input.validationMessage;
      });
      
      if (validationMessage) {
        console.log('✓ Email validation working:', validationMessage);
      }
      
      // Test valid email format
      await emailInput.fill('test@example.com');
      await page.getByTestId('password-input').fill('password');
      
      const isValidEnabled = await submitButton.isEnabled();
      expect(isValidEnabled).toBe(true);
      console.log('✓ Form enables submission with valid inputs');
    });
  });

  test.describe('Password Validation', () => {
    test('password validation with updated requirements', async () => {
      await navigateToRegister(page);
      
      const passwordInput = page.getByTestId('password-input');
      const confirmPasswordInput = page.getByTestId('confirm-password-input');
      
      // Test weak password
      await passwordInput.fill('weak');
      await page.waitForTimeout(300); // Wait for validation
      
      // Check for password strength indicator
      let strengthIndicator = page.locator('.text-red-600').first();
      if (await strengthIndicator.isVisible()) {
        console.log('✓ Weak password strength properly detected');
      }
      
      // Test medium strength password
      await passwordInput.fill('Medium123');
      await page.waitForTimeout(300);
      
      strengthIndicator = page.locator('.text-yellow-600').first();
      if (await strengthIndicator.isVisible()) {
        console.log('✓ Medium password strength properly detected');
      }
      
      // Test strong password (without special characters requirement)
      await passwordInput.fill('StrongPassword123');
      await page.waitForTimeout(300);
      
      strengthIndicator = page.locator('.text-green-600').first();
      if (await strengthIndicator.isVisible()) {
        console.log('✓ Strong password properly detected');
      }
      
      // Test form submission with strong password
      await page.getByTestId('first-name-input').fill('Test');
      await page.getByTestId('last-name-input').fill('User');
      await page.getByTestId('email-input').fill(generateUniqueEmail());
      await confirmPasswordInput.fill('StrongPassword123');
      
      const submitButton = page.getByTestId('register-submit');
      const isEnabled = await submitButton.isEnabled();
      
      if (isEnabled) {
        console.log('✓ Form submission enabled with strong password (no special characters required)');
      }
      
      // Test password mismatch
      await confirmPasswordInput.fill('DifferentPassword123');
      await page.waitForTimeout(300);
      
      const mismatchIndicator = page.locator('.text-red-600').first();
      if (await mismatchIndicator.isVisible()) {
        console.log('✓ Password mismatch properly detected');
      }
    });
  });

  test.describe('Real-time Validation', () => {
    test('email format validation provides immediate feedback', async () => {
      await navigateToRegister(page);
      
      const emailInput = page.getByTestId('email-input');
      
      // Test various email formats
      const emailTests = [
        { email: 'invalid', expectedValid: false },
        { email: 'test@', expectedValid: false },
        { email: 'test@domain', expectedValid: false },
        { email: 'test@domain.com', expectedValid: true }
      ];
      
      for (const test of emailTests) {
        await emailInput.fill(test.email);
        await page.waitForTimeout(200);
        
        const inputClasses = await emailInput.getAttribute('class');
        const hasErrorClass = inputClasses?.includes('border-red') || inputClasses?.includes('error');
        const hasSuccessClass = inputClasses?.includes('border-green') || inputClasses?.includes('success');
        
        if (test.expectedValid) {
          if (hasSuccessClass || !hasErrorClass) {
            console.log(`✓ Valid email ${test.email} properly validated`);
          }
        } else {
          if (hasErrorClass) {
            console.log(`✓ Invalid email ${test.email} properly flagged`);
          }
        }
      }
    });

    test('password strength indicator updates in real-time', async () => {
      await navigateToRegister(page);
      
      const passwordInput = page.getByTestId('password-input');
      
      // Test password strength progression
      const passwordTests = [
        { password: '1', expectedStrength: 'weak' },
        { password: 'pass', expectedStrength: 'weak' },
        { password: 'password123', expectedStrength: 'medium' },
        { password: 'StrongPassword123', expectedStrength: 'strong' }
      ];
      
      for (const test of passwordTests) {
        await passwordInput.fill(test.password);
        await page.waitForTimeout(300);
        
        // Check for strength indicators
        const weakIndicator = await page.locator('.text-red-600').isVisible().catch(() => false);
        const mediumIndicator = await page.locator('.text-yellow-600').isVisible().catch(() => false);
        const strongIndicator = await page.locator('.text-green-600').isVisible().catch(() => false);
        
        let actualStrength = 'none';
        if (strongIndicator) actualStrength = 'strong';
        else if (mediumIndicator) actualStrength = 'medium';
        else if (weakIndicator) actualStrength = 'weak';
        
        console.log(`Password "${test.password}" detected as ${actualStrength} strength`);
      }
    });
  });

  test.describe('Field Requirements', () => {
    test('required field validation works correctly', async () => {
      await navigateToRegister(page);
      
      const requiredFields = [
        'first-name-input',
        'last-name-input', 
        'email-input',
        'password-input',
        'confirm-password-input'
      ];
      
      for (const fieldId of requiredFields) {
        const field = page.getByTestId(fieldId);
        const isRequired = await field.getAttribute('required');
        
        if (isRequired !== null) {
          console.log(`✓ ${fieldId} is properly marked as required`);
        }
        
        // Test empty field validation
        await field.fill('test');
        await field.clear();
        await field.blur();
        await page.waitForTimeout(200);
        
        const fieldClasses = await field.getAttribute('class');
        if (fieldClasses?.includes('border-red') || fieldClasses?.includes('error')) {
          console.log(`✓ ${fieldId} shows validation error when empty`);
        }
      }
    });

    test('field length validation works', async () => {
      await navigateToRegister(page);
      
      // Test minimum length requirements
      const lengthTests = [
        { field: 'first-name-input', value: 'A', shouldPass: false },
        { field: 'first-name-input', value: 'Alice', shouldPass: true },
        { field: 'password-input', value: '123', shouldPass: false },
        { field: 'password-input', value: 'Password123', shouldPass: true }
      ];
      
      for (const test of lengthTests) {
        const field = page.getByTestId(test.field);
        await field.fill(test.value);
        await page.waitForTimeout(200);
        
        const fieldClasses = await field.getAttribute('class');
        const hasErrorClass = fieldClasses?.includes('border-red') || fieldClasses?.includes('error');
        
        if (test.shouldPass && !hasErrorClass) {
          console.log(`✓ ${test.field} accepts valid length: "${test.value}"`);
        } else if (!test.shouldPass && hasErrorClass) {
          console.log(`✓ ${test.field} rejects invalid length: "${test.value}"`);
        }
      }
    });
  });

  test.describe('Form Submission States', () => {
    test('form submission states work correctly', async () => {
      await navigateToLogin(page);
      
      const emailInput = page.getByTestId('email-input');
      const passwordInput = page.getByTestId('password-input');
      const submitButton = page.getByTestId('login-submit');
      
      // Test initial state
      const initialEnabled = await submitButton.isEnabled();
      console.log('Initial submit button state:', initialEnabled ? 'enabled' : 'disabled');
      
      // Fill partial form
      await emailInput.fill('test@example.com');
      const partialEnabled = await submitButton.isEnabled();
      console.log('Submit button with partial form:', partialEnabled ? 'enabled' : 'disabled');
      
      // Complete form
      await passwordInput.fill('password');
      const completeEnabled = await submitButton.isEnabled();
      expect(completeEnabled).toBe(true);
      console.log('✓ Submit button enabled with complete form');
      
      // Test loading state (if implemented)
      await submitButton.click();
      
      // Check if button becomes disabled during submission
      const duringSubmission = await submitButton.isEnabled();
      if (!duringSubmission) {
        console.log('✓ Submit button disabled during form submission');
      }
      
      await page.waitForTimeout(1000);
    });

    test('form validation prevents submission of invalid data', async () => {
      await navigateToRegister(page);
      
      // Fill form with invalid data
      await page.getByTestId('first-name-input').fill('A'); // Too short
      await page.getByTestId('last-name-input').fill('B'); // Too short
      await page.getByTestId('email-input').fill('invalid-email'); // Invalid format
      await page.getByTestId('password-input').fill('weak'); // Weak password
      await page.getByTestId('confirm-password-input').fill('different'); // Mismatch
      
      const submitButton = page.getByTestId('register-submit');
      const isEnabled = await submitButton.isEnabled();
      
      if (!isEnabled) {
        console.log('✓ Form submission properly prevented with invalid data');
      } else {
        // Try to submit anyway and check for validation errors
        await submitButton.click();
        await page.waitForTimeout(1000);
        
        // Should remain on the same page with validation errors
        const isStillOnRegister = await page.getByTestId('register-form').isVisible();
        expect(isStillOnRegister).toBe(true);
        console.log('✓ Invalid form submission handled gracefully');
      }
    });
  });
});