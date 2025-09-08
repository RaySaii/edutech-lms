import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MobileAppConfig,
  Organization,
  DevicePlatform,
} from '@edutech-lms/database';

export interface AppConfigRequest {
  organizationId: string;
  platform: DevicePlatform;
  version: string;
  minVersion: string;
  config: {
    features?: {
      offline_mode?: boolean;
      video_download?: boolean;
      push_notifications?: boolean;
      biometric_auth?: boolean;
      dark_mode?: boolean;
      social_features?: boolean;
      live_streaming?: boolean;
      screen_recording?: boolean;
    };
    limits?: {
      max_offline_courses?: number;
      max_download_size_mb?: number;
      max_video_quality?: string;
      sync_frequency_minutes?: number;
      offline_expiry_days?: number;
    };
    urls?: {
      api_base?: string;
      cdn_base?: string;
      streaming_base?: string;
      support_url?: string;
      privacy_url?: string;
      terms_url?: string;
    };
    theme?: {
      primary_color?: string;
      secondary_color?: string;
      accent_color?: string;
      logo_url?: string;
      splash_image?: string;
    };
    analytics?: {
      enabled?: boolean;
      crash_reporting?: boolean;
      performance_monitoring?: boolean;
      user_tracking?: boolean;
    };
  };
  forceUpdate?: boolean;
  updateMessage?: string;
  downloadUrl?: string;
}

export interface ClientConfigResponse {
  config: any;
  version: string;
  minVersion: string;
  forceUpdate: boolean;
  updateMessage?: string;
  downloadUrl?: string;
  cacheVersion: string;
}

@Injectable()
export class MobileConfigService {
  private readonly logger = new Logger(MobileConfigService.name);

