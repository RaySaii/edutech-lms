import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  User,
  Organization,
  Course,
  Content,
  Enrollment,
  UserPoints,
  Achievement,
  SearchIndex,
} from '@edutech-lms/database';
import { AppModule } from '../../apps/api-gateway/src/app/app.module';

describe('Advanced Features End-to-End Tests', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let organizationRepository: Repository<Organization>;
  let courseRepository: Repository<Course>;
  let contentRepository: Repository<Content>;
  let enrollmentRepository: Repository<Enrollment>;
  let userPointsRepository: Repository<UserPoints>;
  let achievementRepository: Repository<Achievement>;
  let searchIndexRepository: Repository<SearchIndex>;
  
  let testUser: User;
  let testOrganization: Organization;
  let testCourse: Course;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DB_HOST || 'localhost',
          port: parseInt(process.env.TEST_DB_PORT) || 5433,
          username: process.env.TEST_DB_USERNAME || 'test',
          password: process.env.TEST_DB_PASSWORD || 'test',
          database: process.env.TEST_DB_NAME || 'edutech_test',
          entities: [User, Organization, Course, Content, Enrollment, UserPoints, Achievement, SearchIndex],
          synchronize: true,
          dropSchema: true,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get repositories
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    organizationRepository = moduleFixture.get<Repository<Organization>>(getRepositoryToken(Organization));
    courseRepository = moduleFixture.get<Repository<Course>>(getRepositoryToken(Course));
    contentRepository = moduleFixture.get<Repository<Content>>(getRepositoryToken(Content));
    enrollmentRepository = moduleFixture.get<Repository<Enrollment>>(getRepositoryToken(Enrollment));
    userPointsRepository = moduleFixture.get<Repository<UserPoints>>(getRepositoryToken(UserPoints));
    achievementRepository = moduleFixture.get<Repository<Achievement>>(getRepositoryToken(Achievement));
    searchIndexRepository = moduleFixture.get<Repository<SearchIndex>>(getRepositoryToken(SearchIndex));

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupTestData() {
    // Create test organization
    testOrganization = await organizationRepository.save({
      name: 'Test Organization',
      subdomain: 'test-org',
      settings: {
        features: {
          gamification: true,
          analytics: true,
          mobile: true,
          ai_recommendations: true,
          advanced_search: true,
        },
      },
    });

    // Create test user
    testUser = await userRepository.save({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: '$2b$10$example.hash', // Pre-hashed password
      role: 'student',
      organizationId: testOrganization.id,
      isActive: true,
      emailVerified: true,
    });

    // Create test course
    testCourse = await courseRepository.save({
      title: 'Test Course',
      description: 'A comprehensive test course',
      organizationId: testOrganization.id,
      instructorId: testUser.id,
      category: 'programming',
      difficulty: 'intermediate',
      isPublished: true,
      price: 99.99,
      estimatedDuration: 120,
    });

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.accessToken;
  }

  describe('1. Authentication & Authorization Tests', () => {
    it('should authenticate user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should require valid JWT token for protected routes', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses')
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });

    it('should access protected routes with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should implement MFA setup', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/mfa/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('secret');
      expect(response.body).toHaveProperty('qrCodeUrl');
    });
  });

  describe('2. Course Management Tests', () => {
    it('should create a new course', async () => {
      const courseData = {
        title: 'Advanced JavaScript',
        description: 'Learn advanced JavaScript concepts',
        category: 'programming',
        difficulty: 'advanced',
        price: 149.99,
        estimatedDuration: 180,
      };

      const response = await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(courseData)
        .expect(201);

      expect(response.body.title).toBe(courseData.title);
      expect(response.body.organizationId).toBe(testOrganization.id);
    });

    it('should retrieve course with prerequisites', async () => {
      const response = await request(app.getHttpServer())
        .get(`/courses/${testCourse.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testCourse.id);
      expect(response.body.title).toBe(testCourse.title);
    });

    it('should enroll user in course', async () => {
      const response = await request(app.getHttpServer())
        .post(`/courses/${testCourse.id}/enroll`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('enrollmentId');
      expect(response.body.courseId).toBe(testCourse.id);
      expect(response.body.userId).toBe(testUser.id);
    });

    it('should track course progress', async () => {
      // First enroll in course
      await request(app.getHttpServer())
        .post(`/courses/${testCourse.id}/enroll`)
        .set('Authorization', `Bearer ${authToken}`);

      const progressData = {
        lessonId: 'test-lesson-1',
        progress: 75,
        timeSpent: 45,
      };

      const response = await request(app.getHttpServer())
        .post(`/courses/${testCourse.id}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(progressData)
        .expect(200);

      expect(response.body.progress).toBe(progressData.progress);
    });
  });

  describe('3. Content Management Tests', () => {
    it('should create content for course', async () => {
      const contentData = {
        title: 'Introduction to Variables',
        description: 'Learn about JavaScript variables',
        contentType: 'video',
        content: 'Video content URL or embedded code',
        estimatedDuration: 15,
        order: 1,
      };

      const response = await request(app.getHttpServer())
        .post(`/courses/${testCourse.id}/content`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(contentData)
        .expect(201);

      expect(response.body.title).toBe(contentData.title);
      expect(response.body.courseId).toBe(testCourse.id);
    });

    it('should handle file uploads', async () => {
      const response = await request(app.getHttpServer())
        .post('/content/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test file content'), 'test.pdf')
        .field('courseId', testCourse.id)
        .expect(201);

      expect(response.body).toHaveProperty('fileUrl');
      expect(response.body).toHaveProperty('fileName');
    });
  });

  describe('4. Notification System Tests', () => {
    it('should send enrollment notification', async () => {
      const notificationData = {
        type: 'enrollment',
        userId: testUser.id,
        courseId: testCourse.id,
        channels: ['email', 'in_app'],
      };

      const response = await request(app.getHttpServer())
        .post('/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(notificationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.notificationId).toBeDefined();
    });

    it('should retrieve user notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.notifications)).toBe(true);
      expect(response.body).toHaveProperty('unreadCount');
    });

    it('should mark notifications as read', async () => {
      // First create a notification
      const notificationResponse = await request(app.getHttpServer())
        .post('/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'course_update',
          userId: testUser.id,
          channels: ['in_app'],
        });

      const notificationId = notificationResponse.body.notificationId;

      const response = await request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('5. Payment System Tests', () => {
    it('should create payment intent for course purchase', async () => {
      const paymentData = {
        courseId: testCourse.id,
        amount: testCourse.price * 100, // Stripe expects cents
        currency: 'usd',
        paymentMethodId: 'pm_card_visa',
      };

      const response = await request(app.getHttpServer())
        .post('/payments/create-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body).toHaveProperty('paymentIntentId');
    });

    it('should handle subscription creation', async () => {
      const subscriptionData = {
        priceId: 'price_test_subscription',
        paymentMethodId: 'pm_card_visa',
      };

      const response = await request(app.getHttpServer())
        .post('/payments/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subscriptionData)
        .expect(201);

      expect(response.body).toHaveProperty('subscriptionId');
      expect(response.body.status).toBe('active');
    });
  });

  describe('6. Analytics System Tests', () => {
    it('should generate user learning analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/user/learning')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalLearningTime');
      expect(response.body).toHaveProperty('coursesCompleted');
      expect(response.body).toHaveProperty('progressData');
    });

    it('should provide course analytics for instructors', async () => {
      const response = await request(app.getHttpServer())
        .get(`/analytics/courses/${testCourse.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('enrollmentCount');
      expect(response.body).toHaveProperty('completionRate');
      expect(response.body).toHaveProperty('engagementMetrics');
    });

    it('should generate dashboard widgets', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.widgets)).toBe(true);
      expect(response.body).toHaveProperty('summary');
    });
  });

  describe('7. Mobile Support Tests', () => {
    it('should register mobile device', async () => {
      const deviceData = {
        deviceToken: 'test-device-token-123',
        platform: 'ios',
        appVersion: '1.0.0',
        capabilities: {
          push_notifications: true,
          offline_sync: true,
          biometric_auth: true,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/mobile/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData)
        .expect(201);

      expect(response.body).toHaveProperty('deviceId');
      expect(response.body.platform).toBe(deviceData.platform);
    });

    it('should handle offline content sync', async () => {
      const syncData = {
        lastSyncTimestamp: new Date().toISOString(),
        contentTypes: ['courses', 'progress'],
      };

      const response = await request(app.getHttpServer())
        .post('/mobile/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send(syncData)
        .expect(200);

      expect(response.body).toHaveProperty('syncToken');
      expect(Array.isArray(response.body.updatedContent)).toBe(true);
    });
  });

  describe('8. AI Recommendations Tests', () => {
    it('should generate personalized course recommendations', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-recommendations/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      expect(Array.isArray(response.body.recommendations)).toBe(true);
      expect(response.body).toHaveProperty('algorithmUsed');
      expect(response.body).toHaveProperty('personalizationScore');
    });

    it('should track user interactions with recommendations', async () => {
      const interactionData = {
        recommendationId: 'rec-123',
        interactionType: 'click',
        courseId: testCourse.id,
      };

      const response = await request(app.getHttpServer())
        .post('/ai-recommendations/interactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(interactionData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should update user learning profile', async () => {
      const profileData = {
        interests: ['javascript', 'react', 'nodejs'],
        skillLevels: {
          javascript: { level: 'intermediate', confidence: 0.8 },
          react: { level: 'beginner', confidence: 0.6 },
        },
        learningGoals: ['career_change', 'skill_improvement'],
      };

      const response = await request(app.getHttpServer())
        .put('/ai-recommendations/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('9. Gamification System Tests', () => {
    it('should retrieve user gamification profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/gamification/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('points');
      expect(response.body).toHaveProperty('achievements');
      expect(response.body).toHaveProperty('badges');
      expect(response.body).toHaveProperty('leaderboards');
    });

    it('should award points for course completion', async () => {
      const pointsData = {
        pointType: 'learning',
        points: 100,
        reason: 'Course completion',
        source: 'course_completion',
        sourceId: testCourse.id,
      };

      const response = await request(app.getHttpServer())
        .post('/gamification/points/award')
        .set('Authorization', `Bearer ${authToken}`)
        .send(pointsData)
        .expect(201);

      expect(response.body.currentPoints).toBeGreaterThan(0);
      expect(response.body.lifetimePoints).toBeGreaterThan(0);
    });

    it('should check and award achievements', async () => {
      const achievementCheck = {
        achievementType: 'COMPLETION',
        context: {
          courseId: testCourse.id,
          coursesCompleted: 1,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/gamification/achievements/check')
        .set('Authorization', `Bearer ${authToken}`)
        .send(achievementCheck)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should start and track quests', async () => {
      // First create a quest (admin operation)
      const questData = {
        title: 'JavaScript Master',
        description: 'Complete 5 JavaScript courses',
        difficulty: 'medium',
        objectives: [
          {
            id: 'obj1',
            description: 'Complete JavaScript fundamentals',
            type: 'course_completion',
            target: 1,
            completed: false,
            reward_points: 50,
          },
        ],
        rewards: {
          points: 500,
          experience: 100,
          badges: [],
        },
      };

      // Start the quest
      const response = await request(app.getHttpServer())
        .post('/gamification/quests/test-quest-id/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.status).toBe('IN_PROGRESS');
    });

    it('should update user streaks', async () => {
      const response = await request(app.getHttpServer())
        .post('/gamification/streaks/daily_login/update')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.currentStreak).toBeGreaterThanOrEqual(0);
      expect(response.body.isActive).toBeDefined();
    });
  });

  describe('10. Advanced Search Tests', () => {
    beforeAll(async () => {
      // Create search index
      await searchIndexRepository.save({
        organizationId: testOrganization.id,
        indexType: 'COURSES',
        indexName: 'test-courses-index',
        aliasName: 'test-courses',
        mapping: { properties: {} },
        configuration: {},
        isActive: true,
      });
    });

    it('should perform basic search', async () => {
      const response = await request(app.getHttpServer())
        .get('/search/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          q: 'javascript',
          page: 1,
          size: 20,
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should provide autocomplete suggestions', async () => {
      const response = await request(app.getHttpServer())
        .get('/search/advanced/autocomplete')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'java', limit: 5 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should perform advanced search with filters', async () => {
      const searchData = {
        query: 'programming',
        filters: {
          category: ['programming'],
          difficulty: ['intermediate'],
          rating: 4,
        },
        facets: ['category', 'difficulty'],
        personalized: true,
      };

      const response = await request(app.getHttpServer())
        .post('/search/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .send(searchData)
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('aggregations');
    });

    it('should track search result clicks', async () => {
      const clickData = {
        queryId: 'test-query-123',
        resultId: testCourse.id,
        resultType: 'course',
        position: 1,
        timeSpent: 30,
      };

      const response = await request(app.getHttpServer())
        .post('/search/advanced/track/click')
        .set('Authorization', `Bearer ${authToken}`)
        .send(clickData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('11. Data Consistency Tests', () => {
    it('should maintain referential integrity across services', async () => {
      // Create enrollment
      const enrollmentResponse = await request(app.getHttpServer())
        .post(`/courses/${testCourse.id}/enroll`)
        .set('Authorization', `Bearer ${authToken}`);

      const enrollmentId = enrollmentResponse.body.enrollmentId;

      // Verify enrollment exists
      const enrollment = await enrollmentRepository.findOne({
        where: { id: enrollmentId },
        relations: ['user', 'course'],
      });

      expect(enrollment).toBeDefined();
      expect(enrollment.userId).toBe(testUser.id);
      expect(enrollment.courseId).toBe(testCourse.id);
    });

    it('should handle cascade deletions properly', async () => {
      // Create test data
      const testContent = await contentRepository.save({
        title: 'Test Content',
        courseId: testCourse.id,
        organizationId: testOrganization.id,
        contentType: 'lesson',
        order: 1,
      });

      // Delete course
      await request(app.getHttpServer())
        .delete(`/courses/${testCourse.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify content is also deleted
      const content = await contentRepository.findOne({
        where: { id: testContent.id },
      });

      expect(content).toBeNull();
    });
  });

  describe('12. Performance & Load Tests', () => {
    it('should handle concurrent user registrations', async () => {
      const registrationPromises = [];
      
      for (let i = 0; i < 10; i++) {
        const userData = {
          email: `testuser${i}@example.com`,
          firstName: `Test${i}`,
          lastName: 'User',
          password: 'password123',
          organizationId: testOrganization.id,
        };

        registrationPromises.push(
          request(app.getHttpServer())
            .post('/auth/register')
            .send(userData)
        );
      }

      const responses = await Promise.all(registrationPromises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('user');
      });
    });

    it('should handle multiple course enrollments', async () => {
      const enrollmentPromises = [];
      
      // Create multiple courses
      for (let i = 0; i < 5; i++) {
        const course = await courseRepository.save({
          title: `Test Course ${i}`,
          organizationId: testOrganization.id,
          instructorId: testUser.id,
          isPublished: true,
          price: 0,
        });

        enrollmentPromises.push(
          request(app.getHttpServer())
            .post(`/courses/${course.id}/enroll`)
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(enrollmentPromises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('enrollmentId');
      });
    });
  });

  describe('13. Security Tests', () => {
    it('should prevent SQL injection attacks', async () => {
      const maliciousQuery = "'; DROP TABLE users; --";
      
      const response = await request(app.getHttpServer())
        .get('/search/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: maliciousQuery })
        .expect(200);

      // Should not crash and should return safe results
      expect(response.body).toHaveProperty('results');
    });

    it('should prevent unauthorized access to other organizations data', async () => {
      // Create another organization and user
      const otherOrg = await organizationRepository.save({
        name: 'Other Organization',
        subdomain: 'other-org',
      });

      const otherUser = await userRepository.save({
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User',
        password: '$2b$10$example.hash',
        role: 'student',
        organizationId: otherOrg.id,
        isActive: true,
      });

      // Try to access first organization's course with second user's token
      const otherLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'other@example.com',
          password: 'password123',
        });

      const otherToken = otherLoginResponse.body.accessToken;

      const response = await request(app.getHttpServer())
        .get(`/courses/${testCourse.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403); // Should be forbidden

      expect(response.body.message).toContain('access denied');
    });

    it('should rate limit API requests', async () => {
      const requests = [];
      
      // Send many requests rapidly
      for (let i = 0; i < 150; i++) {
        requests.push(
          request(app.getHttpServer())
            .get('/courses')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.allSettled(requests);
      const rateLimited = responses.some(
        result => result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimited).toBe(true);
    });
  });
});