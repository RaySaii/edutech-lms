import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationPreferenceEntity,
  NotificationType,
  NotificationCategory,
  NotificationFrequency,
} from '@edutech-lms/database';

export interface CreateNotificationPreferenceDto {
  userId: string;
  category: NotificationCategory;
  type: NotificationType;
  enabled?: boolean;
  frequency?: NotificationFrequency;
  customSettings?: any;
}

export interface UpdateNotificationPreferenceDto {
  enabled?: boolean;
  frequency?: NotificationFrequency;
  customSettings?: any;
}

@Injectable()
export class NotificationPreferenceService {
  private readonly logger = new Logger(NotificationPreferenceService.name);

  constructor(
    @InjectRepository(NotificationPreferenceEntity)
    private notificationPreferenceRepository: Repository<NotificationPreferenceEntity>,
  ) {}

  async createDefaultPreferences(userId: string): Promise<NotificationPreferenceEntity[]> {
    const defaultPreferences = this.getDefaultPreferences(userId);
    
    const preferences = await Promise.all(
      defaultPreferences.map(async (pref) => {
        const existingPref = await this.notificationPreferenceRepository.findOne({
          where: {
            userId: pref.userId,
            category: pref.category,
            type: pref.type,
          },
        });

        if (existingPref) {
          return existingPref;
        }

        return this.notificationPreferenceRepository.save(pref);
      })
    );

    this.logger.log(`Created default notification preferences for user ${userId}`);
    return preferences;
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferenceEntity[]> {
    const preferences = await this.notificationPreferenceRepository.find({
      where: { userId },
      order: { category: 'ASC', type: 'ASC' },
    });

    // If no preferences exist, create defaults
    if (preferences.length === 0) {
      return this.createDefaultPreferences(userId);
    }

    return preferences;
  }

  async getUserPreference(
    userId: string,
    category: NotificationCategory,
    type: NotificationType
  ): Promise<NotificationPreferenceEntity | null> {
    return this.notificationPreferenceRepository.findOne({
      where: { userId, category, type },
    });
  }

  async updatePreference(
    userId: string,
    category: NotificationCategory,
    type: NotificationType,
    updateDto: UpdateNotificationPreferenceDto
  ): Promise<NotificationPreferenceEntity> {
    let preference = await this.getUserPreference(userId, category, type);

    if (!preference) {
      // Create new preference if it doesn't exist
      preference = this.notificationPreferenceRepository.create({
        userId,
        category,
        type,
        ...updateDto,
      });
    } else {
      // Update existing preference
      Object.assign(preference, updateDto);
    }

    return this.notificationPreferenceRepository.save(preference);
  }

  async bulkUpdatePreferences(
    userId: string,
    updates: Array<{
      category: NotificationCategory;
      type: NotificationType;
      updates: UpdateNotificationPreferenceDto;
    }>
  ): Promise<NotificationPreferenceEntity[]> {
    const results = await Promise.all(
      updates.map(({ category, type, updates }) =>
        this.updatePreference(userId, category, type, updates)
      )
    );

    this.logger.log(`Bulk updated ${updates.length} preferences for user ${userId}`);
    return results;
  }

  async checkNotificationAllowed(
    userId: string,
    category: NotificationCategory,
    type: NotificationType
  ): Promise<boolean> {
    const preference = await this.getUserPreference(userId, category, type);
    
    if (!preference) {
      // If no preference exists, use defaults
      const defaults = this.getDefaultPreferences(userId);
      const defaultPref = defaults.find(p => p.category === category && p.type === type);
      return defaultPref?.enabled ?? true;
    }

    // Check if notifications are enabled
    if (!preference.enabled) {
      return false;
    }

    // Check frequency restrictions
    if (preference.frequency === NotificationFrequency.NEVER) {
      return false;
    }

    // Check quiet hours if configured
    if (preference.customSettings?.quietHoursStart && preference.customSettings?.quietHoursEnd) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const quietStart = preference.customSettings.quietHoursStart;
      const quietEnd = preference.customSettings.quietHoursEnd;

      if (currentTime >= quietStart && currentTime <= quietEnd) {
        return false;
      }
    }

    return true;
  }

