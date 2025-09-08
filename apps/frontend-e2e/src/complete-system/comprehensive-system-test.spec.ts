import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = '309406931@qq.com';
const TEST_USER_PASSWORD = 'Wl1991714';

test.describe('Comprehensive System Integration Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Navigate to application
    await page.goto(BASE_URL);
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('1. Authentication & Authorization Flow', () => {
    test('should complete full authentication workflow', async () => {
      // Navigate to login page
      await page.click('text=Login');
      await page.waitForURL('**/login');

      // Verify login form elements
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Login with test credentials
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard
      await page.waitForURL('**/dashboard');
      
      // Verify successful login
      await expect(page.locator('text=Welcome back')).toBeVisible();
      await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
    });

    test('should display error for invalid credentials', async () => {
      await page.goto(`${BASE_URL}/login`);
      
      await page.fill('input[name="email"]', 'invalid@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Check for error message
      await expect(page.locator('text=Invalid credentials')).toBeVisible();
    });

    test('should handle MFA setup flow', async () => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/dashboard');

      // Navigate to security settings
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Security Settings');

      // Setup MFA
      await page.click('text=Enable Two-Factor Authentication');
      
      // Verify QR code is displayed
      await expect(page.locator('[data-testid="mfa-qr-code"]')).toBeVisible();
      await expect(page.locator('input[name="verificationCode"]')).toBeVisible();
    });
  });

  test.describe('2. Course Management & Learning Flow', () => {
    test.beforeEach(async () => {
      // Login before each test
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    });

    test('should display available courses', async () => {
      await page.click('text=Courses');
      await page.waitForURL('**/courses');

      // Verify course catalog elements
      await expect(page.locator('[data-testid="course-catalog"]')).toBeVisible();
      await expect(page.locator('[data-testid="course-card"]').first()).toBeVisible();
      
      // Check course details
      const firstCourse = page.locator('[data-testid="course-card"]').first();
      await expect(firstCourse.locator('.course-title')).toBeVisible();
      await expect(firstCourse.locator('.course-instructor')).toBeVisible();
      await expect(firstCourse.locator('.course-rating')).toBeVisible();
    });

    test('should handle course enrollment process', async () => {
      await page.goto(`${BASE_URL}/courses`);
      
      // Click on first course
      await page.click('[data-testid="course-card"]');
      await page.waitForURL('**/courses/**');

      // Verify course detail page
      await expect(page.locator('.course-title')).toBeVisible();
      await expect(page.locator('.course-description')).toBeVisible();
      await expect(page.locator('.course-curriculum')).toBeVisible();

      // Enroll in course
      const enrollButton = page.locator('button:has-text("Enroll Now")');
      if (await enrollButton.isVisible()) {
        await enrollButton.click();
        
        // Wait for enrollment confirmation
        await expect(page.locator('text=Successfully enrolled')).toBeVisible();
        await expect(page.locator('button:has-text("Continue Learning")')).toBeVisible();
      }
    });

    test('should track learning progress', async () => {
      await page.goto(`${BASE_URL}/my-learning`);

      // Verify enrolled courses are displayed
      await expect(page.locator('[data-testid="enrolled-course"]').first()).toBeVisible();

      // Click on a course to start learning
      await page.click('[data-testid="enrolled-course"]');
      
      // Verify learning interface
      await expect(page.locator('[data-testid="lesson-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
      
      // Mark lesson as complete
      await page.click('button:has-text("Mark Complete")');
      
      // Verify progress update
      await expect(page.locator('text=Lesson completed')).toBeVisible();
    });

    test('should create course as instructor', async () => {
      // Navigate to course creation
      await page.goto(`${BASE_URL}/courses/create`);

      // Fill course creation form
      await page.fill('input[name="title"]', 'Test Course');
      await page.fill('textarea[name="description"]', 'This is a test course for automation');
      await page.selectOption('select[name="category"]', 'programming');
      await page.selectOption('select[name="difficulty"]', 'intermediate');
      await page.fill('input[name="price"]', '99.99');

      // Submit form
      await page.click('button[type="submit"]');

      // Verify course creation success
      await expect(page.locator('text=Course created successfully')).toBeVisible();
      await page.waitForURL('**/courses/**');
    });
  });

  test.describe('3. Interactive Features & User Experience', () => {
    test.beforeEach(async () => {
      // Login before each test
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    });

    test('should display and interact with dashboard widgets', async () => {
      // Verify dashboard elements
      await expect(page.locator('[data-testid="learning-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="enrolled-courses"]')).toBeVisible();
      await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible();

      // Test widget interactions
      await page.click('[data-testid="view-all-courses"]');
      await page.waitForURL('**/courses');
      await page.goBack();

      // Test quick actions
      await page.click('[data-testid="quick-search"]');
      await expect(page.locator('input[placeholder*="Search"]')).toBeFocused();
    });

    test('should handle notification center', async () => {
      // Open notification center
      await page.click('[data-testid="notification-bell"]');
      
      // Verify notification dropdown
      await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
      
      // Check for notifications
      const notifications = page.locator('[data-testid="notification-item"]');
      const notificationCount = await notifications.count();
      
      if (notificationCount > 0) {
        // Click on first notification
        await notifications.first().click();
        
        // Verify notification is marked as read
        await expect(notifications.first().locator('.unread-indicator')).not.toBeVisible();
      }
    });

    test('should test video player functionality', async () => {
      // Navigate to a video lesson
      await page.goto(`${BASE_URL}/courses`);
      await page.click('[data-testid="course-card"]');
      
      // Find and click on video lesson
      const videoLesson = page.locator('[data-testid="lesson-item"]:has([data-testid="video-icon"])');
      if (await videoLesson.first().isVisible()) {
        await videoLesson.first().click();
        
        // Verify video player
        await expect(page.locator('[data-testid="video-player"]')).toBeVisible();
        
        // Test video controls
        await page.click('[data-testid="play-button"]');
        await expect(page.locator('[data-testid="pause-button"]')).toBeVisible();
        
        // Test fullscreen toggle
        await page.click('[data-testid="fullscreen-button"]');
        await expect(page.locator('video')).toHaveAttribute('data-fullscreen', 'true');
      }
    });
  });

  test.describe('4. Advanced Search Functionality', () => {
    test.beforeEach(async () => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    });

    test('should perform basic search operations', async () => {
      // Navigate to search page
      await page.goto(`${BASE_URL}/search`);

      // Perform search
      await page.fill('input[placeholder*="Search"]', 'javascript');
      await page.click('button:has-text("Search")');

      // Verify search results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-result-item"]').first()).toBeVisible();
      
      // Check result elements
      const firstResult = page.locator('[data-testid="search-result-item"]').first();
      await expect(firstResult.locator('.result-title')).toBeVisible();
      await expect(firstResult.locator('.result-description')).toBeVisible();
    });

    test('should use advanced search filters', async () => {
      await page.goto(`${BASE_URL}/search`);

      // Open filters
      await page.click('button:has-text("Filters")');
      
      // Apply category filter
      await page.check('input[name="category"][value="programming"]');
      
      // Apply difficulty filter
      await page.check('input[name="difficulty"][value="intermediate"]');
      
      // Apply rating filter
      await page.fill('input[name="minRating"]', '4');

      // Perform filtered search
      await page.fill('input[placeholder*="Search"]', 'web development');
      await page.click('button:has-text("Search")');

      // Verify filtered results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      await expect(page.locator('text=programming').first()).toBeVisible();
    });

    test('should test autocomplete functionality', async () => {
      await page.goto(`${BASE_URL}/search`);

      // Type in search box
      await page.fill('input[placeholder*="Search"]', 'java');
      
      // Wait for autocomplete suggestions
      await expect(page.locator('[data-testid="autocomplete-suggestions"]')).toBeVisible();
      
      // Click on suggestion
      await page.click('[data-testid="suggestion-item"]');
      
      // Verify search is performed
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    });
  });

  test.describe('5. Gamification & Achievement System', () => {
    test.beforeEach(async () => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    });

    test('should display gamification dashboard', async () => {
      await page.goto(`${BASE_URL}/gamification`);

      // Verify gamification elements
      await expect(page.locator('[data-testid="user-level"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-points"]')).toBeVisible();
      await expect(page.locator('[data-testid="achievements-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-streak"]')).toBeVisible();

      // Test tab navigation
      await page.click('text=Achievements');
      await expect(page.locator('[data-testid="achievements-grid"]')).toBeVisible();

      await page.click('text=Badges');
      await expect(page.locator('[data-testid="badges-collection"]')).toBeVisible();

      await page.click('text=Leaderboards');
      await expect(page.locator('[data-testid="leaderboard-table"]')).toBeVisible();
    });

    test('should handle quest interactions', async () => {
      await page.goto(`${BASE_URL}/gamification`);
      await page.click('text=Quests');

      // Check available quests
      await expect(page.locator('[data-testid="available-quests"]')).toBeVisible();

      // Start a quest
      const questItem = page.locator('[data-testid="quest-item"]').first();
      if (await questItem.isVisible()) {
        await questItem.click('button:has-text("Start Quest")');
        
        // Verify quest started
        await expect(page.locator('text=Quest started successfully')).toBeVisible();
      }
    });

    test('should show progress indicators', async () => {
      await page.goto(`${BASE_URL}/gamification`);

      // Verify progress elements
      await expect(page.locator('[data-testid="level-progress"]')).toBeVisible();
      
      // Check progress bar values
      const progressBar = page.locator('[data-testid="level-progress"] [role="progressbar"]');
      const progressValue = await progressBar.getAttribute('aria-valuenow');
      expect(Number(progressValue)).toBeGreaterThanOrEqual(0);
      expect(Number(progressValue)).toBeLessThanOrEqual(100);
    });
  });

  test.describe('6. AI Recommendations System', () => {
    test.beforeEach(async () => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    });

    test('should display personalized recommendations', async () => {
      await page.goto(`${BASE_URL}/recommendations`);

      // Verify recommendations page
      await expect(page.locator('[data-testid="recommendations-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="personalized-courses"]')).toBeVisible();

      // Check recommendation cards
      const recommendationCards = page.locator('[data-testid="recommendation-card"]');
      const cardCount = await recommendationCards.count();
      
      if (cardCount > 0) {
        // Verify recommendation elements
        const firstCard = recommendationCards.first();
        await expect(firstCard.locator('.course-title')).toBeVisible();
        await expect(firstCard.locator('.recommendation-reason')).toBeVisible();
        await expect(firstCard.locator('.confidence-score')).toBeVisible();
      }
    });

    test('should handle recommendation interactions', async () => {
      await page.goto(`${BASE_URL}/recommendations`);

      const recommendationCard = page.locator('[data-testid="recommendation-card"]').first();
      
      if (await recommendationCard.isVisible()) {
        // Click on recommendation
        await recommendationCard.click();
        
        // Should navigate to course page
        await page.waitForURL('**/courses/**');
        await expect(page.locator('.course-detail')).toBeVisible();
        
        // Go back and test feedback
        await page.goBack();
        
        // Provide feedback
        await recommendationCard.hover();
        await page.click('[data-testid="recommendation-feedback"] button:has-text("👍")');
        
        // Verify feedback recorded
        await expect(page.locator('text=Feedback recorded')).toBeVisible();
      }
    });

    test('should update learning preferences', async () => {
      await page.goto(`${BASE_URL}/recommendations`);
      
      // Open preferences modal
      await page.click('button:has-text("Update Preferences")');
      
      // Verify preferences form
      await expect(page.locator('[data-testid="preferences-modal"]')).toBeVisible();
      
      // Update interests
      await page.check('input[value="machine-learning"]');
      await page.check('input[value="data-science"]');
      
      // Save preferences
      await page.click('button:has-text("Save Preferences")');
      
      // Verify success message
      await expect(page.locator('text=Preferences updated')).toBeVisible();
    });
  });

  test.describe('7. Mobile Responsiveness & Cross-Platform', () => {
    test('should be responsive on mobile viewports', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      
      // Verify mobile navigation
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Open mobile menu
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      
      // Test navigation
      await page.click('[data-testid="mobile-nav-courses"]');
      await page.waitForURL('**/courses');
      
      // Verify mobile course layout
      await expect(page.locator('[data-testid="course-grid"]')).toHaveClass(/grid-cols-1/);
    });

    test('should handle touch interactions', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      
      await page.goto(`${BASE_URL}/courses`);
      
      // Test touch/swipe gestures (simulated)
      const courseCard = page.locator('[data-testid="course-card"]').first();
      await courseCard.tap();
      
      // Verify navigation
      await page.waitForURL('**/courses/**');
    });
  });

  test.describe('8. Performance & Loading Tests', () => {
    test('should load pages within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/courses`);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle lazy loading of course content', async () => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      
      await page.goto(`${BASE_URL}/courses`);
      
      // Scroll to trigger lazy loading
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      // Wait for additional content to load
      await page.waitForTimeout(1000);
      
      // Verify more courses are loaded
      const courseCount = await page.locator('[data-testid="course-card"]').count();
      expect(courseCount).toBeGreaterThan(0);
    });

    test('should display loading states appropriately', async () => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      
      // Intercept login request to delay response
      await page.route('/api/auth/login', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        route.continue();
      });
      
      await page.click('button[type="submit"]');
      
      // Verify loading indicator
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // Wait for completion
      await page.waitForURL('**/dashboard');
    });
  });

  test.describe('9. Error Handling & Edge Cases', () => {
    test('should handle network errors gracefully', async () => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      
      // Simulate network failure
      await page.context().setOffline(true);
      
      // Try to navigate
      await page.click('text=Courses');
      
      // Should show offline message
      await expect(page.locator('text=Connection lost')).toBeVisible();
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Restore connection
      await page.context().setOffline(false);
      
      // Should automatically retry and recover
      await page.reload();
      await expect(page.locator('[data-testid="course-catalog"]')).toBeVisible();
    });

    test('should handle empty states correctly', async () => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      
      // Navigate to search with no results query
      await page.goto(`${BASE_URL}/search?q=nonexistentcourse123`);
      
      // Should show empty state
      await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
      await expect(page.locator('text=No results found')).toBeVisible();
      await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible();
    });

    test('should validate form inputs correctly', async () => {
      await page.goto(`${BASE_URL}/register`);
      
      // Submit empty form
      await page.click('button[type="submit"]');
      
      // Should show validation errors
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Password is required')).toBeVisible();
      
      // Test invalid email format
      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Invalid email format')).toBeVisible();
      
      // Test weak password
      await page.fill('input[name="password"]', '123');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Password too weak')).toBeVisible();
    });
  });

  test.describe('10. Accessibility & User Experience', () => {
    test('should be keyboard navigable', async () => {
      await page.goto(`${BASE_URL}/login`);
      
      // Tab through form elements
      await page.keyboard.press('Tab'); // Email field
      await expect(page.locator('input[name="email"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Password field
      await expect(page.locator('input[name="password"]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Submit button
      await expect(page.locator('button[type="submit"]')).toBeFocused();
      
      // Should be able to submit with Enter
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.keyboard.press('Enter');
      
      await page.waitForURL('**/dashboard');
    });

    test('should have proper ARIA labels and semantic HTML', async () => {
      await page.goto(`${BASE_URL}/courses`);
      
      // Check for proper headings hierarchy
      const h1 = await page.locator('h1').count();
      expect(h1).toBeGreaterThan(0);
      
      // Check for alt text on images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const altText = await img.getAttribute('alt');
        expect(altText).toBeTruthy();
      }
      
      // Check for form labels
      const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"]');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const ariaLabel = await input.getAttribute('aria-label');
        const associatedLabel = await page.locator(`label[for="${await input.getAttribute('id')}"]`).count();
        
        expect(ariaLabel || associatedLabel > 0).toBeTruthy();
      }
    });

    test('should support high contrast mode', async () => {
      // Enable high contrast
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Verify dark theme is applied
      const bodyClass = await page.locator('body').getAttribute('class');
      expect(bodyClass).toContain('dark');
      
      // Verify sufficient contrast (simplified check)
      const backgroundColor = await page.locator('body').evaluate(el => 
        getComputedStyle(el).backgroundColor
      );
      const textColor = await page.locator('body').evaluate(el => 
        getComputedStyle(el).color
      );
      
      expect(backgroundColor).not.toBe(textColor);
    });
  });

  test.describe('11. Data Persistence & Synchronization', () => {
    test.beforeEach(async () => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    });

    test('should persist user preferences across sessions', async () => {
      // Set theme preference
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Theme');
      await page.click('text=Dark');
      
      // Verify dark theme is applied
      await expect(page.locator('body')).toHaveClass(/dark/);
      
      // Refresh page
      await page.reload();
      
      // Should maintain dark theme
      await expect(page.locator('body')).toHaveClass(/dark/);
      
      // Open new tab/window
      const newPage = await page.context().newPage();
      await newPage.goto(`${BASE_URL}/dashboard`);
      
      // Should also have dark theme
      await expect(newPage.locator('body')).toHaveClass(/dark/);
      
      await newPage.close();
    });

    test('should sync learning progress across devices', async () => {
      // Start a course
      await page.goto(`${BASE_URL}/courses`);
      await page.click('[data-testid="course-card"]');
      
      // Check current progress
      const initialProgress = await page.locator('[data-testid="progress-percentage"]').textContent();
      
      // Complete a lesson
      await page.click('[data-testid="lesson-item"]');
      await page.click('button:has-text("Mark Complete")');
      
      // Verify progress updated
      await page.goBack();
      const updatedProgress = await page.locator('[data-testid="progress-percentage"]').textContent();
      
      expect(updatedProgress).not.toBe(initialProgress);
      
      // Open new session (simulating different device)
      const newContext = await page.context().browser()?.newContext();
      const newPage = await newContext?.newPage();
      
      if (newPage) {
        // Login on "new device"
        await newPage.goto(`${BASE_URL}/login`);
        await newPage.fill('input[name="email"]', TEST_USER_EMAIL);
        await newPage.fill('input[name="password"]', TEST_USER_PASSWORD);
        await newPage.click('button[type="submit"]');
        
        // Check progress is synced
        await newPage.goto(`${BASE_URL}/courses`);
        await newPage.click('[data-testid="course-card"]');
        
        const syncedProgress = await newPage.locator('[data-testid="progress-percentage"]').textContent();
        expect(syncedProgress).toBe(updatedProgress);
        
        await newPage.close();
        await newContext?.close();
      }
    });
  });

  test.describe('12. Final Integration Validation', () => {
    test('should complete full user learning journey', async () => {
      // Login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"]', TEST_USER_EMAIL);
      await page.fill('input[name="password"]', TEST_USER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // Browse and enroll in course
      await page.goto(`${BASE_URL}/courses`);
      await page.click('[data-testid="course-card"]');
      
      if (await page.locator('button:has-text("Enroll Now")').isVisible()) {
        await page.click('button:has-text("Enroll Now")');
        await expect(page.locator('text=Successfully enrolled')).toBeVisible();
      }

      // Start learning
      await page.click('button:has-text("Continue Learning")');
      
      // Complete lessons
      const lessons = page.locator('[data-testid="lesson-item"]');
      const lessonCount = Math.min(await lessons.count(), 3); // Test first 3 lessons
      
      for (let i = 0; i < lessonCount; i++) {
        await lessons.nth(i).click();
        await page.waitForLoadState('networkidle');
        
        // Mark as complete if not already
        if (await page.locator('button:has-text("Mark Complete")').isVisible()) {
          await page.click('button:has-text("Mark Complete")');
          await expect(page.locator('text=Lesson completed')).toBeVisible();
        }
        
        // Go back to course
        await page.goBack();
      }

      // Check gamification updates
      await page.goto(`${BASE_URL}/gamification`);
      
      // Should show increased points/progress
      const points = await page.locator('[data-testid="total-points"]').textContent();
      expect(parseInt(points?.replace(/[^\d]/g, '') || '0')).toBeGreaterThan(0);

      // Check for new achievements
      await page.click('text=Achievements');
      const achievements = page.locator('[data-testid="achievement-item"]');
      
      if (await achievements.count() > 0) {
        await expect(achievements.first()).toBeVisible();
      }

      // Test search functionality
      await page.goto(`${BASE_URL}/search`);
      await page.fill('input[placeholder*="Search"]', 'programming');
      await page.click('button:has-text("Search")');
      
      // Should show relevant results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

      // Check AI recommendations
      await page.goto(`${BASE_URL}/recommendations`);
      
      // Should show personalized courses
      await expect(page.locator('[data-testid="personalized-courses"]')).toBeVisible();

      // Verify all major features are accessible and functional
      const featureTests = [
        { url: '/dashboard', element: '[data-testid="dashboard-content"]' },
        { url: '/courses', element: '[data-testid="course-catalog"]' },
        { url: '/my-learning', element: '[data-testid="enrolled-courses"]' },
        { url: '/gamification', element: '[data-testid="gamification-dashboard"]' },
        { url: '/recommendations', element: '[data-testid="recommendations-header"]' },
        { url: '/search', element: '[data-testid="search-interface"]' },
      ];

      for (const test of featureTests) {
        await page.goto(`${BASE_URL}${test.url}`);
        await expect(page.locator(test.element)).toBeVisible();
      }

      console.log('✅ Complete user learning journey test passed successfully');
    });
  });
});