import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import {
  NotificationTemplateEntity,
  NotificationCategory,
  TemplateStatus,
} from '@edutech-lms/database';

export interface CreateNotificationTemplateDto {
  name: string;
  description?: string;
  category: NotificationCategory;
  locale?: string;
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
  smsTemplate?: string;
  pushTemplate?: string;
  variables?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'url';
    description: string;
    required: boolean;
    defaultValue?: any;
  }>;
  metadata?: any;
  isDefault?: boolean;
  createdBy?: string;
}

export interface UpdateNotificationTemplateDto {
  name?: string;
  description?: string;
  status?: TemplateStatus;
  subject?: string;
  htmlTemplate?: string;
  textTemplate?: string;
  smsTemplate?: string;
  pushTemplate?: string;
  variables?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'url';
    description: string;
    required: boolean;
    defaultValue?: any;
  }>;
  metadata?: any;
  isDefault?: boolean;
  updatedBy?: string;
}

export interface TemplateQueryOptions {
  category?: NotificationCategory;
  locale?: string;
  status?: TemplateStatus;
  isDefault?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class NotificationTemplateService {
  private readonly logger = new Logger(NotificationTemplateService.name);

  constructor(
    @InjectRepository(NotificationTemplateEntity)
    private templateRepository: Repository<NotificationTemplateEntity>,
  ) {}

  async createTemplate(createDto: CreateNotificationTemplateDto): Promise<NotificationTemplateEntity> {
    try {
      // Check if a template with the same category, locale, and version exists
      const existingTemplate = await this.templateRepository.findOne({
        where: {
          category: createDto.category,
          locale: createDto.locale || 'en',
          status: TemplateStatus.ACTIVE,
        },
      });

      // If setting as default, ensure no other default exists for this category
      if (createDto.isDefault) {
        await this.unsetOtherDefaults(createDto.category, createDto.locale || 'en');
      }

      // Determine version number
      const version = existingTemplate ? existingTemplate.version + 1 : 1;

      const template = this.templateRepository.create({
        ...createDto,
        locale: createDto.locale || 'en',
        version,
        status: TemplateStatus.ACTIVE,
        variables: createDto.variables || [],
        metadata: createDto.metadata || {},
      });

      const savedTemplate = await this.templateRepository.save(template);
      
      // Archive previous version if exists
      if (existingTemplate) {
        await this.templateRepository.update(
          existingTemplate.id,
          { status: TemplateStatus.ARCHIVED }
        );
      }

      this.logger.log(`Created notification template: ${savedTemplate.name} (${savedTemplate.category})`);
      return savedTemplate;
    } catch (error) {
      this.logger.error('Failed to create notification template:', error);
      throw error;
    }
  }

  async updateTemplate(
    templateId: string,
    updateDto: UpdateNotificationTemplateDto
  ): Promise<NotificationTemplateEntity> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // If setting as default, ensure no other default exists for this category
    if (updateDto.isDefault) {
      await this.unsetOtherDefaults(template.category, template.locale);
    }

    // Merge updates
    Object.assign(template, updateDto);
    template.updatedAt = new Date();

    const savedTemplate = await this.templateRepository.save(template);
    
    this.logger.log(`Updated notification template: ${savedTemplate.name}`);
    return savedTemplate;
  }