  async getPreferencesByCategory(
    userId: string,
    category: NotificationCategory
  ): Promise<NotificationPreferenceEntity[]> {
    return this.notificationPreferenceRepository.find({
      where: { userId, category },
      order: { type: 'ASC' },
    });
  }

  async getPreferencesByType(
    userId: string,
    type: NotificationType
  ): Promise<NotificationPreferenceEntity[]> {
    return this.notificationPreferenceRepository.find({
      where: { userId, type },
      order: { category: 'ASC' },
    });
  }

  async deleteUserPreferences(userId: string): Promise<void> {
    await this.notificationPreferenceRepository.delete({ userId });
    this.logger.log(`Deleted all notification preferences for user ${userId}`);
  }

  private getDefaultPreferences(userId: string): CreateNotificationPreferenceDto[] {
    const defaults: CreateNotificationPreferenceDto[] = [];

    // Define default preferences for each category and type combination
    const categories = Object.values(NotificationCategory);
    const types = Object.values(NotificationType);

    categories.forEach(category => {
      types.forEach(type => {
        const enabled = this.isEnabledByDefault(category, type);
        const frequency = this.getDefaultFrequency(category, type);

        defaults.push({
          userId,
          category,
          type,
          enabled,
          frequency,
          customSettings: this.getDefaultCustomSettings(category, type),
        });
      });
    });

    return defaults;
  }

  private isEnabledByDefault(category: NotificationCategory, type: NotificationType): boolean {
    // Critical notifications are enabled by default
    const criticalCategories = [
      NotificationCategory.PASSWORD_RESET,
      NotificationCategory.PAYMENT_DUE,
      NotificationCategory.SYSTEM_MAINTENANCE,
    ];

    if (criticalCategories.includes(category)) {
      return true;
    }

    // Email notifications are generally enabled by default
    if (type === NotificationType.EMAIL) {
      return true;
    }

    // SMS notifications are disabled by default (opt-in)
    if (type === NotificationType.SMS) {
      return false;
    }

    // Push notifications are enabled for important categories
    if (type === NotificationType.PUSH) {
      const importantCategories = [
        NotificationCategory.COURSE_ENROLLMENT,
        NotificationCategory.ASSIGNMENT_DUE,
        NotificationCategory.GRADE_AVAILABLE,
      ];
      return importantCategories.includes(category);
    }

    // In-app notifications are enabled by default
    return true;
  }

  private getDefaultFrequency(category: NotificationCategory, type: NotificationType): NotificationFrequency {
    // Critical notifications are immediate
    const criticalCategories = [
      NotificationCategory.PASSWORD_RESET,
      NotificationCategory.PAYMENT_DUE,
      NotificationCategory.ASSIGNMENT_DUE,
    ];

    if (criticalCategories.includes(category)) {
      return NotificationFrequency.IMMEDIATE;
    }

    // Reminders can be daily
    if (category === NotificationCategory.COURSE_REMINDER) {
      return NotificationFrequency.DAILY;
    }

    // Announcements can be weekly
    if (category === NotificationCategory.ANNOUNCEMENT) {
      return NotificationFrequency.WEEKLY;
    }

    return NotificationFrequency.IMMEDIATE;
  }

  private getDefaultCustomSettings(category: NotificationCategory, type: NotificationType): any {
    const defaultSettings: any = {};

    // Set quiet hours for push notifications
    if (type === NotificationType.PUSH) {
      defaultSettings.quietHoursStart = '22:00';
      defaultSettings.quietHoursEnd = '08:00';
      defaultSettings.timezone = 'UTC';
    }

    // Set daily limits for certain categories
    const limitedCategories = [
      NotificationCategory.COURSE_REMINDER,
      NotificationCategory.ANNOUNCEMENT,
    ];

    if (limitedCategories.includes(category)) {
      defaultSettings.maxPerDay = 3;
    }

    return Object.keys(defaultSettings).length > 0 ? defaultSettings : null;
  }
}