  constructor(
    @InjectRepository(MobileAppConfig)
    private configRepository: Repository<MobileAppConfig>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  async createOrUpdateConfig(configData: AppConfigRequest): Promise<MobileAppConfig> {
    try {
      // Check if config already exists
      let config = await this.configRepository.findOne({
        where: {
          organizationId: configData.organizationId,
          platform: configData.platform,
          version: configData.version,
        },
      });

      if (config) {
        // Update existing config
        Object.assign(config, {
          minVersion: configData.minVersion,
          config: configData.config,
          forceUpdate: configData.forceUpdate || false,
          updateMessage: configData.updateMessage,
          downloadUrl: configData.downloadUrl,
          isActive: true,
        });
      } else {
        // Create new config
        config = this.configRepository.create({
          organizationId: configData.organizationId,
          platform: configData.platform,
          version: configData.version,
          minVersion: configData.minVersion,
          config: configData.config,
          forceUpdate: configData.forceUpdate || false,
          updateMessage: configData.updateMessage,
          downloadUrl: configData.downloadUrl,
          isActive: true,
        });
      }

      const savedConfig = await this.configRepository.save(config);
      
      this.logger.log(`Mobile app config ${config ? 'updated' : 'created'}: ${savedConfig.id}`);
      return savedConfig;
    } catch (error) {
      this.logger.error(`Failed to create/update mobile app config: ${error.message}`);
      throw error;
    }
  }

  async getClientConfig(
    organizationId: string,
    platform: DevicePlatform,
    currentVersion: string
  ): Promise<ClientConfigResponse> {
    try {
      // Get the most recent config for the platform
      const config = await this.configRepository.findOne({
        where: {
          organizationId,
          platform,
          isActive: true,
        },
        order: { createdAt: 'DESC' },
      });

      if (!config) {
        // Return default config if none found
        return this.getDefaultConfig(platform);
      }

      // Check if current version meets minimum requirements
      const forceUpdate = this.shouldForceUpdate(currentVersion, config.minVersion);

      // Merge with organization-specific settings
      const organizationConfig = await this.getOrganizationSpecificConfig(organizationId);
      const mergedConfig = this.mergeConfigs(config.config, organizationConfig);

      return {
        config: mergedConfig,
        version: config.version,
        minVersion: config.minVersion,
        forceUpdate: forceUpdate || config.forceUpdate,
        updateMessage: config.updateMessage,
        downloadUrl: config.downloadUrl,
        cacheVersion: this.generateCacheVersion(config),
      };
    } catch (error) {
      this.logger.error(`Failed to get client config: ${error.message}`);
      throw error;
    }
  }

  async getAllConfigs(organizationId: string): Promise<MobileAppConfig[]> {
    return this.configRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getConfigById(configId: string): Promise<MobileAppConfig> {
    const config = await this.configRepository.findOne({
      where: { id: configId },
    });

    if (!config) {
      throw new NotFoundException(`Config ${configId} not found`);
    }

    return config;
  }

  async deactivateConfig(configId: string): Promise<void> {
    await this.configRepository.update(
      { id: configId },
      { isActive: false }
    );

    this.logger.log(`Mobile app config deactivated: ${configId}`);
  }

  async deleteConfig(configId: string): Promise<void> {
    const result = await this.configRepository.delete({ id: configId });

    if (result.affected === 0) {
      throw new NotFoundException(`Config ${configId} not found`);
    }

    this.logger.log(`Mobile app config deleted: ${configId}`);
  }

  async validateConfig(config: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors = [];
    const warnings = [];

    // Validate required sections
    if (!config.features) {
      warnings.push('Features section is missing');
    }

    if (!config.limits) {
      warnings.push('Limits section is missing');
    }

    if (!config.urls) {
      errors.push('URLs section is required');
    }

    // Validate URLs
    if (config.urls) {
      const urlFields = ['api_base', 'cdn_base', 'streaming_base'];
      for (const field of urlFields) {
        if (config.urls[field] && !this.isValidUrl(config.urls[field])) {
          errors.push(`Invalid URL format for ${field}`);
        }
      }
    }

    // Validate limits
    if (config.limits) {
      if (config.limits.max_offline_courses && config.limits.max_offline_courses < 0) {
        errors.push('max_offline_courses must be positive');
      }

      if (config.limits.max_download_size_mb && config.limits.max_download_size_mb < 1) {
        errors.push('max_download_size_mb must be at least 1');
      }

      if (config.limits.sync_frequency_minutes && config.limits.sync_frequency_minutes < 5) {
        warnings.push('sync_frequency_minutes less than 5 may impact performance');
      }
    }

    // Validate theme colors
    if (config.theme) {
      const colorFields = ['primary_color', 'secondary_color', 'accent_color'];
      for (const field of colorFields) {
        if (config.theme[field] && !this.isValidColor(config.theme[field])) {
          warnings.push(`Invalid color format for ${field}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async getConfigDiff(
    organizationId: string,
    platform: DevicePlatform,
    version1: string,
    version2: string
  ): Promise<{
    added: Record<string, any>;
    modified: Record<string, any>;
    removed: string[];
  }> {
    const [config1, config2] = await Promise.all([
      this.configRepository.findOne({
        where: { organizationId, platform, version: version1 },
      }),
      this.configRepository.findOne({
        where: { organizationId, platform, version: version2 },
      }),
    ]);

    if (!config1 || !config2) {
      throw new NotFoundException('One or both configs not found');
    }

    return this.compareConfigs(config1.config, config2.config);
  }

  async cloneConfig(
    sourceConfigId: string,
    targetPlatform: DevicePlatform,
    newVersion: string
  ): Promise<MobileAppConfig> {
    const sourceConfig = await this.getConfigById(sourceConfigId);

    const clonedConfig = this.configRepository.create({
      organizationId: sourceConfig.organizationId,
      platform: targetPlatform,
      version: newVersion,
      minVersion: sourceConfig.minVersion,
      config: { ...sourceConfig.config },
      forceUpdate: false,
      updateMessage: `Cloned from ${sourceConfig.platform} v${sourceConfig.version}`,
      isActive: true,
    });

    const savedConfig = await this.configRepository.save(clonedConfig);
    
    this.logger.log(`Config cloned: ${sourceConfigId} -> ${savedConfig.id}`);
    return savedConfig;
  }

  // Private helper methods

  private getDefaultConfig(platform: DevicePlatform): ClientConfigResponse {
    const baseConfig = {
      features: {
        offline_mode: true,
        video_download: true,
        push_notifications: true,
        biometric_auth: platform !== DevicePlatform.WEB,
        dark_mode: true,
        social_features: true,
        live_streaming: false,
        screen_recording: false,
      },
      limits: {
        max_offline_courses: 10,
        max_download_size_mb: 500,
        max_video_quality: 'high',
        sync_frequency_minutes: 60,
        offline_expiry_days: 30,
      },
      urls: {
        api_base: process.env.API_BASE_URL || 'http://localhost:3000',
        cdn_base: process.env.CDN_BASE_URL || 'http://localhost:3000/cdn',
        streaming_base: process.env.STREAMING_BASE_URL || 'http://localhost:3000/stream',
        support_url: 'https://support.example.com',
        privacy_url: 'https://example.com/privacy',
        terms_url: 'https://example.com/terms',
      },
      theme: {
        primary_color: '#2563eb',
        secondary_color: '#64748b',
        accent_color: '#f59e0b',
        logo_url: '/images/logo.png',
        splash_image: '/images/splash.png',
      },
      analytics: {
        enabled: true,
        crash_reporting: true,
        performance_monitoring: true,
        user_tracking: false,
      },
    };

    return {
      config: baseConfig,
      version: '1.0.0',
      minVersion: '1.0.0',
      forceUpdate: false,
      cacheVersion: 'default',
    };
  }

  private shouldForceUpdate(currentVersion: string, minVersion: string): boolean {
    // Simple version comparison - in production, use a proper semver library
    const current = this.parseVersion(currentVersion);
    const minimum = this.parseVersion(minVersion);

    if (current.major < minimum.major) return true;
    if (current.major === minimum.major && current.minor < minimum.minor) return true;
    if (current.major === minimum.major && current.minor === minimum.minor && current.patch < minimum.patch) return true;

    return false;
  }

  private parseVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.split('.').map(Number);
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0,
    };
  }

  private async getOrganizationSpecificConfig(organizationId: string): Promise<any> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      return {};
    }

    // Return organization-specific overrides
    return {
      theme: {
        primary_color: organization.settings?.brand_colors?.primary,
        logo_url: organization.settings?.logo_url,
      },
      urls: {
        support_url: organization.settings?.support_url,
        privacy_url: organization.settings?.privacy_url,
        terms_url: organization.settings?.terms_url,
      },
    };
  }

  private mergeConfigs(baseConfig: any, overrideConfig: any): any {
    const merged = { ...baseConfig };

    Object.keys(overrideConfig).forEach(key => {
      if (overrideConfig[key] && typeof overrideConfig[key] === 'object' && !Array.isArray(overrideConfig[key])) {
        merged[key] = { ...merged[key], ...overrideConfig[key] };
      } else if (overrideConfig[key] !== undefined) {
        merged[key] = overrideConfig[key];
      }
    });

    return merged;
  }

  private generateCacheVersion(config: MobileAppConfig): string {
    // Generate a hash based on config content for cache invalidation
    const content = JSON.stringify(config.config) + config.version + config.updatedAt.toISOString();
    return Buffer.from(content).toString('base64').substring(0, 8);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidColor(color: string): boolean {
    // Simple hex color validation
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  private compareConfigs(config1: any, config2: any): {
    added: Record<string, any>;
    modified: Record<string, any>;
    removed: string[];
  } {
    const added = {};
    const modified = {};
    const removed = [];

    // Find added and modified
    Object.keys(config2).forEach(key => {
      if (!(key in config1)) {
        added[key] = config2[key];
      } else if (JSON.stringify(config1[key]) !== JSON.stringify(config2[key])) {
        modified[key] = {
          from: config1[key],
          to: config2[key],
        };
      }
    });

    // Find removed
    Object.keys(config1).forEach(key => {
      if (!(key in config2)) {
        removed.push(key);
      }
    });

    return { added, modified, removed };
  }
}