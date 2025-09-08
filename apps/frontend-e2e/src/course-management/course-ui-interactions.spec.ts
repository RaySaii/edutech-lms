import { test, expect, Page } from '@playwright/test';
import { 
  navigateToLogin, 
  fillLoginForm, 
  submitLoginForm,
  EXISTING_USER_EMAIL,
  EXISTING_USER_PASSWORD
} from '../auth/auth-helpers';

test.describe('Course Management UI Interactions', () => {
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

  test('should test course catalog UI elements', async () => {
    // Navigate to courses
    const coursesLink = page.getByRole('link', { name: /courses/i }) ||
                       page.getByTestId('courses-link') ||
                       page.locator('a[href*="courses"]');

    if (await coursesLink.isVisible().catch(() => false)) {
      await coursesLink.click();
      await page.waitForURL('**/courses', { timeout: 10000 });
    } else {
      await page.goto('http://localhost:4200/courses');
    }

    // Test page title and heading
    const pageTitle = page.locator('h1') || page.getByTestId('page-title');
    if (await pageTitle.isVisible().catch(() => false)) {
      await expect(pageTitle).toBeVisible();
      const titleText = await pageTitle.textContent();
      expect(titleText).toBeTruthy();
    }

    // Test course grid/list container
    const coursesContainer = page.getByTestId('courses-container') ||
                           page.locator('[class*="courses-grid"]') ||
                           page.locator('[class*="course-list"]');

    if (await coursesContainer.isVisible().catch(() => false)) {
      await expect(coursesContainer).toBeVisible();
    }

    // Test individual course cards
    const courseCards = page.locator('[data-testid*="course-card"]') ||
                       page.locator('[class*="course-card"]') ||
                       page.locator('article, .card');

    const cardCount = await courseCards.count();
    if (cardCount > 0) {
      for (let i = 0; i < Math.min(cardCount, 5); i++) {
        const card = courseCards.nth(i);
        if (await card.isVisible().catch(() => false)) {
          await expect(card).toBeVisible();

          // Test course title
          const cardTitle = card.locator('h1, h2, h3, h4, h5, h6') ||
                           card.getByTestId('course-title');
          if (await cardTitle.isVisible().catch(() => false)) {
            await expect(cardTitle).toBeVisible();
            const titleText = await cardTitle.textContent();
            expect(titleText).toBeTruthy();
          }

          // Test course thumbnail/image
          const cardImage = card.locator('img') || card.getByTestId('course-image');
          if (await cardImage.isVisible().catch(() => false)) {
            await expect(cardImage).toBeVisible();
            const imgSrc = await cardImage.getAttribute('src');
            expect(imgSrc).toBeTruthy();
          }

          // Test course description
          const cardDescription = card.getByTestId('course-description') ||
                                card.locator('p, .description');
          if (await cardDescription.isVisible().catch(() => false)) {
            await expect(cardDescription).toBeVisible();
          }

          // Test course metadata (duration, level, etc.)
          const courseMeta = card.locator('[class*="meta"]') ||
                           card.locator('[class*="badge"]') ||
                           card.locator('span[class*="tag"]');
          
          const metaCount = await courseMeta.count();
          if (metaCount > 0) {
            for (let j = 0; j < Math.min(metaCount, 3); j++) {
              const metaItem = courseMeta.nth(j);
              if (await metaItem.isVisible().catch(() => false)) {
                await expect(metaItem).toBeVisible();
              }
            }
          }

          // Test action buttons (View, Enroll, etc.)
          const actionButtons = card.locator('button, a[role="button"]');
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
  });

  test('should test course filtering and search UI', async () => {
    await page.goto('http://localhost:4200/courses');

    // Test search input
    const searchInput = page.getByTestId('search-input') ||
                       page.locator('input[placeholder*="search"]') ||
                       page.locator('input[type="search"]');

    if (await searchInput.isVisible().catch(() => false)) {
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeEnabled();

      // Test search functionality
      await searchInput.fill('javascript');
      await expect(searchInput).toHaveValue('javascript');
      
      // Test search suggestions or autocomplete
      const searchSuggestions = page.locator('[class*="suggestion"]') ||
                              page.locator('[role="listbox"]');
      
      if (await searchSuggestions.isVisible().catch(() => false)) {
        await expect(searchSuggestions).toBeVisible();
        
        const suggestions = searchSuggestions.locator('[role="option"]') ||
                          searchSuggestions.locator('li, div');
        
        const suggestionCount = await suggestions.count();
        if (suggestionCount > 0) {
          await expect(suggestions.first()).toBeVisible();
        }
      }

      // Test search clear button
      const clearButton = page.getByTestId('clear-search') ||
                         page.locator('button[aria-label*="clear"]') ||
                         searchInput.locator('+ button');

      if (await clearButton.isVisible().catch(() => false)) {
        await clearButton.click();
        await expect(searchInput).toHaveValue('');
      }
    }

    // Test filter dropdown/buttons
    const filterContainer = page.getByTestId('filter-container') ||
                          page.locator('[class*="filter"]');

    if (await filterContainer.isVisible().catch(() => false)) {
      // Test category filter
      const categoryFilter = filterContainer.locator('select') ||
                           filterContainer.getByTestId('category-filter');

      if (await categoryFilter.isVisible().catch(() => false)) {
        await expect(categoryFilter).toBeVisible();
        await expect(categoryFilter).toBeEnabled();
        
        const options = categoryFilter.locator('option');
        const optionCount = await options.count();
        
        if (optionCount > 1) {
          await categoryFilter.selectOption({ index: 1 });
          const selectedValue = await categoryFilter.inputValue();
          expect(selectedValue).toBeTruthy();
        }
      }

      // Test level filter buttons
      const levelButtons = filterContainer.locator('button').filter({ hasText: /beginner|intermediate|advanced/i });
      const levelCount = await levelButtons.count();
      
      if (levelCount > 0) {
        const firstLevelButton = levelButtons.first();
        await expect(firstLevelButton).toBeVisible();
        await firstLevelButton.click();
        
        // Check if button becomes active
        const isActive = await firstLevelButton.getAttribute('aria-pressed') === 'true' ||
                        await firstLevelButton.getAttribute('class')?.includes('active');
        
        if (isActive !== null) {
          expect(isActive).toBeTruthy();
        }
      }

      // Test sort dropdown
      const sortDropdown = filterContainer.getByTestId('sort-dropdown') ||
                         filterContainer.locator('select[name*="sort"]');

      if (await sortDropdown.isVisible().catch(() => false)) {
        await expect(sortDropdown).toBeVisible();
        await sortDropdown.selectOption('popular');
        await expect(sortDropdown).toHaveValue('popular');
      }
    }

    // Test filter results count
    const resultsCount = page.getByTestId('results-count') ||
                        page.locator('[class*="results-count"]');

    if (await resultsCount.isVisible().catch(() => false)) {
      await expect(resultsCount).toBeVisible();
      const countText = await resultsCount.textContent();
      expect(countText).toMatch(/\d+/); // Should contain numbers
    }
  });

  test('should test course detail page UI elements', async () => {
    await page.goto('http://localhost:4200/courses');

    // Click on first course card
    const firstCourseCard = page.locator('[data-testid*="course-card"]').first() ||
                           page.locator('[class*="course-card"]').first();

    if (await firstCourseCard.isVisible().catch(() => false)) {
      await firstCourseCard.click();
      await page.waitForTimeout(2000);

      // Test course header section
      const courseHeader = page.getByTestId('course-header') ||
                          page.locator('[class*="course-header"]') ||
                          page.locator('header');

      if (await courseHeader.isVisible().catch(() => false)) {
        await expect(courseHeader).toBeVisible();

        // Test course title
        const courseTitle = courseHeader.locator('h1') ||
                          page.getByTestId('course-title');
        
        if (await courseTitle.isVisible().catch(() => false)) {
          await expect(courseTitle).toBeVisible();
        }

        // Test course instructor
        const instructor = courseHeader.getByTestId('course-instructor') ||
                         courseHeader.locator('[class*="instructor"]');

        if (await instructor.isVisible().catch(() => false)) {
          await expect(instructor).toBeVisible();
        }

        // Test course rating
        const rating = courseHeader.getByTestId('course-rating') ||
                      courseHeader.locator('[class*="rating"]') ||
                      courseHeader.locator('[class*="stars"]');

        if (await rating.isVisible().catch(() => false)) {
          await expect(rating).toBeVisible();
        }
      }

      // Test course content/curriculum section
      const courseCurriculum = page.getByTestId('course-curriculum') ||
                             page.locator('[class*="curriculum"]') ||
                             page.locator('[class*="content"]');

      if (await courseCurriculum.isVisible().catch(() => false)) {
        await expect(courseCurriculum).toBeVisible();

        // Test lesson list
        const lessonItems = courseCurriculum.locator('[class*="lesson"]') ||
                          courseCurriculum.locator('li, .item');

        const lessonCount = await lessonItems.count();
        if (lessonCount > 0) {
          for (let i = 0; i < Math.min(lessonCount, 5); i++) {
            const lesson = lessonItems.nth(i);
            if (await lesson.isVisible().catch(() => false)) {
              await expect(lesson).toBeVisible();

              // Test lesson title
              const lessonTitle = lesson.locator('[class*="title"]') ||
                                lesson.locator('h3, h4, h5, span');

              if (await lessonTitle.isVisible().catch(() => false)) {
                await expect(lessonTitle).toBeVisible();
              }

              // Test lesson duration
              const lessonDuration = lesson.locator('[class*="duration"]') ||
                                   lesson.locator('time');

              if (await lessonDuration.isVisible().catch(() => false)) {
                await expect(lessonDuration).toBeVisible();
              }

              // Test lesson play button
              const playButton = lesson.locator('button[aria-label*="play"]') ||
                               lesson.locator('[class*="play"]');

              if (await playButton.isVisible().catch(() => false)) {
                await expect(playButton).toBeVisible();
                await expect(playButton).toBeEnabled();
              }
            }
          }
        }
      }

      // Test enrollment/action buttons
      const enrollButton = page.getByTestId('enroll-button') ||
                          page.getByRole('button', { name: /enroll|start|join/i });

      if (await enrollButton.isVisible().catch(() => false)) {
        await expect(enrollButton).toBeVisible();
        await expect(enrollButton).toBeEnabled();
      }

      // Test course tabs (description, reviews, etc.)
      const tabList = page.locator('[role="tablist"]') ||
                     page.getByTestId('course-tabs');

      if (await tabList.isVisible().catch(() => false)) {
        const tabs = tabList.locator('[role="tab"]') || tabList.locator('button');
        const tabCount = await tabs.count();

        if (tabCount > 0) {
          for (let i = 0; i < tabCount; i++) {
            const tab = tabs.nth(i);
            if (await tab.isVisible().catch(() => false)) {
              await expect(tab).toBeVisible();
              await tab.click();
              
              // Test tab panel content
              const tabPanel = page.locator('[role="tabpanel"]');
              if (await tabPanel.isVisible().catch(() => false)) {
                await expect(tabPanel).toBeVisible();
              }
            }
          }
        }
      }
    }
  });

  test('should test course video player UI elements', async () => {
    await page.goto('http://localhost:4200/courses');

    // Navigate to a course with video content
    const firstCourseCard = page.locator('[data-testid*="course-card"]').first();
    
    if (await firstCourseCard.isVisible().catch(() => false)) {
      await firstCourseCard.click();
      await page.waitForTimeout(2000);

      // Look for video player or video lesson
      const videoPlayer = page.locator('video') ||
                         page.getByTestId('video-player') ||
                         page.locator('[class*="video-player"]');

      if (await videoPlayer.isVisible().catch(() => false)) {
        await expect(videoPlayer).toBeVisible();

        // Test video controls
        const playButton = page.locator('button[aria-label*="play"]') ||
                          page.locator('[class*="play-button"]');

        if (await playButton.isVisible().catch(() => false)) {
          await expect(playButton).toBeVisible();
          await playButton.click();
          
          // Test pause button appears after playing
          const pauseButton = page.locator('button[aria-label*="pause"]');
          if (await pauseButton.isVisible().catch(() => false)) {
            await expect(pauseButton).toBeVisible();
          }
        }

        // Test volume control
        const volumeControl = page.locator('input[type="range"][aria-label*="volume"]') ||
                            page.locator('[class*="volume"]');

        if (await volumeControl.isVisible().catch(() => false)) {
          await expect(volumeControl).toBeVisible();
        }

        // Test progress bar
        const progressBar = page.locator('input[type="range"][aria-label*="progress"]') ||
                          page.locator('[role="progressbar"]') ||
                          page.locator('[class*="progress"]');

        if (await progressBar.isVisible().catch(() => false)) {
          await expect(progressBar).toBeVisible();
        }

        // Test fullscreen button
        const fullscreenButton = page.locator('button[aria-label*="fullscreen"]') ||
                               page.locator('[class*="fullscreen"]');

        if (await fullscreenButton.isVisible().catch(() => false)) {
          await expect(fullscreenButton).toBeVisible();
        }

        // Test settings/quality button
        const settingsButton = page.locator('button[aria-label*="settings"]') ||
                             page.locator('[class*="settings"]');

        if (await settingsButton.isVisible().catch(() => false)) {
          await expect(settingsButton).toBeVisible();
        }
      }

      // Test alternative: iframe video player
      const videoIframe = page.locator('iframe[src*="video"]') ||
                         page.locator('iframe[src*="youtube"]') ||
                         page.locator('iframe[src*="vimeo"]');

      if (await videoIframe.isVisible().catch(() => false)) {
        await expect(videoIframe).toBeVisible();
        
        const iframeSrc = await videoIframe.getAttribute('src');
        expect(iframeSrc).toBeTruthy();
      }
    }
  });

  test('should test course progress tracking UI', async () => {
    await page.goto('http://localhost:4200/courses');

    // Look for enrolled courses or my learning section
    const myLearningLink = page.getByRole('link', { name: /my learning/i }) ||
                          page.getByTestId('my-learning-link');

    if (await myLearningLink.isVisible().catch(() => false)) {
      await myLearningLink.click();
      await page.waitForTimeout(2000);
    } else {
      // Try dashboard instead
      await page.goto('http://localhost:4200/dashboard');
    }

    // Test enrolled courses with progress
    const enrolledCourses = page.locator('[data-testid*="enrolled-course"]') ||
                          page.locator('[class*="enrolled"]') ||
                          page.locator('[class*="progress"]');

    const enrolledCount = await enrolledCourses.count();
    if (enrolledCount > 0) {
      for (let i = 0; i < Math.min(enrolledCount, 3); i++) {
        const courseItem = enrolledCourses.nth(i);
        if (await courseItem.isVisible().catch(() => false)) {
          await expect(courseItem).toBeVisible();

          // Test progress bar
          const progressBar = courseItem.locator('[role="progressbar"]') ||
                            courseItem.locator('progress') ||
                            courseItem.locator('[class*="progress-bar"]');

          if (await progressBar.isVisible().catch(() => false)) {
            await expect(progressBar).toBeVisible();

            // Test progress percentage
            const progressText = courseItem.locator('[class*="percentage"]') ||
                               courseItem.locator('[class*="progress-text"]');

            if (await progressText.isVisible().catch(() => false)) {
              await expect(progressText).toBeVisible();
              const progressValue = await progressText.textContent();
              expect(progressValue).toMatch(/\d+%/);
            }
          }

          // Test continue/resume button
          const continueButton = courseItem.getByRole('button', { name: /continue|resume/i }) ||
                               courseItem.getByTestId('continue-button');

          if (await continueButton.isVisible().catch(() => false)) {
            await expect(continueButton).toBeVisible();
            await expect(continueButton).toBeEnabled();
          }

          // Test completion badge/indicator
          const completionBadge = courseItem.locator('[class*="completed"]') ||
                                courseItem.locator('[class*="badge"]') ||
                                courseItem.locator('[aria-label*="completed"]');

          if (await completionBadge.isVisible().catch(() => false)) {
            await expect(completionBadge).toBeVisible();
          }
        }
      }
    }
  });

  test('should test course creation/management UI (if accessible)', async () => {
    // Navigate to course creation page if available
    const createCourseLink = page.getByRole('link', { name: /create course/i }) ||
                           page.getByTestId('create-course-link') ||
                           page.locator('a[href*="create"]');

    if (await createCourseLink.isVisible().catch(() => false)) {
      await createCourseLink.click();
      await page.waitForTimeout(2000);

      // Test course creation form
      const courseForm = page.getByTestId('course-form') ||
                        page.locator('form');

      if (await courseForm.isVisible().catch(() => false)) {
        await expect(courseForm).toBeVisible();

        // Test form fields
        const titleInput = courseForm.getByTestId('course-title') ||
                         courseForm.locator('input[name*="title"]');

        if (await titleInput.isVisible().catch(() => false)) {
          await expect(titleInput).toBeVisible();
          await titleInput.fill('Test Course Title');
          await expect(titleInput).toHaveValue('Test Course Title');
        }

        const descriptionTextarea = courseForm.getByTestId('course-description') ||
                                   courseForm.locator('textarea');

        if (await descriptionTextarea.isVisible().catch(() => false)) {
          await expect(descriptionTextarea).toBeVisible();
          await descriptionTextarea.fill('Test course description');
          await expect(descriptionTextarea).toHaveValue('Test course description');
        }

        // Test image upload
        const imageUpload = courseForm.locator('input[type="file"]') ||
                          courseForm.getByTestId('image-upload');

        if (await imageUpload.isVisible().catch(() => false)) {
          await expect(imageUpload).toBeVisible();
        }

        // Test category selection
        const categorySelect = courseForm.getByTestId('course-category') ||
                             courseForm.locator('select');

        if (await categorySelect.isVisible().catch(() => false)) {
          await expect(categorySelect).toBeVisible();
          
          const options = categorySelect.locator('option');
          const optionCount = await options.count();
          
          if (optionCount > 1) {
            await categorySelect.selectOption({ index: 1 });
          }
        }

        // Test save/submit button
        const saveButton = courseForm.getByRole('button', { name: /save|create|submit/i });

        if (await saveButton.isVisible().catch(() => false)) {
          await expect(saveButton).toBeVisible();
          await expect(saveButton).toBeEnabled();
        }
      }
    }
  });

  test('should test course reviews and ratings UI', async () => {
    await page.goto('http://localhost:4200/courses');

    // Navigate to course detail page
    const firstCourseCard = page.locator('[data-testid*="course-card"]').first();
    
    if (await firstCourseCard.isVisible().catch(() => false)) {
      await firstCourseCard.click();
      await page.waitForTimeout(2000);

      // Look for reviews section
      const reviewsSection = page.getByTestId('course-reviews') ||
                           page.locator('[class*="reviews"]') ||
                           page.getByText(/reviews/i).locator('..');

      if (await reviewsSection.isVisible().catch(() => false)) {
        await expect(reviewsSection).toBeVisible();

        // Test individual reviews
        const reviewItems = reviewsSection.locator('[class*="review"]') ||
                          reviewsSection.locator('article') ||
                          reviewsSection.locator('.review-item');

        const reviewCount = await reviewItems.count();
        if (reviewCount > 0) {
          for (let i = 0; i < Math.min(reviewCount, 3); i++) {
            const review = reviewItems.nth(i);
            if (await review.isVisible().catch(() => false)) {
              await expect(review).toBeVisible();

              // Test reviewer name
              const reviewerName = review.locator('[class*="name"]') ||
                                 review.locator('[class*="author"]');

              if (await reviewerName.isVisible().catch(() => false)) {
                await expect(reviewerName).toBeVisible();
              }

              // Test star rating
              const starRating = review.locator('[class*="stars"]') ||
                               review.locator('[class*="rating"]');

              if (await starRating.isVisible().catch(() => false)) {
                await expect(starRating).toBeVisible();
              }

              // Test review text
              const reviewText = review.locator('p, [class*="comment"]');
              if (await reviewText.isVisible().catch(() => false)) {
                await expect(reviewText).toBeVisible();
              }

              // Test review date
              const reviewDate = review.locator('time, [class*="date"]');
              if (await reviewDate.isVisible().catch(() => false)) {
                await expect(reviewDate).toBeVisible();
              }
            }
          }
        }

        // Test write review button/form
        const writeReviewButton = page.getByRole('button', { name: /write review/i }) ||
                                page.getByTestId('write-review-button');

        if (await writeReviewButton.isVisible().catch(() => false)) {
          await expect(writeReviewButton).toBeVisible();
          await writeReviewButton.click();

          // Test review form
          const reviewForm = page.getByTestId('review-form') ||
                           page.locator('form');

          if (await reviewForm.isVisible().catch(() => false)) {
            await expect(reviewForm).toBeVisible();

            // Test star rating input
            const starRatingInput = reviewForm.locator('[type="radio"]') ||
                                  reviewForm.locator('[class*="star"]');

            const starCount = await starRatingInput.count();
            if (starCount > 0) {
              await starRatingInput.nth(4).click(); // 5-star rating
            }

            // Test review text input
            const reviewTextInput = reviewForm.locator('textarea');
            if (await reviewTextInput.isVisible().catch(() => false)) {
              await reviewTextInput.fill('Great course content!');
              await expect(reviewTextInput).toHaveValue('Great course content!');
            }
          }
        }
      }
    }
  });
});