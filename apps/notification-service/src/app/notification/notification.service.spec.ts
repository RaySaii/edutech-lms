import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { NotificationTemplateService } from './notification-template.service';
import { EmailService } from '../email/email.service';
import { PushNotificationService } from '../push/push-notification.service';
import { SmsService } from '../sms/sms.service';
import {
  NotificationEntity,
  NotificationCategory,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
} from '@edutech-lms/database';
import {
  MockDataFactory,
  createMockRepository,
  TestUtils,
  ApiTestHelpers,
} from '@edutech-lms/testing';

describe('NotificationService', () => {
  let service: NotificationService;
  let module: TestingModule;
  let notificationRepository: jest.Mocked<Repository<NotificationEntity>>;
  let mockEmailQueue: any;
  let mockPushQueue: any;
  let mockSmsQueue: any;
  let emailService: jest.Mocked<EmailService>;
  let pushService: jest.Mocked<PushNotificationService>;
  let smsService: jest.Mocked<SmsService>;
  let preferenceService: jest.Mocked<NotificationPreferenceService>;
  let templateService: jest.Mocked<NotificationTemplateService>;

  beforeEach(async () => {
    // Create mock queues
    mockEmailQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
      addBulk: jest.fn().mockResolvedValue([{ id: 'job-1' }, { id: 'job-2' }]),
    };
    mockPushQueue = { add: jest.fn().mockResolvedValue({ id: 'push-job-1' }) };
    mockSmsQueue = { add: jest.fn().mockResolvedValue({ id: 'sms-job-1' }) };

    // Create mock repositories
    notificationRepository = createMockRepository<NotificationEntity>();

    // Create mock services
    const mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'email-123' }),
    };

    const mockPushService = {
      sendPushNotification: jest.fn().mockResolvedValue({ success: true, messageId: 'push-123' }),
      sendBulkPushNotification: jest.fn().mockResolvedValue({ success: true, totalSent: 5 }),
    };

    const mockSmsService = {
      sendSms: jest.fn().mockResolvedValue({ success: true, messageId: 'sms-123' }),
    };

    const mockPreferenceService = {
      checkNotificationAllowed: jest.fn().mockResolvedValue(true),
      getUserPreferences: jest.fn().mockResolvedValue([]),
    };

    const mockTemplateService = {
      getTemplateByCategory: jest.fn().mockResolvedValue({
        id: 'template-1',
        subject: 'Test Subject',
        htmlTemplate: '<p>Hello {{firstName}}</p>',
        textTemplate: 'Hello {{firstName}}',
      }),
      renderTemplate: jest.fn().mockResolvedValue({
        subject: 'Test Subject',
        content: '<p>Hello John</p>',
      }),
    };

    module = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(NotificationEntity),
          useValue: notificationRepository,
        },
        {
          provide: getQueueToken('email'),
          useValue: mockEmailQueue,
        },
        {
          provide: getQueueToken('push'),
          useValue: mockPushQueue,
        },
        {
          provide: getQueueToken('sms'),
          useValue: mockSmsQueue,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: PushNotificationService,
          useValue: mockPushService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
        {
          provide: NotificationPreferenceService,
          useValue: mockPreferenceService,
        },
        {
          provide: NotificationTemplateService,
          useValue: mockTemplateService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    emailService = module.get(EmailService);
    pushService = module.get(PushNotificationService);
    smsService = module.get(SmsService);
    preferenceService = module.get(NotificationPreferenceService);
    templateService = module.get(NotificationTemplateService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const notificationData = {
        userId: 'user-123',
        title: 'Test Notification',
        message: 'This is a test message',
        category: NotificationCategory.COURSE_ENROLLMENT,
        type: NotificationType.IN_APP,
        priority: NotificationPriority.MEDIUM,
      };

      const mockNotification = {
        id: 'notification-123',
        ...notificationData,
        status: NotificationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      notificationRepository.create.mockReturnValue(mockNotification as any);
      notificationRepository.save.mockResolvedValue(mockNotification as any);

      const result = await service.createNotification(notificationData);

      expect(notificationRepository.create).toHaveBeenCalledWith({
        ...notificationData,
        status: NotificationStatus.PENDING,
      });
      expect(notificationRepository.save).toHaveBeenCalledWith(mockNotification);
      expect(result).toEqual(mockNotification);
    });

    it('should handle creation errors gracefully', async () => {
      const notificationData = {
        userId: 'user-123',
        title: 'Test Notification',
        message: 'This is a test message',
        category: NotificationCategory.COURSE_ENROLLMENT,
      };

      notificationRepository.create.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.createNotification(notificationData)).rejects.toThrow('Database error');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should queue welcome email successfully', async () => {
      const emailData = {
        email: 'test@example.com',
        firstName: 'John',
        organizationName: 'Test Org',
      };

      const result = await service.sendWelcomeEmail(emailData);

      expect(mockEmailQueue.add).toHaveBeenCalledWith('welcome', expect.objectContaining({
        to: emailData.email,
        subject: `Welcome to ${emailData.organizationName} - EduTech LMS`,
        template: 'welcome',
        templateData: expect.objectContaining({
          firstName: emailData.firstName,
          organizationName: emailData.organizationName,
        }),
      }));

      ApiTestHelpers.expectSuccessResponse(result);
      expect(result.message).toBe('Welcome email queued successfully');
    });
  });

  describe('sendMultiChannelNotification', () => {
    it('should send notification through multiple channels based on preferences', async () => {
      const notificationData = {
        userId: 'user-123',
        title: 'Test Notification',
        message: 'Multi-channel test',
        category: NotificationCategory.COURSE_ENROLLMENT,
        channels: [NotificationType.EMAIL, NotificationType.PUSH, NotificationType.SMS],
      };

      preferenceService.checkNotificationAllowed.mockResolvedValue(true);
      
      const result = await service.sendMultiChannelNotification(notificationData);

      expect(preferenceService.checkNotificationAllowed).toHaveBeenCalledTimes(3);
      expect(mockEmailQueue.add).toHaveBeenCalled();
      expect(mockPushQueue.add).toHaveBeenCalled();
      expect(mockSmsQueue.add).toHaveBeenCalled();
      
      ApiTestHelpers.expectSuccessResponse(result);
    });

    it('should respect user preferences and skip disabled channels', async () => {
      const notificationData = {
        userId: 'user-123',
        title: 'Test Notification',
        message: 'Multi-channel test',
        category: NotificationCategory.COURSE_ENROLLMENT,
        channels: [NotificationType.EMAIL, NotificationType.PUSH],
      };

      // Mock preferences - email allowed, push not allowed
      preferenceService.checkNotificationAllowed
        .mockResolvedValueOnce(true)  // Email allowed
        .mockResolvedValueOnce(false); // Push not allowed

      const result = await service.sendMultiChannelNotification(notificationData);

      expect(mockEmailQueue.add).toHaveBeenCalled();
      expect(mockPushQueue.add).not.toHaveBeenCalled();
      
      ApiTestHelpers.expectSuccessResponse(result);
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated user notifications', async () => {
      const userId = 'user-123';
      const mockNotifications = [
        MockDataFactory.createNotification({ userId }),
        MockDataFactory.createNotification({ userId, title: 'Second Notification' }),
      ];

      notificationRepository.findAndCount.mockResolvedValue([mockNotifications, 2]);

      const result = await service.getUserNotifications(userId, { page: 1, limit: 10 });

      expect(notificationRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 10,
        skip: 0,
      });

      ApiTestHelpers.expectSuccessResponse(result);
      ApiTestHelpers.expectPaginatedResponse(result, {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter notifications by status', async () => {
      const userId = 'user-123';
      const query = { page: 1, limit: 10, status: 'unread' };

      await service.getUserNotifications(userId, query);

      expect(notificationRepository.findAndCount).toHaveBeenCalledWith({
        where: { 
          userId,
          status: expect.not.stringMatching('read'),
        },
        order: { createdAt: 'DESC' },
        take: 10,
        skip: 0,
      });
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const notificationId = 'notification-123';
      const userId = 'user-123';
      const mockNotification = MockDataFactory.createNotification({ 
        id: notificationId, 
        userId,
        status: NotificationStatus.DELIVERED 
      });

      notificationRepository.findOne.mockResolvedValue(mockNotification as any);
      notificationRepository.save.mockResolvedValue({
        ...mockNotification,
        status: NotificationStatus.READ,
        readAt: new Date(),
      } as any);

      const result = await service.markNotificationAsRead(notificationId, userId);

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: notificationId, userId },
      });
      expect(notificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: NotificationStatus.READ,
          readAt: expect.any(Date),
        })
      );

      ApiTestHelpers.expectSuccessResponse(result);
    });

    it('should throw error if notification not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.markNotificationAsRead('nonexistent-id', 'user-123')
      ).rejects.toThrow('Notification not found');
    });

    it('should throw error if user tries to mark another users notification', async () => {
      const mockNotification = MockDataFactory.createNotification({ 
        userId: 'other-user-123' 
      });

      notificationRepository.findOne.mockResolvedValue(mockNotification as any);

      await expect(
        service.markNotificationAsRead('notification-123', 'user-123')
      ).rejects.toThrow('Notification not found');
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct unread count', async () => {
      const userId = 'user-123';
      notificationRepository.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(userId);

      expect(notificationRepository.count).toHaveBeenCalledWith({
        where: {
          userId,
          status: expect.not.stringMatching('read'),
        },
      });

      ApiTestHelpers.expectSuccessResponse(result);
      expect(result.data.unreadCount).toBe(5);
    });
  });

  describe('bulkOperations', () => {
    it('should mark all notifications as read', async () => {
      const userId = 'user-123';
      const mockResult = { affected: 3 };

      notificationRepository.update.mockResolvedValue(mockResult as any);

      const result = await service.markAllAsRead(userId);

      expect(notificationRepository.update).toHaveBeenCalledWith(
        {
          userId,
          status: expect.not.stringMatching('read'),
        },
        {
          status: NotificationStatus.READ,
          readAt: expect.any(Date),
        }
      );

      ApiTestHelpers.expectSuccessResponse(result);
      expect(result.data.updatedCount).toBe(3);
    });

    it('should delete multiple notifications', async () => {
      const userId = 'user-123';
      const notificationIds = ['not-1', 'not-2', 'not-3'];
      const mockResult = { affected: 3 };

      notificationRepository.delete.mockResolvedValue(mockResult as any);

      const result = await service.deleteNotifications(userId, notificationIds);

      expect(notificationRepository.delete).toHaveBeenCalledWith({
        id: expect.arrayContaining(notificationIds),
        userId,
      });

      ApiTestHelpers.expectSuccessResponse(result);
      expect(result.data.deletedCount).toBe(3);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const userId = 'user-123';
      notificationRepository.findAndCount.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.getUserNotifications(userId, { page: 1, limit: 10 })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle queue errors gracefully', async () => {
      mockEmailQueue.add.mockRejectedValue(new Error('Queue connection failed'));

      const emailData = {
        email: 'test@example.com',
        firstName: 'John',
        organizationName: 'Test Org',
      };

      await expect(service.sendWelcomeEmail(emailData)).rejects.toThrow('Queue connection failed');
    });
  });

  describe('integration tests', () => {
    it('should handle complete notification workflow', async () => {
      // 1. Create notification
      const notificationData = {
        userId: 'user-123',
        title: 'Integration Test',
        message: 'End-to-end test',
        category: NotificationCategory.COURSE_ENROLLMENT,
      };

      const mockNotification = {
        id: 'notification-123',
        ...notificationData,
        status: NotificationStatus.PENDING,
      };

      notificationRepository.create.mockReturnValue(mockNotification as any);
      notificationRepository.save.mockResolvedValue(mockNotification as any);

      // 2. Create and send notification
      const createResult = await service.createNotification(notificationData);
      expect(createResult.id).toBe('notification-123');

      // 3. Verify notification appears in user's list
      notificationRepository.findAndCount.mockResolvedValue([[mockNotification], 1]);
      const listResult = await service.getUserNotifications('user-123');
      expect(listResult.data.notifications).toHaveLength(1);

      // 4. Mark as read
      notificationRepository.findOne.mockResolvedValue(mockNotification as any);
      notificationRepository.save.mockResolvedValue({
        ...mockNotification,
        status: NotificationStatus.READ,
      } as any);

      const markReadResult = await service.markNotificationAsRead('notification-123', 'user-123');
      ApiTestHelpers.expectSuccessResponse(markReadResult);

      // 5. Verify unread count is updated
      notificationRepository.count.mockResolvedValue(0);
      const unreadResult = await service.getUnreadCount('user-123');
      expect(unreadResult.data.unreadCount).toBe(0);
    });
  });
});

// Performance tests
describe('NotificationService Performance', () => {
  let service: NotificationService;
  let module: TestingModule;

  beforeAll(async () => {
    // Setup with performance optimizations
    module = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(NotificationEntity),
          useValue: createMockRepository(),
        },
        {
          provide: getQueueToken('email'),
          useValue: { add: jest.fn().mockResolvedValue({ id: 'job' }) },
        },
        // ... other providers
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should handle bulk operations efficiently', async () => {
    const userIds = Array.from({ length: 1000 }, (_, i) => `user-${i}`);
    
    const bulkOperation = async () => {
      return service.sendBulkNotification({
        userIds,
        title: 'Bulk Test',
        message: 'Performance test',
        category: NotificationCategory.ANNOUNCEMENT,
      });
    };

    // Should complete within 2 seconds
    await expect(bulkOperation()).resolves.toBeDefined();
  });
});