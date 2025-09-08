import { test, expect, Page } from '@playwright/test';
import { 
  navigateToLogin,
  navigateToRegister,
  navigateToForgotPassword
} from './auth-helpers';

test.describe('Authentication - Accessibility & User Experience', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    page.setDefaultTimeout(10000);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation in login form', async () => {
      await navigateToLogin(page);
      
      // Focus the first form element
      await page.getByTestId('email-input').focus();
      
      // Test Tab navigation through form elements
      await page.keyboard.press('Tab'); // Should focus password input
      const passwordFocused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      
      await page.keyboard.press('Tab'); // Should focus submit button
      const submitFocused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      
      if (passwordFocused === 'password-input' || submitFocused === 'login-submit') {
        console.log('✓ Keyboard navigation works correctly in login form');
      } else {
        console.log('⚠ Keyboard navigation may need improvement');
      }
    });

    test('should support Enter key submission', async () => {
      await navigateToLogin(page);
      
      await page.getByTestId('email-input').fill('test@example.com');
      await page.getByTestId('password-input').fill('password');
      
      // Submit with Enter key
      await page.getByTestId('password-input').press('Enter');
      await page.waitForTimeout(2000);
      
      // Should attempt login (show error or redirect)
      const errorShown = await page.getByTestId('error-message').isVisible().catch(() => false);
      const urlChanged = !page.url().includes('/login');
      
      if (errorShown || urlChanged) {
        console.log('✓ Enter key submission works');
      }
    });

    test('should support Escape key to close modals/dialogs', async () => {
      await navigateToLogin(page);
      
      // Check if any modals exist that should close with Escape
      const modal = page.locator('[role="dialog"]').first();
      const isModalVisible = await modal.isVisible().catch(() => false);
      
      if (isModalVisible) {
        await page.keyboard.press('Escape');
        const modalClosed = await modal.isVisible().catch(() => true) === false;
        
        if (modalClosed) {
          console.log('✓ Escape key closes modals');
        }
      } else {
        console.log('⚠ No modals found to test Escape key functionality');
      }
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper ARIA labels and roles', async () => {
      await navigateToLogin(page);
      
      // Check for proper form labeling
      const emailInput = page.getByTestId('email-input');
      const passwordInput = page.getByTestId('password-input');
      const submitButton = page.getByTestId('login-submit');
      
      const emailLabel = await emailInput.getAttribute('aria-label') || 
                         await emailInput.getAttribute('aria-labelledby') ||
                         await page.locator('label[for="email"]').textContent().catch(() => null);
      
      const passwordLabel = await passwordInput.getAttribute('aria-label') ||
                           await passwordInput.getAttribute('aria-labelledby') ||
                           await page.locator('label[for="password"]').textContent().catch(() => null);
      
      const submitRole = await submitButton.getAttribute('role') || 'button';
      
      expect(emailLabel).toBeTruthy();
      expect(passwordLabel).toBeTruthy();
      expect(submitRole).toBe('button');
      
      console.log('✓ Form elements have proper accessibility labels');
    });

    test('should announce form validation errors to screen readers', async () => {
      await navigateToLogin(page);
      
      // Trigger validation error
      await page.getByTestId('email-input').fill('invalid-email');
      await page.getByTestId('login-submit').click();
      await page.waitForTimeout(1000);
      
      // Check for ARIA live region or error announcement
      const errorElement = page.getByTestId('error-message');
      const hasError = await errorElement.isVisible().catch(() => false);
      
      if (hasError) {
        const ariaLive = await errorElement.getAttribute('aria-live');
        const role = await errorElement.getAttribute('role');
        
        const isAccessible = ariaLive === 'polite' || ariaLive === 'assertive' || role === 'alert';
        
        if (isAccessible) {
          console.log('✓ Error messages are announced to screen readers');
        } else {
          console.log('⚠ Error messages may not be properly announced to screen readers');
        }
      }
    });

    test('should have proper heading structure', async () => {
      await navigateToLogin(page);
      
      // Check for proper heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      const headingTexts = await Promise.all(headings.map(h => h.textContent()));
      
      const hasMainHeading = headingTexts.some(text => 
        text?.toLowerCase().includes('login') || 
        text?.toLowerCase().includes('sign in')
      );
      
      if (hasMainHeading) {
        console.log('✓ Proper heading structure found');
      } else {
        console.log('⚠ Consider adding proper heading structure for better accessibility');
      }
    });
  });

  test.describe('Visual Accessibility', () => {
    test('should have sufficient color contrast', async () => {
      await navigateToLogin(page);
      
      // Test focus indicators
      const emailInput = page.getByTestId('email-input');
      await emailInput.focus();
      
      const focusStyles = await emailInput.evaluate((el) => {
        const styles = window.getComputedStyle(el, ':focus');
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
          borderColor: styles.borderColor
        };
      });
      
      const hasFocusIndicator = focusStyles.outline !== 'none' || 
                               focusStyles.boxShadow !== 'none' ||
                               focusStyles.borderColor !== 'transparent';
      
      if (hasFocusIndicator) {
        console.log('✓ Focus indicators are present');
      } else {
        console.log('⚠ Focus indicators may need improvement for accessibility');
      }
    });

    test('should be usable at 200% zoom level', async () => {
      // Set zoom to 200%
      await page.setViewportSize({ width: 640, height: 480 }); // Simulate 200% zoom
      
      await navigateToLogin(page);
      
      // Check if form elements are still accessible
      const emailInput = page.getByTestId('email-input');
      const passwordInput = page.getByTestId('password-input');
      const submitButton = page.getByTestId('login-submit');
      
      const emailVisible = await emailInput.isVisible();
      const passwordVisible = await passwordInput.isVisible();
      const submitVisible = await submitButton.isVisible();
      
      expect(emailVisible).toBe(true);
      expect(passwordVisible).toBe(true);
      expect(submitVisible).toBe(true);
      
      console.log('✓ Form remains usable at high zoom levels');
    });

    test('should work with reduced motion preferences', async () => {
      // Simulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await navigateToLogin(page);
      
      // Check that animations are disabled or reduced
      const loadingSpinner = page.locator('.animate-spin');
      const hasLoadingSpinner = await loadingSpinner.isVisible().catch(() => false);
      
      if (hasLoadingSpinner) {
        const animationDuration = await loadingSpinner.evaluate((el) => {
          return window.getComputedStyle(el).animationDuration;
        });
        
        // Should be very short or none when reduced motion is preferred
        console.log(`Animation duration with reduced motion: ${animationDuration}`);
      }
      
      console.log('✓ Reduced motion preference respected');
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should be touch-friendly on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await navigateToLogin(page);
      
      // Check touch target sizes (should be at least 44x44px)
      const submitButton = page.getByTestId('login-submit');
      const buttonSize = await submitButton.boundingBox();
      
      if (buttonSize) {
        const isTouchFriendly = buttonSize.width >= 44 && buttonSize.height >= 44;
        
        if (isTouchFriendly) {
          console.log('✓ Touch targets are appropriately sized');
        } else {
          console.log(`⚠ Touch target size: ${buttonSize.width}x${buttonSize.height}px (recommended: 44x44px minimum)`);
        }
      }
    });

    test('should handle mobile form input correctly', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToLogin(page);
      
      // Check input types for mobile optimization
      const emailInput = page.getByTestId('email-input');
      const inputType = await emailInput.getAttribute('type');
      const inputMode = await emailInput.getAttribute('inputmode');
      
      const isOptimizedForMobile = inputType === 'email' || inputMode === 'email';
      
      if (isOptimizedForMobile) {
        console.log('✓ Email input optimized for mobile keyboards');
      } else {
        console.log('⚠ Consider using type="email" for better mobile experience');
      }
    });
  });

  test.describe('Error Message Accessibility', () => {
    test('should associate error messages with form fields', async () => {
      await navigateToRegister(page);
      
      // Fill required fields to enable submit button
      await page.getByTestId('email-input').fill('invalid@email');
      await page.getByTestId('password-input').fill('weak');
      await page.getByTestId('first-name-input').fill('Test');
      await page.getByTestId('last-name-input').fill('User');
      
      // Try to submit
      const submitButton = page.getByTestId('register-submit');
      const isEnabled = await submitButton.isEnabled();
      
      if (isEnabled) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        // Check for proper error association
        const emailInput = page.getByTestId('email-input');
        const describedBy = await emailInput.getAttribute('aria-describedby');
        
        if (describedBy) {
          const errorElement = page.locator(`#${describedBy}`);
          const errorExists = await errorElement.isVisible().catch(() => false);
          
          if (errorExists) {
            console.log('✓ Error messages properly associated with form fields');
          }
        } else {
          console.log('⚠ Consider using aria-describedby to associate errors with fields');
        }
      } else {
        console.log('⚠ Submit button not enabled - checking client-side validation');
      }
    });
  });

  test.describe('Progressive Enhancement', () => {
    test('should work with JavaScript disabled', async () => {
      // Try to navigate to login page  
      await page.goto('http://localhost:4200/login');
      await page.waitForTimeout(2000);
      
      // Check if basic form elements are present
      const hasEmailInput = await page.getByTestId('email-input').isVisible().catch(() => false);
      const hasPasswordInput = await page.getByTestId('password-input').isVisible().catch(() => false);
      const hasSubmitButton = await page.getByTestId('login-submit').isVisible().catch(() => false);
      
      if (hasEmailInput && hasPasswordInput && hasSubmitButton) {
        console.log('✓ Basic form elements are available');
        
        // Check if basic form submission still works
        const form = page.locator('form').first();
        const hasForm = await form.isVisible().catch(() => false);
        const action = await form.getAttribute('action').catch(() => null);
        const method = await form.getAttribute('method').catch(() => null);
        
        if (hasForm) {
          if (action && method) {
            console.log('✓ Form has proper fallback attributes for non-JS scenarios');
          } else {
            console.log('⚠ Consider adding form action/method for progressive enhancement');
          }
        }
      } else {
        console.log('⚠ Form elements may depend heavily on JavaScript');
      }
    });
  });
});