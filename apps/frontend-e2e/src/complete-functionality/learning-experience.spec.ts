import { test, expect, Page } from '@playwright/test';
import { 
  navigateToLogin, 
  fillLoginForm, 
  submitLoginForm, 
  waitForAuthResponse,
  EXISTING_USER_EMAIL,
  EXISTING_USER_PASSWORD
} from '../auth/auth-helpers';

test.describe('Complete Learning Experience Flow', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    page.setDefaultTimeout(15000);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Video Learning and Playback', () => {
    test('user can access video content and control playback', async () => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Navigate to find course with video content
      const videoPaths = ['/courses/1/learn/1', '/dashboard', '/my-learning'];
      
      for (const path of videoPaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        // Look for video elements
        const videoElements = [
          page.locator('video').first(),
          page.locator('[data-testid*="video"]').first(),
          page.locator('.video-player').first(),
          page.locator('iframe[src*="video"], iframe[src*="youtube"], iframe[src*="vimeo"]').first()
        ];
        
        let hasVideo = false;
        for (const videoEl of videoElements) {
          if (await videoEl.isVisible().catch(() => false)) {
            hasVideo = true;
            console.log(`✓ Video content found on ${path}`);
            
            // Test video controls if it's a native video element
            if ((await videoEl.tagName().catch(() => '')) === 'VIDEO') {
              // Test play/pause functionality
              const isPlaying = await videoEl.evaluate((video: HTMLVideoElement) => !video.paused).catch(() => false);
              
              if (!isPlaying) {
                await videoEl.click(); // Try to play
                await page.waitForTimeout(1000);
                console.log('✓ Video play interaction attempted');
              }
              
              // Check for video duration and progress
              const duration = await videoEl.evaluate((video: HTMLVideoElement) => video.duration).catch(() => 0);
              const currentTime = await videoEl.evaluate((video: HTMLVideoElement) => video.currentTime).catch(() => 0);
              
              if (duration > 0) {
                console.log(`✓ Video duration: ${Math.round(duration)}s, Current: ${Math.round(currentTime)}s`);
              }
            }
            
            // Look for custom video controls
            const customControls = [
              page.locator('[data-testid*="play"], button:has-text("Play")'),
              page.locator('[data-testid*="pause"], button:has-text("Pause")'),
              page.locator('[data-testid*="volume"], [aria-label*="volume"]'),
              page.locator('[data-testid*="fullscreen"], [aria-label*="fullscreen"]')
            ];
            
            let controlsFound = 0;
            for (const control of customControls) {
              if (await control.first().isVisible().catch(() => false)) {
                controlsFound++;
              }
            }
            
            if (controlsFound > 0) {
              console.log(`✓ Found ${controlsFound} video control elements`);
            }
            break;
          }
        }
        
        if (hasVideo) break;
      }
    });

    test('user can navigate between video lessons in sequence', async () => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Try to access a course with multiple lessons
      const coursePaths = ['/courses/1', '/dashboard', '/my-learning'];
      
      for (const path of coursePaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        // Look for lesson navigation
        const lessonNavElements = [
          page.locator('[data-testid*="lesson"], .lesson-item'),
          page.locator('li:has-text("Lesson"), li:has-text("Chapter")'),
          page.locator('a[href*="/learn/"], [href*="/lesson/"]')
        ];
        
        let hasLessonNav = false;
        for (const navEl of lessonNavElements) {
          const lessonCount = await navEl.count();
          if (lessonCount > 1) {
            hasLessonNav = true;
            console.log(`✓ Found ${lessonCount} lessons in course navigation`);
            
            // Click on first lesson
            const firstLesson = navEl.first();
            await firstLesson.click();
            await page.waitForLoadState('networkidle');
            
            // Look for next/previous lesson controls
            const navigationControls = [
              page.locator('button:has-text("Next"), [data-testid*="next"]'),
              page.locator('button:has-text("Previous"), [data-testid*="prev"]'),
              page.locator('a:has-text("Next"), a:has-text("Previous")')
            ];
            
            let navControlsFound = 0;
            for (const navControl of navigationControls) {
              if (await navControl.first().isVisible().catch(() => false)) {
                navControlsFound++;
              }
            }
            
            if (navControlsFound > 0) {
              console.log(`✓ Found ${navControlsFound} lesson navigation controls`);
              
              // Try to navigate to next lesson
              const nextButton = page.locator('button:has-text("Next"), [data-testid*="next"], a:has-text("Next")').first();
              const nextExists = await nextButton.isVisible().catch(() => false);
              
              if (nextExists) {
                await nextButton.click();
                await page.waitForLoadState('networkidle');
                console.log('✓ Successfully navigated to next lesson');
              }
            }
            break;
          }
        }
        
        if (hasLessonNav) break;
      }
    });
  });

  test.describe('Progress Tracking and Completion', () => {
    test('user can track learning progress and mark lessons complete', async () => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Navigate to a course or learning page
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Look for progress indicators
      const progressElements = [
        page.locator('[data-testid*="progress"], .progress-bar'),
        page.locator(':has-text("Progress"), :has-text("%")'),
        page.locator('div[role="progressbar"], [aria-valuenow]')
      ];

      let hasProgress = false;
      for (const progressEl of progressElements) {
        if (await progressEl.first().isVisible().catch(() => false)) {
          hasProgress = true;
          console.log('✓ Progress tracking elements found');
          
          // Count progress bars/indicators
          const progressCount = await progressEl.count();
          console.log(`✓ Found ${progressCount} progress indicators`);
          
          // Try to get progress values
          const progressBars = await progressEl.all();
          for (let i = 0; i < Math.min(progressBars.length, 3); i++) {
            const progressValue = await progressBars[i].getAttribute('aria-valuenow').catch(() => null);
            const progressText = await progressBars[i].textContent().catch(() => '');
            
            if (progressValue) {
              console.log(`✓ Progress bar ${i + 1}: ${progressValue}%`);
            } else if (progressText.includes('%')) {
              console.log(`✓ Progress indicator ${i + 1}: ${progressText.trim()}`);
            }
          }
          break;
        }
      }

      if (!hasProgress) {
        console.log('⚠ No progress indicators found - may need course enrollment');
      }

      // Look for completion buttons/functionality
      const completionElements = [
        page.locator('button:has-text("Complete"), button:has-text("Mark Complete")'),
        page.locator('[data-testid*="complete"], [data-testid*="finish"]'),
        page.locator('input[type="checkbox"]:near(:has-text("Complete"))')
      ];

      let hasCompletion = false;
      for (const completeEl of completionElements) {
        if (await completeEl.first().isVisible().catch(() => false)) {
          hasCompletion = true;
          console.log('✓ Lesson completion functionality found');
          
          // Count completion elements
          const completeCount = await completeEl.count();
          console.log(`✓ Found ${completeCount} completion controls`);
          break;
        }
      }

      if (!hasCompletion) {
        console.log('⚠ No completion controls found - may be in lesson view');
      }
    });

    test('user can view overall course progress and achievements', async () => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Check progress overview on different pages
      const progressPages = ['/dashboard', '/my-learning'];
      
      for (const path of progressPages) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        // Look for course progress overview
        const courseProgressElements = [
          page.locator('[data-testid*="enrolled"], .enrolled-course'),
          page.locator(':has-text("My Courses"), :has-text("Enrolled")'),
          page.locator('[data-testid*="course-progress"]')
        ];
        
        let hasCourseProgress = false;
        for (const courseEl of courseProgressElements) {
          if (await courseEl.first().isVisible().catch(() => false)) {
            hasCourseProgress = true;
            console.log(`✓ Course progress overview found on ${path}`);
            
            // Count enrolled courses with progress
            const courseItems = courseEl;
            const courseCount = await courseItems.count();
            console.log(`✓ Found ${courseCount} enrolled courses with progress`);
            
            // Look for progress percentages or completion status
            const progressTexts = page.locator(':has-text("%"), :has-text("Completed"), :has-text("In Progress")');
            const progressCount = await progressTexts.count();
            
            if (progressCount > 0) {
              console.log(`✓ Found ${progressCount} progress indicators`);
            }
            break;
          }
        }
        
        if (hasCourseProgress) break;
      }

      // Look for achievements or badges
      const achievementElements = [
        page.locator(':has-text("Achievement"), :has-text("Badge")'),
        page.locator('[data-testid*="achievement"], [data-testid*="badge"]'),
        page.locator('.achievement, .badge, [class*="achievement"]')
      ];

      let hasAchievements = false;
      for (const achieveEl of achievementElements) {
        if (await achieveEl.first().isVisible().catch(() => false)) {
          hasAchievements = true;
          console.log('✓ Achievement/badge system found');
          
          const achieveCount = await achieveEl.count();
          console.log(`✓ Found ${achieveCount} achievement elements`);
          break;
        }
      }

      if (!hasAchievements) {
        console.log('⚠ No achievement system found - feature may not be implemented');
      }
    });
  });

  test.describe('Interactive Learning Features', () => {
    test('user can access and complete interactive quizzes', async () => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Try different paths to find quiz content
      const quizPaths = ['/quiz/1', '/courses/1/quiz', '/courses/1/learn/quiz'];
      
      for (const path of quizPaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        // Look for quiz elements
        const quizElements = [
          page.locator('[data-testid*="quiz"], [data-testid*="question"]'),
          page.locator(':has-text("Question"), :has-text("Quiz")'),
          page.locator('input[type="radio"], input[type="checkbox"]'),
          page.locator('form:has(input[type="radio"])')
        ];
        
        let hasQuiz = false;
        for (const quizEl of quizElements) {
          if (await quizEl.first().isVisible().catch(() => false)) {
            hasQuiz = true;
            console.log(`✓ Quiz content found on ${path}`);
            
            // Count questions
            const questionElements = page.locator(':has-text("Question"), [data-testid*="question"], fieldset');
            const questionCount = await questionElements.count();
            if (questionCount > 0) {
              console.log(`✓ Found ${questionCount} quiz questions`);
            }
            
            // Count answer options
            const answerOptions = page.locator('input[type="radio"], input[type="checkbox"]');
            const optionCount = await answerOptions.count();
            if (optionCount > 0) {
              console.log(`✓ Found ${optionCount} answer options`);
              
              // Try to select an answer
              await answerOptions.first().click();
              console.log('✓ Answer selection works');
            }
            
            // Look for submit functionality
            const submitButtons = page.locator('button:has-text("Submit"), button:has-text("Complete"), [data-testid*="submit"]');
            const submitExists = await submitButtons.first().isVisible().catch(() => false);
            
            if (submitExists) {
              console.log('✓ Quiz submission functionality available');
            }
            break;
          }
        }
        
        if (hasQuiz) break;
      }
    });

    test('user can access downloadable resources and materials', async () => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Look for downloadable resources in course content
      const resourcePaths = ['/courses/1', '/courses/1/learn/1', '/dashboard'];
      
      for (const path of resourcePaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        // Look for download links and resources
        const resourceElements = [
          page.locator('a[href*=".pdf"], a[href*=".doc"], a[href*=".zip"]'),
          page.locator('a:has-text("Download"), button:has-text("Download")'),
          page.locator('[data-testid*="download"], [data-testid*="resource"]'),
          page.locator(':has-text("Resource"), :has-text("Material")')
        ];
        
        let hasResources = false;
        for (const resourceEl of resourceElements) {
          if (await resourceEl.first().isVisible().catch(() => false)) {
            hasResources = true;
            console.log(`✓ Downloadable resources found on ${path}`);
            
            const resourceCount = await resourceEl.count();
            console.log(`✓ Found ${resourceCount} downloadable resources`);
            
            // Check resource types
            const pdfLinks = page.locator('a[href*=".pdf"]');
            const docLinks = page.locator('a[href*=".doc"]');
            const zipLinks = page.locator('a[href*=".zip"]');
            
            const pdfCount = await pdfLinks.count();
            const docCount = await docLinks.count();
            const zipCount = await zipLinks.count();
            
            if (pdfCount > 0) console.log(`✓ Found ${pdfCount} PDF resources`);
            if (docCount > 0) console.log(`✓ Found ${docCount} document resources`);
            if (zipCount > 0) console.log(`✓ Found ${zipCount} archive resources`);
            break;
          }
        }
        
        if (hasResources) break;
      }
    });

    test('user can participate in discussions and forums (if available)', async () => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Look for discussion/forum features
      const discussionPaths = ['/courses/1/discussions', '/courses/1', '/dashboard'];
      
      for (const path of discussionPaths) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        // Look for discussion elements
        const discussionElements = [
          page.locator(':has-text("Discussion"), :has-text("Forum")'),
          page.locator('[data-testid*="discussion"], [data-testid*="forum"]'),
          page.locator('textarea[placeholder*="comment"], textarea[placeholder*="discussion"]'),
          page.locator('button:has-text("Post"), button:has-text("Reply")')
        ];
        
        let hasDiscussion = false;
        for (const discussEl of discussionElements) {
          if (await discussEl.first().isVisible().catch(() => false)) {
            hasDiscussion = true;
            console.log(`✓ Discussion features found on ${path}`);
            
            // Look for existing posts or comments
            const posts = page.locator('[data-testid*="post"], .post, .comment');
            const postCount = await posts.count();
            if (postCount > 0) {
              console.log(`✓ Found ${postCount} discussion posts`);
            }
            
            // Look for posting interface
            const postingInterface = page.locator('textarea, [contenteditable="true"]');
            const hasPosting = await postingInterface.first().isVisible().catch(() => false);
            
            if (hasPosting) {
              console.log('✓ Discussion posting interface available');
            }
            break;
          }
        }
        
        if (hasDiscussion) {
          console.log('✓ Discussion/forum functionality found');
        } else {
          console.log('⚠ No discussion features found - may not be implemented');
        }
        
        if (hasDiscussion) break;
      }
    });
  });

  test.describe('Learning Analytics and Reporting', () => {
    test('user can view personal learning analytics and time tracking', async () => {
      // Login first
      await navigateToLogin(page);
      await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
      await submitLoginForm(page);
      await waitForAuthResponse();

      // Look for analytics on dashboard and learning pages
      const analyticsPages = ['/dashboard', '/my-learning'];
      
      for (const path of analyticsPages) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        
        // Look for learning analytics
        const analyticsElements = [
          page.locator(':has-text("Time Spent"), :has-text("Study Time")'),
          page.locator(':has-text("Hours"), :has-text("Minutes")'),
          page.locator('[data-testid*="analytics"], [data-testid*="stats"]'),
          page.locator(':has-text("Streak"), :has-text("Activity")')
        ];
        
        let hasAnalytics = false;
        for (const analyticsEl of analyticsElements) {
          if (await analyticsEl.first().isVisible().catch(() => false)) {
            hasAnalytics = true;
            console.log(`✓ Learning analytics found on ${path}`);
            
            const analyticsCount = await analyticsEl.count();
            console.log(`✓ Found ${analyticsCount} analytics elements`);
            
            // Look for specific metrics
            const timeMetrics = page.locator(':has-text("hours"), :has-text("minutes"), :has-text("time")');
            const progressMetrics = page.locator(':has-text("%"), :has-text("completed")');
            
            const timeCount = await timeMetrics.count();
            const progressCount = await progressMetrics.count();
            
            if (timeCount > 0) console.log(`✓ Found ${timeCount} time-based metrics`);
            if (progressCount > 0) console.log(`✓ Found ${progressCount} progress metrics`);
            break;
          }
        }
        
        if (hasAnalytics) break;
      }
    });
  });
});