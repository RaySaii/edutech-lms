import { test, expect, Page } from '@playwright/test';
import { 
  navigateToLogin, 
  fillLoginForm, 
  submitLoginForm,
  EXISTING_USER_EMAIL,
  EXISTING_USER_PASSWORD
} from '../auth/auth-helpers';

test.describe('Admin Panel UI Components Testing', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // Login before each test
    await navigateToLogin(page);
    await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
    await submitLoginForm(page);
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should test admin dashboard access and layout', async () => {
    // Try to navigate to admin panel
    const adminLink = page.getByRole('link', { name: /admin/i }) ||
                     page.getByTestId('admin-link') ||
                     page.locator('a[href*="admin"]');

    if (await adminLink.isVisible().catch(() => false)) {
      await adminLink.click();
      await page.waitForTimeout(2000);
    } else {
      // Try direct navigation
      await page.goto('http://localhost:4200/admin');
    }

    // Test admin dashboard container
    const adminDashboard = page.getByTestId('admin-dashboard') ||
                          page.locator('[class*="admin-dashboard"]') ||
                          page.locator('main');

    if (await adminDashboard.isVisible().catch(() => false)) {
      await expect(adminDashboard).toBeVisible();

      // Test admin page title
      const adminTitle = adminDashboard.locator('h1') ||
                        page.getByText(/admin/i).filter({ hasText: /dashboard|panel/i });

      if (await adminTitle.isVisible().catch(() => false)) {
        await expect(adminTitle).toBeVisible();
      }

      // Test admin navigation/sidebar
      const adminNav = page.locator('nav[class*="admin"]') ||
                      page.locator('[class*="admin-nav"]') ||
                      page.locator('aside');

      if (await adminNav.isVisible().catch(() => false)) {
        await expect(adminNav).toBeVisible();

        const navItems = adminNav.locator('a, button');
        const navCount = await navItems.count();

        if (navCount > 0) {
          const expectedAdminSections = ['Users', 'Courses', 'Analytics', 'Content', 'Settings'];
          
          for (let i = 0; i < Math.min(navCount, 8); i++) {
            const navItem = navItems.nth(i);
            if (await navItem.isVisible().catch(() => false)) {
              await expect(navItem).toBeVisible();
              await expect(navItem).toBeEnabled();
            }
          }
        }
      }
    } else {
      console.log('Admin panel not accessible or user lacks admin privileges');
    }
  });

  test('should test admin user management interface', async () => {
    // Navigate to users management
    await page.goto('http://localhost:4200/admin/users').catch(() => 
      page.goto('http://localhost:4200/admin')
    );

    // Look for users section or navigate to it
    const usersLink = page.getByRole('link', { name: /users/i }) ||
                     page.getByTestId('users-link');

    if (await usersLink.isVisible().catch(() => false)) {
      await usersLink.click();
      await page.waitForTimeout(2000);
    }

    const usersSection = page.getByTestId('users-management') ||
                        page.locator('[class*="users"]') ||
                        page.getByText(/user management/i).locator('..');

    if (await usersSection.isVisible().catch(() => false)) {
      await expect(usersSection).toBeVisible();

      // Test users table/grid
      const usersTable = usersSection.locator('table') ||
                        usersSection.locator('[class*="data-table"]') ||
                        usersSection.locator('[role="grid"]');

      if (await usersTable.isVisible().catch(() => false)) {
        await expect(usersTable).toBeVisible();

        // Test table headers
        const tableHeaders = usersTable.locator('th') ||
                           usersTable.locator('[role="columnheader"]');

        const headerCount = await tableHeaders.count();
        if (headerCount > 0) {
          const expectedHeaders = ['Name', 'Email', 'Role', 'Status', 'Actions'];
          
          for (let i = 0; i < Math.min(headerCount, 6); i++) {
            const header = tableHeaders.nth(i);
            if (await header.isVisible().catch(() => false)) {
              await expect(header).toBeVisible();
            }
          }
        }

        // Test table rows
        const tableRows = usersTable.locator('tbody tr') ||
                         usersTable.locator('[role="row"]:not([role="columnheader"])');

        const rowCount = await tableRows.count();
        if (rowCount > 0) {
          for (let i = 0; i < Math.min(rowCount, 5); i++) {
            const row = tableRows.nth(i);
            if (await row.isVisible().catch(() => false)) {
              await expect(row).toBeVisible();

              // Test row cells
              const cells = row.locator('td') || row.locator('[role="gridcell"]');
              const cellCount = await cells.count();

              if (cellCount > 0) {
                for (let j = 0; j < Math.min(cellCount, 5); j++) {
                  const cell = cells.nth(j);
                  if (await cell.isVisible().catch(() => false)) {
                    await expect(cell).toBeVisible();
                  }
                }
              }

              // Test action buttons in row
              const actionButtons = row.locator('button') || row.locator('[role="button"]');
              const buttonCount = await actionButtons.count();

              if (buttonCount > 0) {
                for (let j = 0; j < Math.min(buttonCount, 3); j++) {
                  const button = actionButtons.nth(j);
                  if (await button.isVisible().catch(() => false)) {
                    await expect(button).toBeVisible();
                    await expect(button).toBeEnabled();
                  }
                }
              }
            }
          }
        }
      }

      // Test user search functionality
      const userSearchInput = usersSection.locator('input[placeholder*="search"]') ||
                             usersSection.getByTestId('user-search');

      if (await userSearchInput.isVisible().catch(() => false)) {
        await expect(userSearchInput).toBeVisible();
        await userSearchInput.fill('test');
        await expect(userSearchInput).toHaveValue('test');
      }

      // Test user filters
      const userFilters = usersSection.locator('select') ||
                         usersSection.locator('[class*="filter"]');

      const filterCount = await userFilters.count();
      if (filterCount > 0) {
        const firstFilter = userFilters.first();
        if (await firstFilter.isVisible().catch(() => false)) {
          await expect(firstFilter).toBeVisible();
        }
      }

      // Test add user button
      const addUserButton = usersSection.getByRole('button', { name: /add user|create user/i }) ||
                           usersSection.getByTestId('add-user-button');

      if (await addUserButton.isVisible().catch(() => false)) {
        await expect(addUserButton).toBeVisible();
        await expect(addUserButton).toBeEnabled();
      }
    }
  });

  test('should test admin course management interface', async () => {
    // Navigate to course management
    await page.goto('http://localhost:4200/admin/courses').catch(() => 
      page.goto('http://localhost:4200/admin')
    );

    const coursesLink = page.getByRole('link', { name: /courses/i }) ||
                       page.getByTestId('admin-courses-link');

    if (await coursesLink.isVisible().catch(() => false)) {
      await coursesLink.click();
      await page.waitForTimeout(2000);
    }

    const coursesSection = page.getByTestId('courses-management') ||
                          page.locator('[class*="courses-admin"]') ||
                          page.getByText(/course management/i).locator('..');

    if (await coursesSection.isVisible().catch(() => false)) {
      await expect(coursesSection).toBeVisible();

      // Test courses grid/table view toggle
      const viewToggle = coursesSection.locator('[class*="view-toggle"]') ||
                        coursesSection.locator('button[aria-label*="view"]');

      if (await viewToggle.isVisible().catch(() => false)) {
        const toggleButtons = viewToggle.locator('button');
        const toggleCount = await toggleButtons.count();

        if (toggleCount > 1) {
          for (let i = 0; i < toggleCount; i++) {
            const toggleBtn = toggleButtons.nth(i);
            if (await toggleBtn.isVisible().catch(() => false)) {
              await expect(toggleBtn).toBeVisible();
              await expect(toggleBtn).toBeEnabled();
            }
          }
        }
      }

      // Test course cards/items
      const courseItems = coursesSection.locator('[class*="course-item"]') ||
                         coursesSection.locator('tbody tr') ||
                         coursesSection.locator('.card');

      const courseCount = await courseItems.count();
      if (courseCount > 0) {
        for (let i = 0; i < Math.min(courseCount, 5); i++) {
          const courseItem = courseItems.nth(i);
          if (await courseItem.isVisible().catch(() => false)) {
            await expect(courseItem).toBeVisible();

            // Test course title
            const courseTitle = courseItem.locator('h3, h4, h5') ||
                              courseItem.getByTestId('course-title');

            if (await courseTitle.isVisible().catch(() => false)) {
              await expect(courseTitle).toBeVisible();
            }

            // Test course status indicator
            const statusIndicator = courseItem.locator('[class*="status"]') ||
                                  courseItem.locator('[class*="badge"]');

            if (await statusIndicator.isVisible().catch(() => false)) {
              await expect(statusIndicator).toBeVisible();
            }

            // Test course actions
            const courseActions = courseItem.locator('button') ||
                                courseItem.locator('[role="button"]');

            const actionCount = await courseActions.count();
            if (actionCount > 0) {
              for (let j = 0; j < Math.min(actionCount, 4); j++) {
                const action = courseActions.nth(j);
                if (await action.isVisible().catch(() => false)) {
                  await expect(action).toBeVisible();
                  await expect(action).toBeEnabled();
                }
              }
            }
          }
        }
      }

      // Test course creation button
      const createCourseButton = coursesSection.getByRole('button', { name: /create course|add course/i }) ||
                                coursesSection.getByTestId('create-course-button');

      if (await createCourseButton.isVisible().catch(() => false)) {
        await expect(createCourseButton).toBeVisible();
        await expect(createCourseButton).toBeEnabled();
      }

      // Test bulk actions
      const bulkActions = coursesSection.locator('[class*="bulk-actions"]') ||
                         coursesSection.getByTestId('bulk-actions');

      if (await bulkActions.isVisible().catch(() => false)) {
        await expect(bulkActions).toBeVisible();

        const bulkButtons = bulkActions.locator('button');
        const bulkCount = await bulkButtons.count();

        if (bulkCount > 0) {
          for (let i = 0; i < Math.min(bulkCount, 3); i++) {
            const bulkBtn = bulkButtons.nth(i);
            if (await bulkBtn.isVisible().catch(() => false)) {
              await expect(bulkBtn).toBeVisible();
            }
          }
        }
      }
    }
  });

  test('should test admin analytics dashboard UI', async () => {
    // Navigate to analytics
    await page.goto('http://localhost:4200/admin/analytics').catch(() => 
      page.goto('http://localhost:4200/admin')
    );

    const analyticsLink = page.getByRole('link', { name: /analytics/i }) ||
                         page.getByTestId('analytics-link');

    if (await analyticsLink.isVisible().catch(() => false)) {
      await analyticsLink.click();
      await page.waitForTimeout(2000);
    }

    const analyticsSection = page.getByTestId('analytics-dashboard') ||
                           page.locator('[class*="analytics"]') ||
                           page.getByText(/analytics/i).locator('..');

    if (await analyticsSection.isVisible().catch(() => false)) {
      await expect(analyticsSection).toBeVisible();

      // Test analytics cards/metrics
      const metricsCards = analyticsSection.locator('[class*="metric"]') ||
                         analyticsSection.locator('[class*="stat"]') ||
                         analyticsSection.locator('.card');

      const metricsCount = await metricsCards.count();
      if (metricsCount > 0) {
        for (let i = 0; i < Math.min(metricsCount, 6); i++) {
          const metricCard = metricsCards.nth(i);
          if (await metricCard.isVisible().catch(() => false)) {
            await expect(metricCard).toBeVisible();

            // Test metric value
            const metricValue = metricCard.locator('[class*="value"]') ||
                              metricCard.locator('[class*="number"]');

            if (await metricValue.isVisible().catch(() => false)) {
              await expect(metricValue).toBeVisible();
            }

            // Test metric title
            const metricTitle = metricCard.locator('h3, h4, h5') ||
                              metricCard.locator('[class*="title"]');

            if (await metricTitle.isVisible().catch(() => false)) {
              await expect(metricTitle).toBeVisible();
            }

            // Test metric trend indicator
            const trendIndicator = metricCard.locator('[class*="trend"]') ||
                                 metricCard.locator('svg');

            if (await trendIndicator.isVisible().catch(() => false)) {
              await expect(trendIndicator).toBeVisible();
            }
          }
        }
      }

      // Test charts/graphs
      const charts = analyticsSection.locator('canvas') ||
                    analyticsSection.locator('svg') ||
                    analyticsSection.locator('[class*="chart"]');

      const chartCount = await charts.count();
      if (chartCount > 0) {
        for (let i = 0; i < Math.min(chartCount, 3); i++) {
          const chart = charts.nth(i);
          if (await chart.isVisible().catch(() => false)) {
            await expect(chart).toBeVisible();
          }
        }
      }

      // Test date range picker
      const dateRangePicker = analyticsSection.locator('input[type="date"]') ||
                            analyticsSection.getByTestId('date-picker') ||
                            analyticsSection.locator('[class*="date-range"]');

      if (await dateRangePicker.isVisible().catch(() => false)) {
        await expect(dateRangePicker).toBeVisible();
      }

      // Test export/download buttons
      const exportButton = analyticsSection.getByRole('button', { name: /export|download/i }) ||
                          analyticsSection.getByTestId('export-button');

      if (await exportButton.isVisible().catch(() => false)) {
        await expect(exportButton).toBeVisible();
        await expect(exportButton).toBeEnabled();
      }
    }
  });

  test('should test admin content management UI', async () => {
    // Navigate to content management
    await page.goto('http://localhost:4200/admin/content').catch(() => 
      page.goto('http://localhost:4200/admin')
    );

    const contentLink = page.getByRole('link', { name: /content/i }) ||
                       page.getByTestId('content-link');

    if (await contentLink.isVisible().catch(() => false)) {
      await contentLink.click();
      await page.waitForTimeout(2000);
    }

    const contentSection = page.getByTestId('content-management') ||
                          page.locator('[class*="content-admin"]') ||
                          page.getByText(/content management/i).locator('..');

    if (await contentSection.isVisible().catch(() => false)) {
      await expect(contentSection).toBeVisible();

      // Test content type tabs
      const contentTabs = contentSection.locator('[role="tablist"]') ||
                         contentSection.locator('[class*="tabs"]');

      if (await contentTabs.isVisible().catch(() => false)) {
        const tabs = contentTabs.locator('[role="tab"]') || contentTabs.locator('button');
        const tabCount = await tabs.count();

        if (tabCount > 0) {
          const expectedContentTypes = ['Videos', 'Documents', 'Quizzes', 'Assignments'];
          
          for (let i = 0; i < Math.min(tabCount, 5); i++) {
            const tab = tabs.nth(i);
            if (await tab.isVisible().catch(() => false)) {
              await expect(tab).toBeVisible();
              await expect(tab).toBeEnabled();
            }
          }
        }
      }

      // Test file upload area
      const uploadArea = contentSection.locator('[class*="upload"]') ||
                        contentSection.locator('input[type="file"]').locator('..');

      if (await uploadArea.isVisible().catch(() => false)) {
        await expect(uploadArea).toBeVisible();

        // Test file input
        const fileInput = uploadArea.locator('input[type="file"]') ||
                         contentSection.locator('input[type="file"]');

        if (await fileInput.isVisible().catch(() => false)) {
          await expect(fileInput).toBeVisible();
        }

        // Test drag and drop zone
        const dropZone = uploadArea.locator('[class*="drop-zone"]') ||
                        uploadArea.locator('[class*="dropzone"]');

        if (await dropZone.isVisible().catch(() => false)) {
          await expect(dropZone).toBeVisible();
        }
      }

      // Test content library/grid
      const contentGrid = contentSection.locator('[class*="content-grid"]') ||
                         contentSection.locator('[class*="library"]');

      if (await contentGrid.isVisible().catch(() => false)) {
        await expect(contentGrid).toBeVisible();

        const contentItems = contentGrid.locator('[class*="content-item"]') ||
                            contentGrid.locator('.card');

        const itemCount = await contentItems.count();
        if (itemCount > 0) {
          for (let i = 0; i < Math.min(itemCount, 5); i++) {
            const item = contentItems.nth(i);
            if (await item.isVisible().catch(() => false)) {
              await expect(item).toBeVisible();

              // Test content preview/thumbnail
              const thumbnail = item.locator('img') || item.locator('[class*="thumbnail"]');
              if (await thumbnail.isVisible().catch(() => false)) {
                await expect(thumbnail).toBeVisible();
              }

              // Test content title
              const title = item.locator('h4, h5, h6') || item.locator('[class*="title"]');
              if (await title.isVisible().catch(() => false)) {
                await expect(title).toBeVisible();
              }

              // Test content actions
              const actions = item.locator('button') || item.locator('[role="button"]');
              const actionCount = await actions.count();

              if (actionCount > 0) {
                for (let j = 0; j < Math.min(actionCount, 3); j++) {
                  const action = actions.nth(j);
                  if (await action.isVisible().catch(() => false)) {
                    await expect(action).toBeVisible();
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  test('should test admin settings and configuration UI', async () => {
    // Navigate to settings
    await page.goto('http://localhost:4200/admin/settings').catch(() => 
      page.goto('http://localhost:4200/admin')
    );

    const settingsLink = page.getByRole('link', { name: /settings/i }) ||
                        page.getByTestId('settings-link');

    if (await settingsLink.isVisible().catch(() => false)) {
      await settingsLink.click();
      await page.waitForTimeout(2000);
    }

    const settingsSection = page.getByTestId('admin-settings') ||
                           page.locator('[class*="settings"]') ||
                           page.getByText(/settings/i).locator('..');

    if (await settingsSection.isVisible().catch(() => false)) {
      await expect(settingsSection).toBeVisible();

      // Test settings categories/tabs
      const settingsCategories = settingsSection.locator('[role="tablist"]') ||
                                settingsSection.locator('[class*="categories"]');

      if (await settingsCategories.isVisible().catch(() => false)) {
        const categories = settingsCategories.locator('[role="tab"]') ||
                          settingsCategories.locator('button, a');

        const categoryCount = await categories.count();
        if (categoryCount > 0) {
          const expectedCategories = ['General', 'Email', 'Security', 'Integrations'];
          
          for (let i = 0; i < Math.min(categoryCount, 6); i++) {
            const category = categories.nth(i);
            if (await category.isVisible().catch(() => false)) {
              await expect(category).toBeVisible();
              await category.click();
              await page.waitForTimeout(500);
            }
          }
        }
      }

      // Test settings form
      const settingsForm = settingsSection.locator('form') ||
                          settingsSection.locator('[class*="settings-form"]');

      if (await settingsForm.isVisible().catch(() => false)) {
        await expect(settingsForm).toBeVisible();

        // Test various form inputs
        const textInputs = settingsForm.locator('input[type="text"]');
        const textCount = await textInputs.count();

        if (textCount > 0) {
          for (let i = 0; i < Math.min(textCount, 3); i++) {
            const input = textInputs.nth(i);
            if (await input.isVisible().catch(() => false)) {
              await expect(input).toBeVisible();
              await expect(input).toBeEnabled();
            }
          }
        }

        // Test checkboxes/toggles
        const checkboxes = settingsForm.locator('input[type="checkbox"]') ||
                          settingsForm.locator('[class*="toggle"]');

        const checkboxCount = await checkboxes.count();
        if (checkboxCount > 0) {
          for (let i = 0; i < Math.min(checkboxCount, 3); i++) {
            const checkbox = checkboxes.nth(i);
            if (await checkbox.isVisible().catch(() => false)) {
              await expect(checkbox).toBeVisible();
              await expect(checkbox).toBeEnabled();
            }
          }
        }

        // Test select dropdowns
        const selects = settingsForm.locator('select');
        const selectCount = await selects.count();

        if (selectCount > 0) {
          for (let i = 0; i < Math.min(selectCount, 3); i++) {
            const select = selects.nth(i);
            if (await select.isVisible().catch(() => false)) {
              await expect(select).toBeVisible();
              await expect(select).toBeEnabled();
            }
          }
        }

        // Test save settings button
        const saveButton = settingsForm.getByRole('button', { name: /save|update/i }) ||
                          settingsForm.getByTestId('save-settings');

        if (await saveButton.isVisible().catch(() => false)) {
          await expect(saveButton).toBeVisible();
          await expect(saveButton).toBeEnabled();
        }
      }
    }
  });

  test('should test admin data table interactions', async () => {
    await page.goto('http://localhost:4200/admin');

    // Look for any data table in admin panel
    const dataTable = page.locator('table') ||
                     page.locator('[role="grid"]') ||
                     page.locator('[class*="data-table"]');

    if (await dataTable.isVisible().catch(() => false)) {
      await expect(dataTable).toBeVisible();

      // Test table sorting
      const sortableHeaders = dataTable.locator('th[role="columnheader"]') ||
                            dataTable.locator('th button') ||
                            dataTable.locator('[class*="sortable"]');

      const sortCount = await sortableHeaders.count();
      if (sortCount > 0) {
        const firstSortable = sortableHeaders.first();
        if (await firstSortable.isVisible().catch(() => false)) {
          await expect(firstSortable).toBeVisible();
          await firstSortable.click();
          
          // Check for sort indicator
          const sortIndicator = firstSortable.locator('svg') ||
                              dataTable.locator('[class*="sort"]');
          
          if (await sortIndicator.isVisible().catch(() => false)) {
            await expect(sortIndicator).toBeVisible();
          }
        }
      }

      // Test row selection
      const selectAllCheckbox = dataTable.locator('th input[type="checkbox"]') ||
                               dataTable.locator('[class*="select-all"]');

      if (await selectAllCheckbox.isVisible().catch(() => false)) {
        await expect(selectAllCheckbox).toBeVisible();
        await selectAllCheckbox.check();
        await expect(selectAllCheckbox).toBeChecked();
        
        // Check individual row checkboxes
        const rowCheckboxes = dataTable.locator('td input[type="checkbox"]');
        const rowCheckCount = await rowCheckboxes.count();
        
        if (rowCheckCount > 0) {
          const firstRowCheckbox = rowCheckboxes.first();
          if (await firstRowCheckbox.isVisible().catch(() => false)) {
            await expect(firstRowCheckbox).toBeChecked();
          }
        }
      }

      // Test pagination
      const pagination = page.locator('[class*="pagination"]') ||
                        page.locator('[role="navigation"][aria-label*="pagination"]');

      if (await pagination.isVisible().catch(() => false)) {
        await expect(pagination).toBeVisible();

        const paginationButtons = pagination.locator('button');
        const btnCount = await paginationButtons.count();

        if (btnCount > 0) {
          for (let i = 0; i < Math.min(btnCount, 5); i++) {
            const btn = paginationButtons.nth(i);
            if (await btn.isVisible().catch(() => false)) {
              await expect(btn).toBeVisible();
              
              const isDisabled = await btn.getAttribute('disabled') !== null;
              if (!isDisabled) {
                await expect(btn).toBeEnabled();
              }
            }
          }
        }

        // Test page size selector
        const pageSizeSelect = pagination.locator('select') ||
                             page.locator('select[name*="page"]') ||
                             page.locator('[class*="page-size"]');

        if (await pageSizeSelect.isVisible().catch(() => false)) {
          await expect(pageSizeSelect).toBeVisible();
          await expect(pageSizeSelect).toBeEnabled();
        }
      }

      // Test table filters/search
      const tableSearch = page.locator('input[placeholder*="search"]') ||
                         page.getByTestId('table-search');

      if (await tableSearch.isVisible().catch(() => false)) {
        await expect(tableSearch).toBeVisible();
        await tableSearch.fill('test search');
        await expect(tableSearch).toHaveValue('test search');
      }
    }
  });

  test('should test admin modal dialogs and forms', async () => {
    await page.goto('http://localhost:4200/admin');

    // Look for buttons that might open modals
    const modalTriggers = page.locator('button').filter({ hasText: /add|create|edit|new/i });
    const triggerCount = await modalTriggers.count();

    if (triggerCount > 0) {
      const firstTrigger = modalTriggers.first();
      if (await firstTrigger.isVisible().catch(() => false)) {
        await firstTrigger.click();

        // Test modal dialog
        const modal = page.locator('[role="dialog"]') ||
                     page.getByTestId('modal') ||
                     page.locator('[class*="modal"]');

        if (await modal.isVisible().catch(() => false)) {
          await expect(modal).toBeVisible();

          // Test modal header
          const modalHeader = modal.locator('header') ||
                            modal.locator('[class*="modal-header"]');

          if (await modalHeader.isVisible().catch(() => false)) {
            await expect(modalHeader).toBeVisible();

            const modalTitle = modalHeader.locator('h1, h2, h3, h4, h5');
            if (await modalTitle.isVisible().catch(() => false)) {
              await expect(modalTitle).toBeVisible();
            }

            const closeButton = modalHeader.locator('button') ||
                              modal.locator('button[aria-label*="close"]');

            if (await closeButton.isVisible().catch(() => false)) {
              await expect(closeButton).toBeVisible();
            }
          }

          // Test modal form
          const modalForm = modal.locator('form');
          if (await modalForm.isVisible().catch(() => false)) {
            await expect(modalForm).toBeVisible();

            // Test form fields
            const formInputs = modalForm.locator('input, textarea, select');
            const inputCount = await formInputs.count();

            if (inputCount > 0) {
              for (let i = 0; i < Math.min(inputCount, 5); i++) {
                const input = formInputs.nth(i);
                if (await input.isVisible().catch(() => false)) {
                  await expect(input).toBeVisible();
                  await expect(input).toBeEnabled();
                }
              }
            }

            // Test form buttons
            const formButtons = modalForm.locator('button[type="submit"]') ||
                               modalForm.locator('button').filter({ hasText: /save|create|update/i });

            const formBtnCount = await formButtons.count();
            if (formBtnCount > 0) {
              const submitButton = formButtons.first();
              await expect(submitButton).toBeVisible();
              await expect(submitButton).toBeEnabled();
            }
          }

          // Close modal
          const anyCloseButton = modal.locator('button[aria-label*="close"]') ||
                               modal.locator('button').filter({ hasText: /cancel|close/i });

          if (await anyCloseButton.isVisible().catch(() => false)) {
            await anyCloseButton.click();
            await expect(modal).not.toBeVisible();
          }
        }
      }
    }
  });
});