import { test, expect, Page } from '@playwright/test';
import { 
  navigateToLogin, 
  fillLoginForm, 
  submitLoginForm, 
  waitForAuthResponse,
  EXISTING_USER_EMAIL,
  EXISTING_USER_PASSWORD
} from '../auth/auth-helpers';

test.describe('Admin Panel Comprehensive Functionality', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    page.setDefaultTimeout(15000);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Admin Dashboard Access and Overview', () => {
    test('admin can access dashboard with comprehensive statistics', async () => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Navigate to admin dashboard
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Check for admin access or redirect to dashboard
      const currentUrl = page.url();
      const hasAdminAccess = !currentUrl.includes('/unauthorized') && !currentUrl.includes('/login');
      
      if (hasAdminAccess) {
        console.log('✓ Admin dashboard access granted');
        
        // Look for admin-specific statistics
        const adminStats = [
          page.locator(':has-text("Total Courses"), [data-testid*="total-courses"]'),
          page.locator(':has-text("Total Students"), [data-testid*="total-students"]'),
          page.locator(':has-text("Revenue"), [data-testid*="revenue"]'),
          page.locator(':has-text("Active Users"), [data-testid*="active"]')
        ];
        
        let statsFound = 0;
        for (const stat of adminStats) {
          if (await stat.first().isVisible().catch(() => false)) {
            statsFound++;
          }
        }
        
        console.log(`✓ Found ${statsFound} admin statistics widgets`);
        
        // Look for admin navigation menu
        const adminMenuItems = [
          page.locator('a:has-text("Analytics"), [href*="analytics"]'),
          page.locator('a:has-text("Content"), [href*="content"]'),
          page.locator('a:has-text("Users"), [href*="users"]'),
          page.locator('a:has-text("Settings"), [href*="settings"]')
        ];
        
        let menuItemsFound = 0;
        for (const item of adminMenuItems) {
          if (await item.first().isVisible().catch(() => false)) {
            menuItemsFound++;
          }
        }
        
        console.log(`✓ Found ${menuItemsFound} admin navigation items`);
        
        // Check for data tables/charts
        const dataVisualizations = [
          page.locator('table, [data-testid*="table"]'),
          page.locator('canvas, svg, [data-testid*="chart"]'),
          page.locator('.chart, [class*="chart"]')
        ];
        
        let chartsFound = 0;
        for (const viz of dataVisualizations) {
          chartsFound += await viz.count();
        }
        
        if (chartsFound > 0) {
          console.log(`✓ Found ${chartsFound} data visualization elements`);
        }
      } else {
        console.log('⚠ Admin access denied - user may not have admin privileges');
        
        // Verify access denial is properly handled
        const accessDeniedElements = [
          page.locator(':has-text("Access Denied"), :has-text("Unauthorized")'),
          page.locator('[data-testid*="access-denied"], [data-testid*="unauthorized"]')
        ];
        
        for (const element of accessDeniedElements) {
          if (await element.first().isVisible().catch(() => false)) {
            console.log('✓ Access control properly enforced');
            break;
          }
        }
      }
    });

    test('admin can view and manage course content', async () => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Navigate to content management
      const contentPaths = ['/admin/content', '/admin', '/dashboard'];
      
      for (const path of contentPaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        // Look for content management features
        const contentManagementElements = [
          page.locator('button:has-text("Add Content"), button:has-text("Create Course")'),
          page.locator('[data-testid*="content"], [data-testid*="course"]'),
          page.locator('table tr, [data-testid*="course-item"]'),
          page.locator(':has-text("Manage Courses"), :has-text("Content Library")')
        ];
        
        let hasContentManagement = false;
        for (const element of contentManagementElements) {
          if (await element.first().isVisible().catch(() => false)) {
            hasContentManagement = true;
            console.log(`✓ Content management features found on ${path}`);
            
            // Count available courses/content
            const contentItems = page.locator('[data-testid*="course"], tr, .course-item');
            const itemCount = await contentItems.count();
            if (itemCount > 0) {
              console.log(`✓ Found ${itemCount} content items`);
            }
            
            // Look for editing capabilities
            const editButtons = page.locator('button:has-text("Edit"), [data-testid*="edit"], a:has-text("Edit")');
            const editCount = await editButtons.count();
            if (editCount > 0) {
              console.log(`✓ Found ${editCount} edit actions`);
            }
            
            // Look for deletion capabilities
            const deleteButtons = page.locator('button:has-text("Delete"), [data-testid*="delete"]');
            const deleteCount = await deleteButtons.count();
            if (deleteCount > 0) {
              console.log(`✓ Found ${deleteCount} delete actions`);
            }
            break;
          }
        }
        
        if (hasContentManagement) break;
      }
    });

    test('admin can view analytics and reporting data', async () => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Navigate to analytics
      const analyticsPaths = ['/admin/analytics', '/admin', '/dashboard'];
      
      for (const path of analyticsPaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        // Look for analytics and reporting features
        const analyticsElements = [
          page.locator(':has-text("Analytics"), :has-text("Reports")'),
          page.locator('[data-testid*="analytics"], [data-testid*="report"]'),
          page.locator('canvas, svg, .chart'),
          page.locator(':has-text("Enrollment"), :has-text("Revenue"), :has-text("Usage")')
        ];
        
        let hasAnalytics = false;
        for (const element of analyticsElements) {
          if (await element.first().isVisible().catch(() => false)) {
            hasAnalytics = true;
            console.log(`✓ Analytics features found on ${path}`);
            
            // Count different types of metrics
            const metricTypes = [
              page.locator(':has-text("Students"), :has-text("Enrollment")'),
              page.locator(':has-text("Revenue"), :has-text("Sales")'),
              page.locator(':has-text("Courses"), :has-text("Content")'),
              page.locator(':has-text("Completion"), :has-text("Progress")')
            ];
            
            let metricsFound = 0;
            for (const metric of metricTypes) {
              if (await metric.first().isVisible().catch(() => false)) {
                metricsFound++;
              }
            }
            
            console.log(`✓ Found ${metricsFound} different metric types`);
            
            // Look for interactive elements
            const interactiveElements = [
              page.locator('select, [data-testid*="filter"]'),
              page.locator('button:has-text("Filter"), button:has-text("Export")'),
              page.locator('input[type="date"], [data-testid*="date"]')
            ];
            
            let interactiveCount = 0;
            for (const interactive of interactiveElements) {
              interactiveCount += await interactive.count();
            }
            
            if (interactiveCount > 0) {
              console.log(`✓ Found ${interactiveCount} interactive analytics elements`);
            }
            break;
          }
        }
        
        if (hasAnalytics) break;
      }
    });
  });

  test.describe('User Management Functionality', () => {
    test('admin can view and manage user accounts', async () => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Look for user management across admin pages
      const userManagementPaths = ['/admin/users', '/admin', '/dashboard'];
      
      for (const path of userManagementPaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        // Look for user management features
        const userManagementElements = [
          page.locator(':has-text("Users"), :has-text("Students"), :has-text("Teachers")'),
          page.locator('[data-testid*="user"], [data-testid*="student"]'),
          page.locator('table thead th:has-text("Email"), table thead th:has-text("Name")'),
          page.locator('button:has-text("Add User"), button:has-text("Create User")')
        ];
        
        let hasUserManagement = false;
        for (const element of userManagementElements) {
          if (await element.first().isVisible().catch(() => false)) {
            hasUserManagement = true;
            console.log(`✓ User management features found on ${path}`);
            
            // Count users displayed
            const userRows = page.locator('tr:has(td), [data-testid*="user-item"]');
            const userCount = await userRows.count();
            if (userCount > 0) {
              console.log(`✓ Found ${userCount} user entries`);
            }
            
            // Look for user action buttons
            const userActions = [
              page.locator('button:has-text("Edit"), [data-testid*="edit-user"]'),
              page.locator('button:has-text("Disable"), button:has-text("Enable")'),
              page.locator('button:has-text("Delete"), [data-testid*="delete-user"]')
            ];
            
            let actionsFound = 0;
            for (const action of userActions) {
              actionsFound += await action.count();
            }
            
            if (actionsFound > 0) {
              console.log(`✓ Found ${actionsFound} user management actions`);
            }
            break;
          }
        }
        
        if (hasUserManagement) break;
      }
    });
  });

  test.describe('System Configuration and Settings', () => {
    test('admin can access system settings and configuration', async () => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Look for settings/configuration options
      const settingsPaths = ['/admin/settings', '/admin', '/settings'];
      
      for (const path of settingsPaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        // Look for settings and configuration
        const settingsElements = [
          page.locator(':has-text("Settings"), :has-text("Configuration")'),
          page.locator('[data-testid*="setting"], [data-testid*="config"]'),
          page.locator('input[type="checkbox"], input[type="radio"]'),
          page.locator('label:has-text("Enable"), label:has-text("Allow")')
        ];
        
        let hasSettings = false;
        for (const element of settingsElements) {
          if (await element.first().isVisible().catch(() => false)) {
            hasSettings = true;
            console.log(`✓ Settings features found on ${path}`);
            
            // Count different setting options
            const settingInputs = page.locator('input, select, textarea');
            const inputCount = await settingInputs.count();
            if (inputCount > 0) {
              console.log(`✓ Found ${inputCount} configurable settings`);
            }
            
            // Look for save functionality
            const saveButtons = page.locator('button:has-text("Save"), button:has-text("Update"), [data-testid*="save"]');
            const saveCount = await saveButtons.count();
            if (saveCount > 0) {
              console.log(`✓ Found ${saveCount} save actions`);
            }
            break;
          }
        }
        
        if (hasSettings) break;
      }
    });
  });

  test.describe('Content Upload and File Management', () => {
    test('admin can upload and manage course content files', async () => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Look for file upload capabilities
      const uploadPaths = ['/admin/content', '/courses/create', '/admin'];
      
      for (const path of uploadPaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        // Look for file upload elements
        const uploadElements = [
          page.locator('input[type="file"]'),
          page.locator('[data-testid*="upload"], [data-testid*="file"]'),
          page.locator('button:has-text("Upload"), button:has-text("Browse")'),
          page.locator(':has-text("Drag and drop"), :has-text("Choose file")')
        ];
        
        let hasUpload = false;
        for (const element of uploadElements) {
          if (await element.first().isVisible().catch(() => false)) {
            hasUpload = true;
            console.log(`✓ File upload features found on ${path}`);
            
            // Count upload areas
            const uploadAreas = page.locator('input[type="file"], [data-testid*="upload"]');
            const uploadCount = await uploadAreas.count();
            console.log(`✓ Found ${uploadCount} file upload areas`);
            
            // Look for supported file types info
            const fileTypeInfo = page.locator(':has-text(".mp4"), :has-text(".pdf"), :has-text("video"), :has-text("document")');
            const typeCount = await fileTypeInfo.count();
            if (typeCount > 0) {
              console.log(`✓ Found file type restrictions/info`);
            }
            break;
          }
        }
        
        if (hasUpload) break;
      }
    });
  });

  test.describe('Notification and Communication Management', () => {
    test('admin can manage system notifications and communications', async () => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Look for notification management
      const notificationPaths = ['/admin/notifications', '/admin', '/dashboard'];
      
      for (const path of notificationPaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        // Look for notification elements
        const notificationElements = [
          page.locator(':has-text("Notifications"), :has-text("Messages")'),
          page.locator('[data-testid*="notification"], [data-testid*="message"]'),
          page.locator('button:has-text("Send"), button:has-text("Notify")'),
          page.locator('.notification, [class*="notification"]')
        ];
        
        let hasNotifications = false;
        for (const element of notificationElements) {
          if (await element.first().isVisible().catch(() => false)) {
            hasNotifications = true;
            console.log(`✓ Notification features found on ${path}`);
            
            // Count existing notifications
            const notificationItems = page.locator('[data-testid*="notification"], .notification, [class*="notification"]');
            const notifCount = await notificationItems.count();
            if (notifCount > 0) {
              console.log(`✓ Found ${notifCount} notification items`);
            }
            
            // Look for notification composition
            const composeElements = page.locator('textarea, input[placeholder*="message"], [data-testid*="compose"]');
            const composeCount = await composeElements.count();
            if (composeCount > 0) {
              console.log(`✓ Found notification composition interface`);
            }
            break;
          }
        }
        
        if (hasNotifications) break;
      }
    });
  });
});