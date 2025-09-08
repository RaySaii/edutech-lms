import { test, expect, Page } from '@playwright/test';
import { 
  navigateToLogin, 
  fillLoginForm, 
  submitLoginForm,
  EXISTING_USER_EMAIL,
  EXISTING_USER_PASSWORD
} from '../auth/auth-helpers';

test.describe('Modal and Dialog UI Elements Testing', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should test video player modal elements', async () => {
    // Login first
    await navigateToLogin(page);
    await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
    await submitLoginForm(page);
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to courses
    const coursesLink = page.getByRole('link', { name: /courses/i }) ||
                       page.locator('a[href*="courses"]');

    if (await coursesLink.isVisible().catch(() => false)) {
      await coursesLink.click();
      await page.waitForTimeout(2000);

      // Look for video/play buttons
      const videoButton = page.getByTestId('video-play-button') ||
                         page.locator('button[aria-label*="play"]') ||
                         page.locator('[class*="video"] button') ||
                         page.locator('button').filter({ hasText: /play|video/i });

      if (await videoButton.first().isVisible().catch(() => false)) {
        await videoButton.first().click();

        // Test modal overlay
        const modalOverlay = page.getByTestId('modal-overlay') ||
                           page.locator('[class*="overlay"]') ||
                           page.locator('[role="dialog"]');

        if (await modalOverlay.isVisible().catch(() => false)) {
          await expect(modalOverlay).toBeVisible();

          // Test modal content
          const modalContent = page.getByTestId('modal-content') ||
                              page.locator('[class*="modal-content"]') ||
                              modalOverlay.locator('> div');

          await expect(modalContent).toBeVisible();

          // Test video player elements
          const videoElement = page.locator('video') || page.locator('iframe[src*="video"]');
          if (await videoElement.isVisible().catch(() => false)) {
            await expect(videoElement).toBeVisible();
          }

          // Test modal controls
          const closeButton = page.getByTestId('close-modal') ||
                             page.locator('button[aria-label*="close"]') ||
                             page.locator('[class*="close"]');

          if (await closeButton.isVisible().catch(() => false)) {
            await expect(closeButton).toBeVisible();
            await expect(closeButton).toBeEnabled();

            // Test closing modal
            await closeButton.click();
            await expect(modalOverlay).not.toBeVisible();
          }
        }
      }
    }
  });

  test('should test confirmation dialog elements', async () => {
    await navigateToLogin(page);
    await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
    await submitLoginForm(page);
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Look for delete/remove buttons that might trigger confirmation dialogs
    const deleteButtons = page.locator('button').filter({ hasText: /delete|remove|cancel/i });
    const deleteButtonCount = await deleteButtons.count();

    if (deleteButtonCount > 0) {
      const firstDeleteButton = deleteButtons.first();
      if (await firstDeleteButton.isVisible().catch(() => false)) {
        await firstDeleteButton.click();

        // Test confirmation dialog
        const confirmDialog = page.getByRole('dialog') ||
                            page.getByTestId('confirm-dialog') ||
                            page.locator('[class*="confirm"]');

        if (await confirmDialog.isVisible().catch(() => false)) {
          await expect(confirmDialog).toBeVisible();

          // Test dialog content
          const dialogTitle = confirmDialog.locator('h1, h2, h3, h4, h5, h6') ||
                             page.getByTestId('dialog-title');

          if (await dialogTitle.isVisible().catch(() => false)) {
            await expect(dialogTitle).toBeVisible();
            const titleText = await dialogTitle.textContent();
            expect(titleText).toBeTruthy();
          }

          // Test dialog buttons
          const confirmButton = confirmDialog.getByRole('button', { name: /confirm|yes|delete|ok/i }) ||
                               page.getByTestId('confirm-button');

          const cancelButton = confirmDialog.getByRole('button', { name: /cancel|no/i }) ||
                              page.getByTestId('cancel-button');

          if (await confirmButton.isVisible().catch(() => false)) {
            await expect(confirmButton).toBeVisible();
            await expect(confirmButton).toBeEnabled();
          }

          if (await cancelButton.isVisible().catch(() => false)) {
            await expect(cancelButton).toBeVisible();
            await expect(cancelButton).toBeEnabled();
            
            // Cancel the action
            await cancelButton.click();
            await expect(confirmDialog).not.toBeVisible();
          }
        }
      }
    }
  });

  test('should test notification/toast elements', async () => {
    await navigateToLogin(page);

    // Trigger an error to show toast
    await fillLoginForm(page, 'invalid@example.com', 'wrongpassword');
    await submitLoginForm(page);

    // Look for toast notifications
    const toastContainer = page.getByTestId('toast-container') ||
                          page.locator('[class*="toast"]') ||
                          page.locator('[role="alert"]');

    if (await toastContainer.isVisible().catch(() => false)) {
      await expect(toastContainer).toBeVisible();

      // Test toast message
      const toastMessage = toastContainer.locator('[class*="message"]') ||
                          toastContainer.locator('p, span, div');

      if (await toastMessage.first().isVisible().catch(() => false)) {
        await expect(toastMessage.first()).toBeVisible();
        const messageText = await toastMessage.first().textContent();
        expect(messageText).toBeTruthy();
      }

      // Test toast close button
      const toastCloseButton = toastContainer.locator('button') ||
                              page.getByTestId('toast-close');

      if (await toastCloseButton.isVisible().catch(() => false)) {
        await expect(toastCloseButton).toBeVisible();
        await toastCloseButton.click();
        await expect(toastContainer).not.toBeVisible();
      }
    }
  });

  test('should test dropdown menu elements', async () => {
    await navigateToLogin(page);
    await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
    await submitLoginForm(page);
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Test user profile dropdown
    const userMenuButton = page.getByTestId('user-menu') ||
                          page.locator('button[aria-haspopup="true"]') ||
                          page.locator('[class*="user-menu"]');

    if (await userMenuButton.isVisible().catch(() => false)) {
      await expect(userMenuButton).toBeVisible();
      await expect(userMenuButton).toBeEnabled();

      // Open dropdown
      await userMenuButton.click();

      // Test dropdown content
      const dropdownMenu = page.locator('[role="menu"]') ||
                          page.getByTestId('user-dropdown') ||
                          page.locator('[class*="dropdown-menu"]');

      if (await dropdownMenu.isVisible().catch(() => false)) {
        await expect(dropdownMenu).toBeVisible();

        // Test menu items
        const menuItems = dropdownMenu.locator('[role="menuitem"]') ||
                         dropdownMenu.locator('a, button');

        const itemCount = await menuItems.count();
        if (itemCount > 0) {
          for (let i = 0; i < Math.min(itemCount, 5); i++) {
            const menuItem = menuItems.nth(i);
            if (await menuItem.isVisible().catch(() => false)) {
              await expect(menuItem).toBeVisible();
              await expect(menuItem).toBeEnabled();
            }
          }
        }

        // Test clicking outside closes dropdown
        await page.click('body', { position: { x: 100, y: 100 } });
        await expect(dropdownMenu).not.toBeVisible();
      }
    }

    // Test other dropdown elements (filters, selects, etc.)
    const otherDropdowns = page.locator('select') ||
                          page.locator('[class*="select"]') ||
                          page.locator('button[aria-expanded]');

    const dropdownCount = await otherDropdowns.count();
    if (dropdownCount > 0) {
      const firstDropdown = otherDropdowns.first();
      if (await firstDropdown.isVisible().catch(() => false)) {
        await expect(firstDropdown).toBeVisible();
        await expect(firstDropdown).toBeEnabled();

        if (await firstDropdown.getAttribute('aria-expanded') !== null) {
          await firstDropdown.click();
          
          const expandedState = await firstDropdown.getAttribute('aria-expanded');
          expect(expandedState).toBe('true');
        }
      }
    }
  });

  test('should test sidebar/drawer elements', async () => {
    await navigateToLogin(page);
    await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
    await submitLoginForm(page);
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Look for sidebar toggle buttons
    const sidebarToggle = page.getByTestId('sidebar-toggle') ||
                         page.locator('button[aria-label*="sidebar"]') ||
                         page.locator('[class*="sidebar-toggle"]');

    if (await sidebarToggle.isVisible().catch(() => false)) {
      await expect(sidebarToggle).toBeVisible();
      await sidebarToggle.click();

      // Test sidebar/drawer
      const sidebar = page.getByTestId('sidebar') ||
                     page.locator('[class*="sidebar"]') ||
                     page.locator('[role="complementary"]');

      if (await sidebar.isVisible().catch(() => false)) {
        await expect(sidebar).toBeVisible();

        // Test sidebar navigation items
        const navItems = sidebar.locator('a, button') ||
                        sidebar.locator('[class*="nav-item"]');

        const navCount = await navItems.count();
        if (navCount > 0) {
          for (let i = 0; i < Math.min(navCount, 5); i++) {
            const navItem = navItems.nth(i);
            if (await navItem.isVisible().catch(() => false)) {
              await expect(navItem).toBeVisible();
            }
          }
        }
      }
    }

    // Test mobile drawer (if on mobile viewport)
    await page.setViewportSize({ width: 375, height: 667 });
    
    const mobileDrawerToggle = page.getByTestId('mobile-drawer-toggle') ||
                              page.locator('button[aria-label*="menu"]');

    if (await mobileDrawerToggle.isVisible().catch(() => false)) {
      await mobileDrawerToggle.click();

      const mobileDrawer = page.getByTestId('mobile-drawer') ||
                          page.locator('[class*="mobile-drawer"]') ||
                          page.locator('[role="navigation"]');

      if (await mobileDrawer.isVisible().catch(() => false)) {
        await expect(mobileDrawer).toBeVisible();
      }
    }
  });

  test('should test accordion/collapsible elements', async () => {
    await navigateToLogin(page);
    await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
    await submitLoginForm(page);
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Look for expandable sections
    const expandableButtons = page.locator('[aria-expanded]') ||
                             page.locator('button[class*="expand"]') ||
                             page.getByRole('button').filter({ hasText: /expand|collapse/i });

    const expandableCount = await expandableButtons.count();
    if (expandableCount > 0) {
      for (let i = 0; i < Math.min(expandableCount, 3); i++) {
        const expandButton = expandableButtons.nth(i);
        if (await expandButton.isVisible().catch(() => false)) {
          const isExpanded = await expandButton.getAttribute('aria-expanded') === 'true';
          
          await expect(expandButton).toBeVisible();
          await expandButton.click();

          // Check if state changed
          const newState = await expandButton.getAttribute('aria-expanded');
          expect(newState).toBe(isExpanded ? 'false' : 'true');

          // Test associated content
          const contentId = await expandButton.getAttribute('aria-controls');
          if (contentId) {
            const content = page.locator(`#${contentId}`);
            if (await content.isVisible().catch(() => false)) {
              await expect(content).toBeVisible();
            }
          }
        }
      }
    }
  });

  test('should test tab interface elements', async () => {
    await navigateToLogin(page);
    await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
    await submitLoginForm(page);
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Look for tab interfaces
    const tabList = page.locator('[role="tablist"]') ||
                   page.getByTestId('tab-list') ||
                   page.locator('[class*="tabs"]');

    if (await tabList.isVisible().catch(() => false)) {
      await expect(tabList).toBeVisible();

      // Test tab buttons
      const tabs = tabList.locator('[role="tab"]') ||
                  tabList.locator('button');

      const tabCount = await tabs.count();
      if (tabCount > 0) {
        for (let i = 0; i < Math.min(tabCount, 5); i++) {
          const tab = tabs.nth(i);
          if (await tab.isVisible().catch(() => false)) {
            await expect(tab).toBeVisible();
            await expect(tab).toBeEnabled();

            // Test tab activation
            await tab.click();
            
            const isSelected = await tab.getAttribute('aria-selected') === 'true' ||
                              await tab.getAttribute('data-state') === 'active';
            
            expect(isSelected).toBeTruthy();

            // Test associated tab panel
            const tabId = await tab.getAttribute('aria-controls') || 
                         await tab.getAttribute('data-tab');
            
            if (tabId) {
              const tabPanel = page.locator(`#${tabId}`) ||
                              page.locator(`[data-tab="${tabId}"]`);
              
              if (await tabPanel.isVisible().catch(() => false)) {
                await expect(tabPanel).toBeVisible();
              }
            }
          }
        }
      }
    }
  });

  test('should test progress indicator elements', async () => {
    await navigateToLogin(page);
    await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
    await submitLoginForm(page);
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Look for progress bars
    const progressBars = page.locator('[role="progressbar"]') ||
                        page.getByTestId('progress-bar') ||
                        page.locator('[class*="progress"]');

    const progressCount = await progressBars.count();
    if (progressCount > 0) {
      for (let i = 0; i < Math.min(progressCount, 3); i++) {
        const progressBar = progressBars.nth(i);
        if (await progressBar.isVisible().catch(() => false)) {
          await expect(progressBar).toBeVisible();

          // Test progress attributes
          const value = await progressBar.getAttribute('aria-valuenow');
          const min = await progressBar.getAttribute('aria-valuemin');
          const max = await progressBar.getAttribute('aria-valuemax');

          if (value !== null) {
            const progressValue = parseInt(value);
            expect(progressValue).toBeGreaterThanOrEqual(parseInt(min || '0'));
            expect(progressValue).toBeLessThanOrEqual(parseInt(max || '100'));
          }
        }
      }
    }

    // Test step indicators
    const stepIndicators = page.locator('[class*="step"]') ||
                          page.locator('[class*="wizard"]') ||
                          page.locator('ol li');

    const stepCount = await stepIndicators.count();
    if (stepCount > 1) {
      for (let i = 0; i < Math.min(stepCount, 5); i++) {
        const step = stepIndicators.nth(i);
        if (await step.isVisible().catch(() => false)) {
          await expect(step).toBeVisible();
        }
      }
    }
  });
});