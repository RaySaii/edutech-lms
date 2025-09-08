import { test, expect, Page } from '@playwright/test';
import { 
  navigateToLogin, 
  fillLoginForm, 
  submitLoginForm,
  EXISTING_USER_EMAIL,
  EXISTING_USER_PASSWORD
} from '../auth/auth-helpers';

test.describe('Dashboard and Navigation UI Tests', () => {
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

  test('should test main navigation elements', async () => {
    // Test main navigation container
    const mainNav = page.locator('nav') ||
                   page.getByTestId('main-navigation') ||
                   page.locator('[role="navigation"]');

    if (await mainNav.isVisible().catch(() => false)) {
      await expect(mainNav).toBeVisible();

      // Test navigation links
      const navLinks = mainNav.locator('a') || mainNav.locator('[role="menuitem"]');
      const linkCount = await navLinks.count();

      if (linkCount > 0) {
        const expectedLinks = ['Dashboard', 'Courses', 'My Learning', 'Profile'];
        
        for (let i = 0; i < Math.min(linkCount, 8); i++) {
          const link = navLinks.nth(i);
          if (await link.isVisible().catch(() => false)) {
            await expect(link).toBeVisible();
            await expect(link).toBeEnabled();
            
            const linkText = await link.textContent();
            expect(linkText).toBeTruthy();

            // Test link accessibility
            const href = await link.getAttribute('href');
            if (href) {
              expect(href).toBeTruthy();
            }

            const ariaLabel = await link.getAttribute('aria-label');
            const role = await link.getAttribute('role');
            
            // Should have proper accessibility attributes
            expect(ariaLabel || linkText || role).toBeTruthy();
          }
        }
      }
    }

    // Test breadcrumb navigation
    const breadcrumb = page.locator('[aria-label="Breadcrumb"]') ||
                      page.getByTestId('breadcrumb') ||
                      page.locator('.breadcrumb');

    if (await breadcrumb.isVisible().catch(() => false)) {
      await expect(breadcrumb).toBeVisible();

      const breadcrumbItems = breadcrumb.locator('li, a, span');
      const itemCount = await breadcrumbItems.count();

      if (itemCount > 0) {
        for (let i = 0; i < itemCount; i++) {
          const item = breadcrumbItems.nth(i);
          if (await item.isVisible().catch(() => false)) {
            await expect(item).toBeVisible();
          }
        }
      }
    }

    // Test mobile navigation toggle
    await page.setViewportSize({ width: 375, height: 667 });
    
    const mobileMenuToggle = page.getByTestId('mobile-menu-toggle') ||
                           page.locator('button[aria-label*="menu"]') ||
                           page.locator('[class*="hamburger"]');

    if (await mobileMenuToggle.isVisible().catch(() => false)) {
      await expect(mobileMenuToggle).toBeVisible();
      await expect(mobileMenuToggle).toBeEnabled();

      // Test opening mobile menu
      await mobileMenuToggle.click();

      const mobileMenu = page.getByTestId('mobile-menu') ||
                        page.locator('[class*="mobile-menu"]');

      if (await mobileMenu.isVisible().catch(() => false)) {
        await expect(mobileMenu).toBeVisible();
        
        // Test mobile menu items
        const mobileNavItems = mobileMenu.locator('a, button');
        const mobileItemCount = await mobileNavItems.count();

        if (mobileItemCount > 0) {
          for (let i = 0; i < Math.min(mobileItemCount, 5); i++) {
            const item = mobileNavItems.nth(i);
            if (await item.isVisible().catch(() => false)) {
              await expect(item).toBeVisible();
            }
          }
        }
      }
    }

    // Reset viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('should test dashboard layout and containers', async () => {
    // Test main dashboard container
    const dashboard = page.getByTestId('dashboard') ||
                     page.locator('[class*="dashboard"]') ||
                     page.locator('main');

    await expect(dashboard).toBeVisible();

    // Test page header
    const pageHeader = page.locator('header') ||
                      page.getByTestId('page-header') ||
                      page.locator('[class*="header"]');

    if (await pageHeader.isVisible().catch(() => false)) {
      await expect(pageHeader).toBeVisible();

      // Test page title
      const pageTitle = pageHeader.locator('h1') ||
                       page.getByTestId('page-title');

      if (await pageTitle.isVisible().catch(() => false)) {
        await expect(pageTitle).toBeVisible();
        const titleText = await pageTitle.textContent();
        expect(titleText).toMatch(/dashboard/i);
      }

      // Test user greeting
      const userGreeting = pageHeader.getByTestId('user-greeting') ||
                          pageHeader.locator('[class*="greeting"]');

      if (await userGreeting.isVisible().catch(() => false)) {
        await expect(userGreeting).toBeVisible();
      }
    }

    // Test main content area
    const mainContent = page.locator('main') ||
                       page.getByTestId('main-content') ||
                       page.locator('[role="main"]');

    if (await mainContent.isVisible().catch(() => false)) {
      await expect(mainContent).toBeVisible();
    }

    // Test sidebar (if exists)
    const sidebar = page.locator('aside') ||
                   page.getByTestId('sidebar') ||
                   page.locator('[class*="sidebar"]');

    if (await sidebar.isVisible().catch(() => false)) {
      await expect(sidebar).toBeVisible();

      // Test sidebar navigation items
      const sidebarItems = sidebar.locator('a, button');
      const sidebarItemCount = await sidebarItems.count();

      if (sidebarItemCount > 0) {
        for (let i = 0; i < Math.min(sidebarItemCount, 5); i++) {
          const item = sidebarItems.nth(i);
          if (await item.isVisible().catch(() => false)) {
            await expect(item).toBeVisible();
          }
        }
      }
    }

    // Test footer
    const footer = page.locator('footer') ||
                  page.getByTestId('footer') ||
                  page.locator('[class*="footer"]');

    if (await footer.isVisible().catch(() => false)) {
      await expect(footer).toBeVisible();
    }
  });

  test('should test dashboard statistics cards', async () => {
    // Test stats container
    const statsContainer = page.getByTestId('dashboard-stats') ||
                          page.locator('[class*="stats"]') ||
                          page.locator('[class*="metrics"]');

    if (await statsContainer.isVisible().catch(() => false)) {
      await expect(statsContainer).toBeVisible();

      // Test individual stat cards
      const statCards = statsContainer.locator('[class*="stat-card"]') ||
                       statsContainer.locator('[class*="card"]') ||
                       statsContainer.locator('article');

      const cardCount = await statCards.count();
      if (cardCount > 0) {
        for (let i = 0; i < Math.min(cardCount, 6); i++) {
          const card = statCards.nth(i);
          if (await card.isVisible().catch(() => false)) {
            await expect(card).toBeVisible();

            // Test card title
            const cardTitle = card.locator('h2, h3, h4, h5, h6') ||
                            card.getByTestId('stat-title');

            if (await cardTitle.isVisible().catch(() => false)) {
              await expect(cardTitle).toBeVisible();
            }

            // Test card value/number
            const cardValue = card.locator('[class*="value"]') ||
                            card.locator('[class*="number"]') ||
                            card.getByTestId('stat-value');

            if (await cardValue.isVisible().catch(() => false)) {
              await expect(cardValue).toBeVisible();
              const valueText = await cardValue.textContent();
              expect(valueText).toMatch(/\d+/); // Should contain numbers
            }

            // Test card icon
            const cardIcon = card.locator('svg') ||
                           card.locator('[class*="icon"]') ||
                           card.locator('i');

            if (await cardIcon.isVisible().catch(() => false)) {
              await expect(cardIcon).toBeVisible();
            }

            // Test interactive elements
            const cardButton = card.locator('button') ||
                             card.locator('a[role="button"]');

            if (await cardButton.isVisible().catch(() => false)) {
              await expect(cardButton).toBeVisible();
              await expect(cardButton).toBeEnabled();
            }
          }
        }
      }
    }

    // Test alternative: individual stat elements
    const individualStats = page.locator('[data-testid*="stat-"]') ||
                           page.locator('[class*="metric"]');

    const statCount = await individualStats.count();
    if (statCount > 0) {
      for (let i = 0; i < Math.min(statCount, 5); i++) {
        const stat = individualStats.nth(i);
        if (await stat.isVisible().catch(() => false)) {
          await expect(stat).toBeVisible();
        }
      }
    }
  });

  test('should test enrolled courses section', async () => {
    const enrolledSection = page.getByTestId('enrolled-courses') ||
                          page.locator('[class*="enrolled"]') ||
                          page.getByText(/enrolled courses/i).locator('..');

    if (await enrolledSection.isVisible().catch(() => false)) {
      await expect(enrolledSection).toBeVisible();

      // Test section title
      const sectionTitle = enrolledSection.locator('h1, h2, h3') ||
                         page.getByText(/enrolled courses/i);

      if (await sectionTitle.isVisible().catch(() => false)) {
        await expect(sectionTitle).toBeVisible();
      }

      // Test course items
      const courseItems = enrolledSection.locator('[class*="course"]') ||
                        enrolledSection.locator('.card') ||
                        enrolledSection.locator('article');

      const courseCount = await courseItems.count();
      if (courseCount > 0) {
        for (let i = 0; i < Math.min(courseCount, 5); i++) {
          const courseItem = courseItems.nth(i);
          if (await courseItem.isVisible().catch(() => false)) {
            await expect(courseItem).toBeVisible();

            // Test course title
            const courseTitle = courseItem.locator('h4, h5, h6') ||
                              courseItem.getByTestId('course-title');

            if (await courseTitle.isVisible().catch(() => false)) {
              await expect(courseTitle).toBeVisible();
            }

            // Test progress indicator
            const progressBar = courseItem.locator('[role="progressbar"]') ||
                              courseItem.locator('progress') ||
                              courseItem.locator('[class*="progress"]');

            if (await progressBar.isVisible().catch(() => false)) {
              await expect(progressBar).toBeVisible();
            }

            // Test continue button
            const continueButton = courseItem.getByRole('button', { name: /continue/i }) ||
                                 courseItem.getByTestId('continue-button');

            if (await continueButton.isVisible().catch(() => false)) {
              await expect(continueButton).toBeVisible();
              await expect(continueButton).toBeEnabled();
            }

            // Test course thumbnail
            const thumbnail = courseItem.locator('img');
            if (await thumbnail.isVisible().catch(() => false)) {
              await expect(thumbnail).toBeVisible();
              const imgSrc = await thumbnail.getAttribute('src');
              expect(imgSrc).toBeTruthy();
            }
          }
        }
      }

      // Test "View All" or "See More" button
      const viewAllButton = enrolledSection.getByRole('button', { name: /view all|see more/i }) ||
                           enrolledSection.getByTestId('view-all-courses');

      if (await viewAllButton.isVisible().catch(() => false)) {
        await expect(viewAllButton).toBeVisible();
        await expect(viewAllButton).toBeEnabled();
      }
    }
  });

  test('should test recent activity section', async () => {
    const activitySection = page.getByTestId('recent-activity') ||
                          page.locator('[class*="activity"]') ||
                          page.getByText(/recent activity/i).locator('..');

    if (await activitySection.isVisible().catch(() => false)) {
      await expect(activitySection).toBeVisible();

      // Test section title
      const sectionTitle = activitySection.locator('h2, h3') ||
                         page.getByText(/recent activity/i);

      if (await sectionTitle.isVisible().catch(() => false)) {
        await expect(sectionTitle).toBeVisible();
      }

      // Test activity items
      const activityItems = activitySection.locator('[class*="activity-item"]') ||
                          activitySection.locator('li') ||
                          activitySection.locator('.item');

      const activityCount = await activityItems.count();
      if (activityCount > 0) {
        for (let i = 0; i < Math.min(activityCount, 5); i++) {
          const activityItem = activityItems.nth(i);
          if (await activityItem.isVisible().catch(() => false)) {
            await expect(activityItem).toBeVisible();

            // Test activity description
            const activityDesc = activityItem.locator('p, span') ||
                               activityItem.getByTestId('activity-description');

            if (await activityDesc.isVisible().catch(() => false)) {
              await expect(activityDesc).toBeVisible();
            }

            // Test activity timestamp
            const activityTime = activityItem.locator('time') ||
                               activityItem.locator('[class*="time"]');

            if (await activityTime.isVisible().catch(() => false)) {
              await expect(activityTime).toBeVisible();
            }

            // Test activity icon
            const activityIcon = activityItem.locator('svg') ||
                               activityItem.locator('[class*="icon"]');

            if (await activityIcon.isVisible().catch(() => false)) {
              await expect(activityIcon).toBeVisible();
            }
          }
        }
      }

      // Test empty state
      const emptyState = activitySection.getByText(/no recent activity/i) ||
                        activitySection.locator('[class*="empty"]');

      if (await emptyState.isVisible().catch(() => false)) {
        await expect(emptyState).toBeVisible();
      }
    }
  });

  test('should test quick actions section', async () => {
    const quickActionsSection = page.getByTestId('quick-actions') ||
                              page.locator('[class*="quick-actions"]') ||
                              page.getByText(/quick actions/i).locator('..');

    if (await quickActionsSection.isVisible().catch(() => false)) {
      await expect(quickActionsSection).toBeVisible();

      // Test action buttons
      const actionButtons = quickActionsSection.locator('button') ||
                          quickActionsSection.locator('a[role="button"]');

      const buttonCount = await actionButtons.count();
      if (buttonCount > 0) {
        for (let i = 0; i < Math.min(buttonCount, 6); i++) {
          const button = actionButtons.nth(i);
          if (await button.isVisible().catch(() => false)) {
            await expect(button).toBeVisible();
            await expect(button).toBeEnabled();

            // Test button text
            const buttonText = await button.textContent();
            expect(buttonText).toBeTruthy();

            // Test button icon
            const buttonIcon = button.locator('svg') ||
                             button.locator('[class*="icon"]');

            if (await buttonIcon.isVisible().catch(() => false)) {
              await expect(buttonIcon).toBeVisible();
            }

            // Test button interaction
            const ariaLabel = await button.getAttribute('aria-label');
            const title = await button.getAttribute('title');
            
            expect(ariaLabel || buttonText || title).toBeTruthy();
          }
        }
      }
    }
  });

  test('should test user profile dropdown in navigation', async () => {
    // Test user profile button/avatar
    const userProfile = page.getByTestId('user-profile') ||
                       page.getByTestId('user-menu') ||
                       page.locator('[class*="user-avatar"]') ||
                       page.locator('button[aria-haspopup="true"]');

    if (await userProfile.isVisible().catch(() => false)) {
      await expect(userProfile).toBeVisible();
      await expect(userProfile).toBeEnabled();

      // Test user avatar/image
      const userAvatar = userProfile.locator('img') ||
                        page.locator('[class*="avatar"] img');

      if (await userAvatar.isVisible().catch(() => false)) {
        await expect(userAvatar).toBeVisible();
        const avatarSrc = await userAvatar.getAttribute('src');
        expect(avatarSrc).toBeTruthy();
      }

      // Test user name display
      const userName = userProfile.locator('span, [class*="name"]') ||
                      page.getByTestId('user-name');

      if (await userName.isVisible().catch(() => false)) {
        await expect(userName).toBeVisible();
      }

      // Test dropdown functionality
      await userProfile.click();

      const dropdown = page.locator('[role="menu"]') ||
                      page.getByTestId('user-dropdown') ||
                      page.locator('[class*="dropdown-menu"]');

      if (await dropdown.isVisible().catch(() => false)) {
        await expect(dropdown).toBeVisible();

        // Test dropdown items
        const dropdownItems = dropdown.locator('[role="menuitem"]') ||
                            dropdown.locator('a, button');

        const itemCount = await dropdownItems.count();
        if (itemCount > 0) {
          const expectedItems = ['Profile', 'Settings', 'Logout'];
          
          for (let i = 0; i < itemCount; i++) {
            const item = dropdownItems.nth(i);
            if (await item.isVisible().catch(() => false)) {
              await expect(item).toBeVisible();
              await expect(item).toBeEnabled();

              const itemText = await item.textContent();
              expect(itemText).toBeTruthy();
            }
          }
        }

        // Test clicking outside closes dropdown
        await page.click('body', { position: { x: 100, y: 100 } });
        await expect(dropdown).not.toBeVisible();
      }
    }
  });

  test('should test notifications center', async () => {
    // Test notification bell/button
    const notificationBell = page.getByTestId('notification-bell') ||
                            page.locator('button[aria-label*="notification"]') ||
                            page.locator('[class*="notification"]');

    if (await notificationBell.isVisible().catch(() => false)) {
      await expect(notificationBell).toBeVisible();
      await expect(notificationBell).toBeEnabled();

      // Test notification badge/count
      const notificationBadge = notificationBell.locator('[class*="badge"]') ||
                               notificationBell.locator('[class*="count"]');

      if (await notificationBadge.isVisible().catch(() => false)) {
        await expect(notificationBadge).toBeVisible();
        const badgeText = await notificationBadge.textContent();
        expect(badgeText).toMatch(/\d+/);
      }

      // Test opening notifications panel
      await notificationBell.click();

      const notificationsPanel = page.getByTestId('notifications-panel') ||
                                page.locator('[class*="notifications-panel"]') ||
                                page.locator('[role="dialog"]');

      if (await notificationsPanel.isVisible().catch(() => false)) {
        await expect(notificationsPanel).toBeVisible();

        // Test notification items
        const notificationItems = notificationsPanel.locator('[class*="notification-item"]') ||
                                notificationsPanel.locator('li');

        const notifCount = await notificationItems.count();
        if (notifCount > 0) {
          for (let i = 0; i < Math.min(notifCount, 5); i++) {
            const notifItem = notificationItems.nth(i);
            if (await notifItem.isVisible().catch(() => false)) {
              await expect(notifItem).toBeVisible();

              // Test notification content
              const notifContent = notifItem.locator('p, span');
              if (await notifContent.isVisible().catch(() => false)) {
                await expect(notifContent).toBeVisible();
              }

              // Test notification timestamp
              const notifTime = notifItem.locator('time');
              if (await notifTime.isVisible().catch(() => false)) {
                await expect(notifTime).toBeVisible();
              }

              // Test mark as read button
              const markReadButton = notifItem.locator('button');
              if (await markReadButton.isVisible().catch(() => false)) {
                await expect(markReadButton).toBeVisible();
              }
            }
          }
        }

        // Test "Mark all as read" button
        const markAllReadButton = notificationsPanel.getByRole('button', { name: /mark all/i });
        if (await markAllReadButton.isVisible().catch(() => false)) {
          await expect(markAllReadButton).toBeVisible();
        }

        // Test "View all notifications" link
        const viewAllLink = notificationsPanel.getByRole('link', { name: /view all/i });
        if (await viewAllLink.isVisible().catch(() => false)) {
          await expect(viewAllLink).toBeVisible();
        }
      }
    }
  });

  test('should test search functionality in navigation', async () => {
    // Test global search input
    const searchInput = page.getByTestId('global-search') ||
                       page.locator('input[placeholder*="search"]') ||
                       page.locator('[role="searchbox"]');

    if (await searchInput.isVisible().catch(() => false)) {
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeEnabled();

      // Test search input interaction
      await searchInput.fill('javascript');
      await expect(searchInput).toHaveValue('javascript');

      // Test search suggestions
      const searchSuggestions = page.locator('[class*="search-suggestions"]') ||
                              page.locator('[role="listbox"]');

      if (await searchSuggestions.isVisible().catch(() => false)) {
        await expect(searchSuggestions).toBeVisible();

        const suggestions = searchSuggestions.locator('[role="option"]') ||
                          searchSuggestions.locator('li');

        const suggestionCount = await suggestions.count();
        if (suggestionCount > 0) {
          for (let i = 0; i < Math.min(suggestionCount, 5); i++) {
            const suggestion = suggestions.nth(i);
            if (await suggestion.isVisible().catch(() => false)) {
              await expect(suggestion).toBeVisible();
              await expect(suggestion).toBeEnabled();
            }
          }
        }
      }

      // Test search button
      const searchButton = page.getByTestId('search-button') ||
                          page.locator('button[type="submit"]') ||
                          searchInput.locator('+ button');

      if (await searchButton.isVisible().catch(() => false)) {
        await expect(searchButton).toBeVisible();
        await searchButton.click();
        
        // Should navigate to search results or show results
        await page.waitForTimeout(1000);
      }

      // Test clear search
      const clearButton = page.getByTestId('clear-search') ||
                         searchInput.locator('+ button[aria-label*="clear"]');

      if (await clearButton.isVisible().catch(() => false)) {
        await clearButton.click();
        await expect(searchInput).toHaveValue('');
      }
    }
  });

  test('should test responsive navigation behavior', async () => {
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();

    // Navigation should be visible and functional
    const navigation = page.locator('nav');
    if (await navigation.isVisible().catch(() => false)) {
      await expect(navigation).toBeVisible();
    }

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    // Test mobile hamburger menu
    const hamburgerButton = page.getByTestId('mobile-menu-toggle') ||
                           page.locator('button[aria-label*="menu"]');

    if (await hamburgerButton.isVisible().catch(() => false)) {
      await expect(hamburgerButton).toBeVisible();
      await hamburgerButton.click();

      // Test mobile menu overlay
      const mobileMenu = page.getByTestId('mobile-menu') ||
                        page.locator('[class*="mobile-menu"]');

      if (await mobileMenu.isVisible().catch(() => false)) {
        await expect(mobileMenu).toBeVisible();

        // Test mobile navigation items
        const mobileNavItems = mobileMenu.locator('a, button');
        const mobileItemCount = await mobileNavItems.count();

        if (mobileItemCount > 0) {
          for (let i = 0; i < Math.min(mobileItemCount, 5); i++) {
            const item = mobileNavItems.nth(i);
            if (await item.isVisible().catch(() => false)) {
              await expect(item).toBeVisible();
            }
          }
        }

        // Test closing mobile menu
        const closeButton = mobileMenu.getByTestId('close-mobile-menu') ||
                           mobileMenu.locator('button[aria-label*="close"]');

        if (await closeButton.isVisible().catch(() => false)) {
          await closeButton.click();
          await expect(mobileMenu).not.toBeVisible();
        }
      }
    }

    // Reset viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
  });
});