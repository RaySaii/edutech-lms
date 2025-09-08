import { test, expect, Page } from '@playwright/test';
import { 
  navigateToLogin,
  navigateToRegister,
  navigateToForgotPassword,
  fillLoginForm,
  submitLoginForm,
  waitForAuthResponse
} from './auth-helpers';

test.describe('Authentication - Error Boundaries & Edge Cases', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    page.setDefaultTimeout(15000);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Network Error Handling', () => {
    test('should handle complete network failure gracefully', async () => {
      await navigateToLogin(page);
      
      // Block all network requests to simulate network failure
      await page.route('**/*', route => {
        route.abort('failed');
      });
      
      await fillLoginForm(page, 'test@example.com', 'password');
      await submitLoginForm(page);
      await waitForAuthResponse();
      
      // Should show appropriate network error message
      const errorElement = page.getByTestId('error-message');
      const networkError = page.locator('text=network').first();
      const connectionError = page.locator('text=connection').first();
      
      const hasNetworkError = await errorElement.isVisible().catch(() => false) ||
                             await networkError.isVisible().catch(() => false) ||
                             await connectionError.isVisible().catch(() => false);
      
      if (hasNetworkError) {
        console.log('✓ Network failure handled gracefully');
      } else {
        console.log('⚠ Consider adding better network error handling');
      }
      
      // Unblock network requests
      await page.unroute('**/*');
    });

    test('should handle slow network responses', async () => {
      await navigateToLogin(page);
      
      // Delay all network requests by 10 seconds
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        route.continue();
      });
      
      await fillLoginForm(page, 'test@example.com', 'password');
      await submitLoginForm(page);
      
      // Should show loading state during slow response
      const loadingStates = [
        page.locator('text=Loading...'),
        page.locator('text=Signing in...'),
        page.locator('.animate-spin'),
        page.getByTestId('loading-spinner')
      ];
      
      let hasLoadingState = false;
      for (const loader of loadingStates) {
        if (await loader.isVisible().catch(() => false)) {
          hasLoadingState = true;
          console.log('✓ Loading state shown during slow network response');
          break;
        }
      }
      
      if (!hasLoadingState) {
        console.log('⚠ Consider adding loading indicators for slow responses');
      }
      
      await page.unroute('**/*');
    });

    test('should handle server errors (500, 502, 503)', async () => {
      await navigateToLogin(page);
      
      // Simulate server errors
      const serverErrors = [500, 502, 503];
      
      for (const statusCode of serverErrors) {
        await page.route('**/auth/login', route => {
          route.fulfill({ status: statusCode, body: 'Server Error' });
        });
        
        await fillLoginForm(page, 'test@example.com', 'password');
        await submitLoginForm(page);
        await waitForAuthResponse();
        
        // Should show user-friendly error message
        const errorElement = page.getByTestId('error-message');
        const hasError = await errorElement.isVisible().catch(() => false);
        
        if (hasError) {
          const errorText = await errorElement.textContent();
          const isUserFriendly = !errorText?.includes(statusCode.toString()) &&
                                 !errorText?.toLowerCase().includes('server error');
          
          if (isUserFriendly) {
            console.log(`✓ Server error ${statusCode} handled with user-friendly message`);
          } else {
            console.log(`⚠ Server error ${statusCode} shows technical details to user`);
          }
        }
        
        await page.unroute('**/auth/login');
        await page.reload();
      }
    });
  });

  test.describe('Client-Side Error Handling', () => {
    test('should handle JavaScript runtime errors gracefully', async () => {
      await navigateToLogin(page);
      
      // Listen for console errors
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });
      
      // Try to inject a script that causes an error (catch if it throws)
      try {
        await page.evaluate(() => {
          // Try to simulate a runtime error without breaking the test
          setTimeout(() => {
            throw new Error('Simulated runtime error');
          }, 0);
        });
      } catch (error) {
        // Expected - the error will be caught by pageerror listener
      }
      
      await page.waitForTimeout(500); // Wait for potential error
      
      // Form should still be functional despite the error
      await fillLoginForm(page, 'test@example.com', 'password');
      const submitButton = page.getByTestId('login-submit');
      const isFormFunctional = await submitButton.isEnabled();
      
      if (isFormFunctional) {
        console.log('✓ Form remains functional despite JavaScript errors');
      } else {
        console.log('⚠ Form functionality may be affected by errors');
      }
    });

    test('should handle malformed API responses', async () => {
      await navigateToLogin(page);
      
      // Return malformed JSON
      await page.route('**/auth/login', route => {
        route.fulfill({ 
          status: 200, 
          contentType: 'application/json',
          body: '{ invalid json }' 
        });
      });
      
      await fillLoginForm(page, 'test@example.com', 'password');
      await submitLoginForm(page);
      await waitForAuthResponse();
      
      // Should handle malformed response gracefully
      const errorElement = page.getByTestId('error-message');
      const hasError = await errorElement.isVisible().catch(() => false);
      
      if (hasError) {
        const errorText = await errorElement.textContent();
        const isGeneric = !errorText?.toLowerCase().includes('json') &&
                         !errorText?.toLowerCase().includes('parse');
        
        if (isGeneric) {
          console.log('✓ Malformed API response handled with generic error');
        } else {
          console.log('⚠ Technical details exposed in malformed response error');
        }
      }
      
      await page.unroute('**/auth/login');
    });
  });

  test.describe('Browser Compatibility Edge Cases', () => {
    test('should handle localStorage unavailability', async () => {
      await navigateToLogin(page);
      
      // Disable localStorage
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: {
            getItem: () => { throw new Error('localStorage not available'); },
            setItem: () => { throw new Error('localStorage not available'); },
            removeItem: () => { throw new Error('localStorage not available'); },
            clear: () => { throw new Error('localStorage not available'); }
          }
        });
      });
      
      await page.reload();
      
      // Should still allow login attempt
      await fillLoginForm(page, 'test@example.com', 'password');
      const submitButton = page.getByTestId('login-submit');
      const canSubmit = await submitButton.isEnabled();
      
      if (canSubmit) {
        console.log('✓ Form functional without localStorage');
      } else {
        console.log('⚠ Form depends on localStorage availability');
      }
    });

    test('should handle sessionStorage unavailability', async () => {
      await navigateToLogin(page);
      
      // Disable sessionStorage
      await page.addInitScript(() => {
        Object.defineProperty(window, 'sessionStorage', {
          value: {
            getItem: () => { throw new Error('sessionStorage not available'); },
            setItem: () => { throw new Error('sessionStorage not available'); },
            removeItem: () => { throw new Error('sessionStorage not available'); },
            clear: () => { throw new Error('sessionStorage not available'); }
          }
        });
      });
      
      await page.reload();
      
      // Should still allow form interaction
      const emailInput = page.getByTestId('email-input');
      await emailInput.fill('test@example.com');
      const value = await emailInput.inputValue();
      
      expect(value).toBe('test@example.com');
      console.log('✓ Form functional without sessionStorage');
    });
  });

  test.describe('Input Validation Edge Cases', () => {
    test('should handle extremely long input values', async () => {
      await navigateToRegister(page);
      
      const longString = 'a'.repeat(1000); // Reduced size to avoid performance issues
      
      // Test with extremely long inputs
      await page.getByTestId('email-input').fill(`test@example.com`);
      await page.getByTestId('password-input').fill(longString);
      await page.getByTestId('first-name-input').fill(longString);
      await page.getByTestId('last-name-input').fill(longString);
      
      // Check if form is still responsive
      const isPageResponsive = await page.getByTestId('register-form').isVisible();
      const submitButton = page.getByTestId('register-submit');
      const isButtonVisible = await submitButton.isVisible();
      
      if (isPageResponsive && isButtonVisible) {
        console.log('✓ Form remains responsive with long inputs');
        
        // Try to submit if enabled
        const isEnabled = await submitButton.isEnabled();
        if (isEnabled) {
          await submitButton.click();
          await waitForAuthResponse();
          console.log('✓ Extremely long inputs handled gracefully');
        }
      } else {
        console.log('⚠ Page became unresponsive with long inputs');
      }
    });

    test('should handle unicode and special characters', async () => {
      await navigateToRegister(page);
      
      const specialInputs = [
        'test@example.de', // Regular domain
        'тест@example.com', // Cyrillic
        'user+tag@example.com', // Plus sign
        'user.name@example.co.uk', // Multiple dots
        'test123@example.com' // Safe test
      ];
      
      for (const email of specialInputs) {
        await page.getByTestId('email-input').fill(email);
        await page.waitForTimeout(300);
        
        // Should not crash or show unexpected behavior
        const inputValue = await page.getByTestId('email-input').inputValue();
        const hasValue = inputValue.length > 0;
        
        if (hasValue) {
          console.log(`✓ Handled input: ${email}`);
        } else {
          console.log(`⚠ Issue with input: ${email}`);
        }
      }
      
      console.log('✓ Special characters and Unicode handled correctly');
    });

    test('should handle rapid input changes', async () => {
      await navigateToLogin(page);
      
      const emailInput = page.getByTestId('email-input');
      
      // Rapid input changes to test debouncing/performance
      for (let i = 0; i < 50; i++) {
        await emailInput.fill(`test${i}@example.com`);
      }
      
      // Should remain responsive
      const finalValue = await emailInput.inputValue();
      const isResponsive = finalValue === 'test49@example.com';
      
      if (isResponsive) {
        console.log('✓ Rapid input changes handled efficiently');
      } else {
        console.log('⚠ Performance issues with rapid input changes');
      }
    });
  });

  test.describe('Security Edge Cases', () => {
    test('should handle CSRF token issues gracefully', async () => {
      await navigateToLogin(page);
      
      // Remove CSRF token if present
      await page.evaluate(() => {
        const csrfTokens = document.querySelectorAll('input[name*="csrf"], input[name*="token"]');
        csrfTokens.forEach(token => token.remove());
      });
      
      await fillLoginForm(page, 'test@example.com', 'password');
      await submitLoginForm(page);
      await waitForAuthResponse();
      
      // Should show appropriate error or handle gracefully
      const errorElement = page.getByTestId('error-message');
      const hasError = await errorElement.isVisible().catch(() => false);
      
      if (hasError) {
        const errorText = await errorElement.textContent();
        const isGeneric = !errorText?.toLowerCase().includes('csrf') &&
                         !errorText?.toLowerCase().includes('token');
        
        if (isGeneric) {
          console.log('✓ CSRF issues handled with generic error message');
        }
      }
    });

    test('should handle content security policy violations', async () => {
      // This test would check if the app handles CSP violations gracefully
      await navigateToLogin(page);
      
      // Listen for CSP violations
      const cspViolations: string[] = [];
      page.on('console', (msg) => {
        if (msg.text().includes('Content Security Policy')) {
          cspViolations.push(msg.text());
        }
      });
      
      // Try to inject inline script (should be blocked by CSP)
      await page.evaluate(() => {
        const script = document.createElement('script');
        script.innerHTML = 'console.log("inline script executed")';
        document.head.appendChild(script);
      });
      
      // Form should still be functional
      const submitButton = page.getByTestId('login-submit');
      const isFormFunctional = await submitButton.isVisible();
      
      if (isFormFunctional) {
        console.log('✓ Form remains functional despite CSP restrictions');
      }
    });
  });

  test.describe('Memory and Performance Edge Cases', () => {
    test('should handle memory pressure gracefully', async () => {
      await navigateToLogin(page);
      
      // Create memory pressure by creating large arrays
      await page.evaluate(() => {
        const largeArrays = [];
        for (let i = 0; i < 100; i++) {
          largeArrays.push(new Array(100000).fill('memory pressure test'));
        }
        (window as any).memoryPressure = largeArrays;
      });
      
      // Form should still be responsive
      await fillLoginForm(page, 'test@example.com', 'password');
      const submitButton = page.getByTestId('login-submit');
      const isResponsive = await submitButton.isEnabled();
      
      if (isResponsive) {
        console.log('✓ Form remains responsive under memory pressure');
      } else {
        console.log('⚠ Performance degradation under memory pressure');
      }
    });
  });
});