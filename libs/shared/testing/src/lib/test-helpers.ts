import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExecutionContext } from '@nestjs/common';

// Mock data factories
export class MockDataFactory {
  static createUser(overrides: Partial<any> = {}) {
    return {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'student',
      organizationId: 'test-org-id',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createCourse(overrides: Partial<any> = {}) {
    return {
      id: 'test-course-id',
      title: 'Test Course',
      description: 'A test course description',
      shortDescription: 'Test course',
      slug: 'test-course',
      status: 'published',
      level: 'beginner',
      price: 99.99,
      organizationId: 'test-org-id',
      instructorId: 'test-instructor-id',
      enrollmentCount: 0,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createNotification(overrides: Partial<any> = {}) {
    return {
      id: 'test-notification-id',
      userId: 'test-user-id',
      title: 'Test Notification',
      message: 'This is a test notification',
      type: 'in_app',
      status: 'pending',
      priority: 'medium',
      category: 'course_enrollment',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createEnrollment(overrides: Partial<any> = {}) {
    return {
      id: 'test-enrollment-id',
      userId: 'test-user-id',
      courseId: 'test-course-id',
      enrolledAt: new Date(),
      status: 'active',
      progress: 0,
      completedAt: null,
      ...overrides,
    };
  }
}

// Mock services
export class MockJwtService {
  sign = jest.fn().mockReturnValue('mock-jwt-token');
  verify = jest.fn().mockReturnValue({ sub: 'test-user-id', email: 'test@example.com', role: 'student' });
  decode = jest.fn().mockReturnValue({ sub: 'test-user-id', email: 'test@example.com' });
}

export class MockConfigService {
  get = jest.fn().mockImplementation((key: string) => {
    const config = {
      JWT_ACCESS_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_ACCESS_EXPIRES: '15m',
      JWT_REFRESH_EXPIRES: '7d',
      DATABASE_URL: 'sqlite::memory:',
      REDIS_URL: 'redis://localhost:6379',
    };
    return config[key];
  });
}

// Mock repository factory
export function createMockRepository<T = any>(): jest.Mocked<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getManyAndCount: jest.fn(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
    })),
    manager: {
      transaction: jest.fn(),
    },
  } as any;
}

// Test utilities
export class TestUtils {
  static createTestingModule(providers: any[] = []): Promise<TestingModule> {
    return Test.createTestingModule({
      providers: [
        {
          provide: JwtService,
          useClass: MockJwtService,
        },
        {
          provide: ConfigService,
          useClass: MockConfigService,
        },
        ...providers,
      ],
    }).compile();
  }

  static mockAuthGuard(user: any = MockDataFactory.createUser()) {
    return {
      canActivate: jest.fn((context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest();
        request.user = user;
        return true;
      }),
    };
  }

  static mockPermissionsGuard() {
    return {
      canActivate: jest.fn().mockReturnValue(true),
    };
  }

  static createMockExecutionContext(user: any = MockDataFactory.createUser()): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          headers: {},
          query: {},
          params: {},
          body: {},
        }),
        getResponse: () => ({
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
          send: jest.fn().mockReturnThis(),
        }),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as any;
  }

  static async waitFor(condition: () => boolean | Promise<boolean>, timeout = 5000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static mockDate(date: string | Date = new Date()) {
    const mockDate = new Date(date);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    return mockDate;
  }

  static restoreDate() {
    jest.restoreAllMocks();
  }
}

// Custom matchers
export const customMatchers = {
  toBeValidUUID: (received: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid UUID`,
      pass,
    };
  },

  toBeValidEmail: (received: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid email`,
      pass,
    };
  },

  toBeWithinTimeRange: (received: Date, expected: Date, rangeMs = 1000) => {
    const diff = Math.abs(received.getTime() - expected.getTime());
    const pass = diff <= rangeMs;
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be within ${rangeMs}ms of ${expected}`,
      pass,
    };
  },
};

// API response helpers
export class ApiTestHelpers {
  static expectSuccessResponse(response: any, expectedData?: any) {
    expect(response).toHaveProperty('success', true);
    expect(response).toHaveProperty('data');
    if (expectedData) {
      expect(response.data).toMatchObject(expectedData);
    }
  }

  static expectErrorResponse(response: any, expectedMessage?: string, expectedCode?: string) {
    expect(response).toHaveProperty('success', false);
    expect(response).toHaveProperty('error');
    if (expectedMessage) {
      expect(response.error.message).toContain(expectedMessage);
    }
    if (expectedCode) {
      expect(response.error.code).toBe(expectedCode);
    }
  }

  static expectPaginatedResponse(response: any, expectedPageInfo?: any) {
    expect(response).toHaveProperty('success', true);
    expect(response).toHaveProperty('data');
    expect(response.data).toHaveProperty('pagination');
    
    const pagination = response.data.pagination;
    expect(pagination).toHaveProperty('page');
    expect(pagination).toHaveProperty('limit');
    expect(pagination).toHaveProperty('total');
    expect(pagination).toHaveProperty('totalPages');
    expect(pagination).toHaveProperty('hasNext');
    expect(pagination).toHaveProperty('hasPrev');

    if (expectedPageInfo) {
      expect(pagination).toMatchObject(expectedPageInfo);
    }
  }
}

// Performance testing helpers
export class PerformanceTestHelpers {
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return { result, duration: end - start };
  }

  static async expectExecutionTime<T>(
    fn: () => Promise<T>,
    maxDuration: number,
    description?: string
  ): Promise<T> {
    const { result, duration } = await this.measureExecutionTime(fn);
    expect(duration).toBeLessThan(maxDuration);
    if (description) {
      console.log(`${description}: ${duration.toFixed(2)}ms`);
    }
    return result;
  }

  static createLoadTest(operation: () => Promise<any>, concurrency = 10) {
    return async () => {
      const promises = Array.from({ length: concurrency }, () => operation());
      return Promise.all(promises);
    };
  }
}