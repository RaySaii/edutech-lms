import { test, expect, Page } from '@playwright/test';
import { 
  navigateToLogin, 
  fillLoginForm, 
  submitLoginForm, 
  waitForAuthResponse,
  EXISTING_USER_EMAIL,
  EXISTING_USER_PASSWORD
} from '../auth/auth-helpers';

test.describe('Enrolled Courses Data Consistency', () => {
  let page: Page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    page.setDefaultTimeout(15000);
    
    // Capture console logs for debugging
    page.on('console', (message) => {
      console.log(`🖥️  BROWSER: ${message.type()}: ${message.text()}`);
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('enrolled courses count should be consistent between Dashboard and My Learning pages', async () => {
    console.log('🔄 Testing enrolled courses data consistency...');
    
    // Login first
    await navigateToLogin(page);
    await fillLoginForm(page, EXISTING_USER_EMAIL, EXISTING_USER_PASSWORD);
    await submitLoginForm(page);
    await waitForAuthResponse();
    console.log('✓ User authenticated');
    
    // Navigate to Dashboard and extract enrolled courses count
    await page.goto('http://localhost:4200/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(6000); // Wait longer for stats to stabilize after API calls
    
    // Look for the specific "Enrolled Courses" card on Dashboard
    let dashboardCount = 0;
    
    // Look specifically for the "Enrolled Courses" stat card
    const enrolledCoursesStatCard = page.locator('[data-testid="stat-enrolled-courses"]');
    const statCardExists = await enrolledCoursesStatCard.isVisible().catch(() => false);
    
    if (statCardExists) {
      const statText = await enrolledCoursesStatCard.textContent();
      dashboardCount = parseInt(statText || '0', 10);
      console.log(`📊 Dashboard shows: ${dashboardCount} enrolled courses (from test-id stat)`);
    } else {
      // Fallback: look for pattern "Enrolled Courses" followed by a number
      const pageText = await page.textContent('body');
      const enrolledCoursesPattern = /Enrolled Courses(\d+)/;
      const match = pageText?.match(enrolledCoursesPattern);
      
      if (match && match[1]) {
        dashboardCount = parseInt(match[1], 10);
        console.log(`📊 Dashboard shows: ${dashboardCount} enrolled courses (from pattern match)`);
      } else {
        console.log('📊 Dashboard shows: 0 enrolled courses (no pattern found)');
      }
    }
    
    // Navigate to My Learning page and extract enrolled courses count
    await page.goto('http://localhost:4200/my-learning');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for data to load
    
    // Look for enrolled courses count on My Learning page - similar approach
    let myLearningCount = 0;
    
    // Find the card that contains both "Enrolled Courses" text and a number
    const myLearningEnrolledCardLocator = page.locator('div:has-text("Enrolled Courses")');
    const myLearningEnrolledCards = await myLearningEnrolledCardLocator.all();
    
    for (const card of myLearningEnrolledCards) {
      const cardText = await card.textContent();
      console.log('My Learning enrolled card text:', cardText);
      
      // Look for a large number in the same card (usually displayed prominently)
      const numberMatches = cardText?.match(/\b(\d+)\b/g);
      if (numberMatches && numberMatches.length > 0) {
        // The first number in the card is usually the count
        myLearningCount = parseInt(numberMatches[0], 10);
        console.log(`🎓 My Learning shows: ${myLearningCount} enrolled courses (from card: "${cardText?.substring(0, 100)}...")`);
        break;
      }
    }
    
    // If we didn't find the number in the stat card, count actual course cards
    if (myLearningCount === 0) {
      const courseCards = page.locator('section:has-text("All My Courses") .grid > div');
      myLearningCount = await courseCards.count();
      console.log(`🎓 My Learning shows: ${myLearningCount} enrolled courses (counted actual course cards)`);
    }
    
    // Compare the counts
    console.log('\n📈 CONSISTENCY CHECK:');
    console.log(`Dashboard: ${dashboardCount} enrolled courses`);
    console.log(`My Learning: ${myLearningCount} enrolled courses`);
    
    if (dashboardCount === myLearningCount) {
      console.log('✅ SUCCESS: Enrolled courses count is CONSISTENT!');
    } else {
      console.log(`❌ INCONSISTENCY DETECTED: Dashboard (${dashboardCount}) ≠ My Learning (${myLearningCount})`);
    }
    
    // Test assertion - they should be equal
    expect(dashboardCount).toBe(myLearningCount);
    
    // Additional verification: check that both pages show the same courses
    if (dashboardCount > 0 && myLearningCount > 0) {
      // Go back to dashboard to get course titles
      await page.goto('http://localhost:4200/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const dashboardCourses = page.locator('[data-testid*="course"], .course-card, [class*="course"]');
      const dashboardCourseCount = await dashboardCourses.count();
      let dashboardTitles: string[] = [];
      
      for (let i = 0; i < Math.min(dashboardCourseCount, 3); i++) {
        const courseElement = dashboardCourses.nth(i);
        const titleElement = courseElement.locator('h2, h3, h4, [data-testid*="title"], .title').first();
        const titleExists = await titleElement.isVisible().catch(() => false);
        
        if (titleExists) {
          const title = await titleElement.textContent();
          if (title) {
            dashboardTitles.push(title.trim());
          }
        }
      }
      
      // Get course titles from My Learning page
      await page.goto('http://localhost:4200/my-learning');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const myLearningCourses = page.locator('[data-testid*="course"], .course-card, [class*="course"]');
      const myLearningCourseCount = await myLearningCourses.count();
      let myLearningTitles: string[] = [];
      
      for (let i = 0; i < Math.min(myLearningCourseCount, 3); i++) {
        const courseElement = myLearningCourses.nth(i);
        const titleElement = courseElement.locator('h2, h3, h4, [data-testid*="title"], .title').first();
        const titleExists = await titleElement.isVisible().catch(() => false);
        
        if (titleExists) {
          const title = await titleElement.textContent();
          if (title) {
            myLearningTitles.push(title.trim());
          }
        }
      }
      
      console.log('\n📚 COURSE TITLES VERIFICATION:');
      console.log(`Dashboard course titles: [${dashboardTitles.join(', ')}]`);
      console.log(`My Learning course titles: [${myLearningTitles.join(', ')}]`);
      
      // Check if there's overlap in course titles
      const commonTitles = dashboardTitles.filter(title => myLearningTitles.some(mlTitle => mlTitle.includes(title.substring(0, 20))));
      
      if (commonTitles.length > 0) {
        console.log(`✅ Found ${commonTitles.length} common course titles between pages`);
      }
    }
    
    console.log('\n🎯 ENROLLED COURSES CONSISTENCY TEST COMPLETED');
  });
});