  async getTemplates(options: TemplateQueryOptions = {}): Promise<{
    templates: NotificationTemplateEntity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<NotificationTemplateEntity> = {};
    
    if (options.category) where.category = options.category;
    if (options.locale) where.locale = options.locale;
    if (options.status) where.status = options.status;
    if (options.isDefault !== undefined) where.isDefault = options.isDefault;

    const [templates, total] = await this.templateRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    return {
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTemplateById(templateId: string): Promise<NotificationTemplateEntity> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async getTemplateByCategory(
    category: NotificationCategory,
    locale = 'en'
  ): Promise<NotificationTemplateEntity | null> {
    // First try to get the default template for this category and locale
    let template = await this.templateRepository.findOne({
      where: {
        category,
        locale,
        status: TemplateStatus.ACTIVE,
        isDefault: true,
      },
    });

    // If no default found, get any active template for this category and locale
    if (!template) {
      template = await this.templateRepository.findOne({
        where: {
          category,
          locale,
          status: TemplateStatus.ACTIVE,
        },
        order: { version: 'DESC' },
      });
    }

    // If still no template found, try with default locale (en)
    if (!template && locale !== 'en') {
      template = await this.getTemplateByCategory(category, 'en');
    }

    return template;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const template = await this.getTemplateById(templateId);
    
    // Don't allow deletion of default templates
    if (template.isDefault) {
      throw new ConflictException('Cannot delete default template');
    }

    // Archive instead of hard delete
    await this.templateRepository.update(templateId, {
      status: TemplateStatus.ARCHIVED,
    });

    this.logger.log(`Archived notification template: ${template.name}`);
  }

  async duplicateTemplate(
    templateId: string,
    newName: string,
    createdBy?: string
  ): Promise<NotificationTemplateEntity> {
    const originalTemplate = await this.getTemplateById(templateId);

    const duplicateData: CreateNotificationTemplateDto = {
      name: newName,
      description: `Copy of ${originalTemplate.name}`,
      category: originalTemplate.category,
      locale: originalTemplate.locale,
      subject: originalTemplate.subject,
      htmlTemplate: originalTemplate.htmlTemplate,
      textTemplate: originalTemplate.textTemplate,
      smsTemplate: originalTemplate.smsTemplate,
      pushTemplate: originalTemplate.pushTemplate,
      variables: originalTemplate.variables as any,
      metadata: { ...originalTemplate.metadata, originalTemplateId: templateId },
      isDefault: false, // Duplicates are never default
      createdBy,
    };

    return this.createTemplate(duplicateData);
  }

  async renderTemplate(
    templateId: string,
    templateData: Record<string, any>,
    format: 'html' | 'text' | 'sms' | 'push' = 'html'
  ): Promise<{ subject: string; content: string }> {
    const template = await this.getTemplateById(templateId);

    let templateContent: string;
    switch (format) {
      case 'html':
        templateContent = template.htmlTemplate;
        break;
      case 'text':
        templateContent = template.textTemplate;
        break;
      case 'sms':
        templateContent = template.smsTemplate || template.textTemplate;
        break;
      case 'push':
        templateContent = template.pushTemplate || template.textTemplate;
        break;
    }

    const renderedSubject = this.processTemplate(template.subject, templateData);
    const renderedContent = this.processTemplate(templateContent, templateData);

    return {
      subject: renderedSubject,
      content: renderedContent,
    };
  }

  async validateTemplateVariables(
    templateId: string,
    templateData: Record<string, any>
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const template = await this.getTemplateById(templateId);
    const errors: string[] = [];

    if (!template.variables || template.variables.length === 0) {
      return { isValid: true, errors: [] };
    }

    for (const variable of template.variables) {
      const value = templateData[variable.name];

      if (variable.required && (value === undefined || value === null)) {
        errors.push(`Required variable '${variable.name}' is missing`);
        continue;
      }

      if (value !== undefined && value !== null) {
        const isValidType = this.validateVariableType(value, variable.type);
        if (!isValidType) {
          errors.push(`Variable '${variable.name}' must be of type ${variable.type}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private async unsetOtherDefaults(category: NotificationCategory, locale: string): Promise<void> {
    await this.templateRepository.update(
      { category, locale, isDefault: true },
      { isDefault: false }
    );
  }

  private processTemplate(template: string, data: Record<string, any>): string {
    let processed = template;

    // Replace variables in format {{variableName}}
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(regex, String(value || ''));
    }

    // Replace conditional blocks {{#if variable}}...{{/if}}
    processed = processed.replace(
      /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g,
      (match, variable, content) => {
        return data[variable] ? content : '';
      }
    );

    // Replace negative conditional blocks {{#unless variable}}...{{/unless}}
    processed = processed.replace(
      /{{#unless\s+(\w+)}}([\s\S]*?){{\/unless}}/g,
      (match, variable, content) => {
        return !data[variable] ? content : '';
      }
    );

    return processed;
  }

  private validateVariableType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value));
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      default:
        return true;
    }
  }

  // Analytics and stats methods
  async getTemplateUsageStats(templateId?: string): Promise<{
    totalTemplates: number;
    activeTemplates: number;
    templatesByCategory: Record<string, number>;
    templatesByLocale: Record<string, number>;
    mostUsedTemplates: Array<{ templateId: string; name: string; usageCount: number }>;
  }> {
    const totalTemplates = await this.templateRepository.count();
    const activeTemplates = await this.templateRepository.count({
      where: { status: TemplateStatus.ACTIVE },
    });

    // Get templates by category
    const categoryStats = await this.templateRepository
      .createQueryBuilder('template')
      .select('template.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('template.status = :status', { status: TemplateStatus.ACTIVE })
      .groupBy('template.category')
      .getRawMany();

    const templatesByCategory = categoryStats.reduce((acc, stat) => {
      acc[stat.category] = parseInt(stat.count);
      return acc;
    }, {});

    // Get templates by locale
    const localeStats = await this.templateRepository
      .createQueryBuilder('template')
      .select('template.locale', 'locale')
      .addSelect('COUNT(*)', 'count')
      .where('template.status = :status', { status: TemplateStatus.ACTIVE })
      .groupBy('template.locale')
      .getRawMany();

    const templatesByLocale = localeStats.reduce((acc, stat) => {
      acc[stat.locale] = parseInt(stat.count);
      return acc;
    }, {});

    // TODO: Implement actual usage tracking
    const mostUsedTemplates = [];

    return {
      totalTemplates,
      activeTemplates,
      templatesByCategory,
      templatesByLocale,
      mostUsedTemplates,
    };
  }
}