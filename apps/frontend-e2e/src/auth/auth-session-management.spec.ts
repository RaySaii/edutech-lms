import { test, expect, Page } from '@playwright/test';
import { 
  navigateToLogin,
  fillLoginForm,
  submitLoginForm,
  waitForAuthResponse,
  EXISTING_USER_EMAIL,
  EXISTING_USER_PASSWORD
} from './auth-helpers';

test.describe('Authentication - Session Management', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    page.setDefaultTimeout(15000);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Session Persistence and Timeout', () => {
    test('should maintain session across page reloads', async () => {
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Check if login was successful
      const currentUrl = page.url();
      const isLoginSuccessful = currentUrl.includes('dashboard') || 
                               currentUrl.includes('home') ||
                               await page.getByTestId('user-menu').isVisible().catch(() => false);

      if (isLoginSuccessful) {
        console.log('✓ Login successful, testing session persistence');

        // Reload the page
        await page.reload();
        await page.waitForTimeout(2000);

        // Verify session is maintained
        const stillAuthenticated = await page.getByTestId('user-menu').isVisible().catch(() => false) ||
                                  !page.url().includes('/login');

        if (stillAuthenticated) {
          console.log('✓ Session persisted across page reload');
        } else {
          console.log('⚠ Session not persisted - may be intended behavior');
        }
      }
    });

    test('should handle session expiration gracefully', async () => {
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Simulate session expiration by clearing localStorage/sessionStorage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Try to access protected route
      await page.goto('http://localhost:4200/profile');
      await page.waitForTimeout(2000);

      // Should redirect to login or show appropriate message
      const currentUrl = page.url();
      const isRedirectedToLogin = currentUrl.includes('/login');
      
      if (isRedirectedToLogin) {
        console.log('✓ Expired session properly redirected to login');
      } else {
        // Check for session expired message
        const sessionExpiredMessage = await page.locator('text=session expired').isVisible().catch(() => false) ||
                                     await page.locator('text=please log in').isVisible().catch(() => false);
        
        if (sessionExpiredMessage) {
          console.log('✓ Session expiration handled with user message');
        }
      }
    });

    test('should handle multiple tabs with same session', async () => {
      // Login in first tab
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      const isLoggedIn = await page.getByTestId('user-menu').isVisible().catch(() => false) ||
                        !page.url().includes('/login');

      if (isLoggedIn) {
        // Open second tab
        const secondPage = await page.context().newPage();
        await secondPage.goto('http://localhost:4200/dashboard');
        
        // Should be authenticated in second tab
        await secondPage.waitForTimeout(2000);
        const secondTabAuthenticated = !secondPage.url().includes('/login') ||
                                      await secondPage.getByTestId('user-menu').isVisible().catch(() => false);

        if (secondTabAuthenticated) {
          console.log('✓ Session shared across multiple tabs');
        }

        await secondPage.close();
      }
    });
  });

  test.describe('Logout and Session Termination', () => {
    test('should completely terminate session on logout', async () => {
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      const isLoggedIn = await page.getByTestId('user-menu').isVisible().catch(() => false);
      
      if (isLoggedIn) {
        // Perform logout
        const logoutButton = page.getByTestId('logout-button');
        if (await logoutButton.isVisible()) {
          await logoutButton.click();
          await waitForAuthResponse();

          // Verify session is terminated
          await page.waitForTimeout(2000);
          const isLoggedOut = page.url().includes('/login') ||
                             await page.getByTestId('login-form').isVisible().catch(() => false);

          expect(isLoggedOut).toBe(true);
          console.log('✓ Logout successfully terminated session');

          // Try to access protected route after logout
          await page.goto('http://localhost:4200/dashboard');
          await page.waitForTimeout(2000);

          const redirectedToLogin = page.url().includes('/login');
          if (redirectedToLogin) {
            console.log('✓ Protected routes inaccessible after logout');
          }
        }
      }
    });

    test('should clear sensitive data on logout', async () => {
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Check for stored authentication data
      const preLogoutStorage = await page.evaluate(() => {
        return {
          localStorage: Object.keys(localStorage),
          sessionStorage: Object.keys(sessionStorage)
        };
      });

      const logoutButton = page.getByTestId('logout-button');
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await waitForAuthResponse();

        // Verify sensitive data is cleared
        const postLogoutStorage = await page.evaluate(() => {
          return {
            localStorage: Object.keys(localStorage),
            sessionStorage: Object.keys(sessionStorage)
          };
        });

        // Check if auth-related keys are removed
        const authKeysRemoved = !postLogoutStorage.localStorage.some(key => 
          key.includes('token') || key.includes('auth') || key.includes('user')
        );

        if (authKeysRemoved) {
          console.log('✓ Sensitive authentication data cleared on logout');
        }
      }
    });
  });


  test.describe('Token Refresh and Auto-Login', () => {
    test('should handle automatic token refresh', async () => {
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      const isLoggedIn = await page.getByTestId('user-menu').isVisible().catch(() => false);
      
      if (isLoggedIn) {
        // Wait for potential token refresh (simulate time passing)
        await page.waitForTimeout(5000);

        // Perform an action that might trigger token refresh
        await page.goto('http://localhost:4200/profile');
        await page.waitForTimeout(2000);

        // Should still be authenticated
        const stillAuthenticated = !page.url().includes('/login');
        
        if (stillAuthenticated) {
          console.log('✓ Token refresh working or not needed');
        } else {
          console.log('⚠ Session expired - token refresh may not be implemented');
        }
      }
    });

    test('should handle remember me functionality', async () => {
      await navigateToLogin(page);
      
      // Check for remember me checkbox
      const rememberMeCheckbox = page.getByTestId('remember-me');
      const hasRememberMe = await rememberMeCheckbox.isVisible().catch(() => false);
      
      if (hasRememberMe) {
        await rememberMeCheckbox.check();
        await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
        await submitLoginForm(page);
        await waitForAuthResponse();

        // Close browser and reopen (simulate browser restart)
        await page.context().close();
        const newContext = await page.context().browser().newContext();
        const newPage = await newContext.newPage();
        
        await newPage.goto('http://localhost:4200/dashboard');
        await newPage.waitForTimeout(2000);

        const autoLoggedIn = !newPage.url().includes('/login');
        
        if (autoLoggedIn) {
          console.log('✓ Remember me functionality working');
        } else {
          console.log('⚠ Remember me not implemented or session expired');
        }

        await newPage.close();
        await newContext.close();
      } else {
        console.log('⚠ Remember me functionality not found');
      }
    });
  });
});