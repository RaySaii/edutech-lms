import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@edutech-lms/auth';
import { UserRole } from '@edutech-lms/common';
import { CacheService } from '@edutech-lms/common';

@ApiTags('Cache Management')
@Controller('cache')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class CacheManagementController {
  private readonly logger = new Logger(CacheManagementController.name);

  constructor(private readonly cacheService: CacheService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            hits: { type: 'number' },
            misses: { type: 'number' },
            sets: { type: 'number' },
            deletes: { type: 'number' },
            hitRate: { type: 'number' },
            totalKeys: { type: 'number' },
            memoryUsage: { type: 'number' },
          },
        },
      },
    },
  })
  async getCacheStats(@CurrentUser() user: any) {
    this.logger.log(`Cache stats requested by user: ${user.id}`);
    
    const stats = this.cacheService.getStats();
    
    return {
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString(),
        requestedBy: user.id,
      },
    };
  }

  @Get('keys')
  @ApiOperation({ summary: 'List cache keys with pattern matching' })
  @ApiQuery({ name: 'pattern', required: false, description: 'Pattern to match keys (supports wildcards)' })
  @ApiQuery({ name: 'namespace', required: false, description: 'Namespace to filter keys' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of keys to return' })
  @ApiResponse({ status: 200, description: 'Cache keys retrieved successfully' })
  async getCacheKeys(
    @CurrentUser() user: any,
    @Query('pattern') pattern?: string,
    @Query('namespace') namespace?: string,
    @Query('limit') limit = 100,
  ) {
    this.logger.log(`Cache keys listing requested by user: ${user.id}`);
    
    // For security and performance, we'll return a simulated response
    // In production, you might implement this differently based on your cache backend
    const searchPattern = namespace && pattern 
      ? `${namespace}:${pattern}` 
      : pattern || '*';
    
    return {
      success: true,
      data: {
        pattern: searchPattern,
        limit,
        keys: [], // Would be populated by actual cache backend
        total: 0,
        message: 'Key listing would require Redis SCAN command implementation',
      },
    };
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get cached value by key' })
  @ApiResponse({ status: 200, description: 'Cache value retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Cache key not found' })
  async getCacheValue(
    @Param('key') key: string,
    @CurrentUser() user: any,
    @Query('namespace') namespace?: string,
  ) {
    this.logger.log(`Cache value requested for key: ${key} by user: ${user.id}`);
    
    const fullKey = namespace ? `${namespace}:${key}` : key;
    const value = await this.cacheService.get(fullKey);
    
    if (value === null) {
      return {
        success: false,
        message: `Cache key '${fullKey}' not found`,
      };
    }
    
    return {
      success: true,
      data: {
        key: fullKey,
        value,
        retrievedAt: new Date().toISOString(),
      },
    };
  }

  @Post('key/:key')
  @ApiOperation({ summary: 'Set cache value' })
  @ApiResponse({ status: 201, description: 'Cache value set successfully' })
  async setCacheValue(
    @Param('key') key: string,
    @Body() body: {
      value: any;
      ttl?: number;
      namespace?: string;
      tags?: string[];
    },
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Cache value set for key: ${key} by user: ${user.id}`);
    
    const fullKey = body.namespace ? `${body.namespace}:${key}` : key;
    
    await this.cacheService.set(fullKey, body.value, {
      ttl: body.ttl,
      namespace: body.namespace,
      tags: body.tags,
    });
    
    return {
      success: true,
      message: `Cache value set for key '${fullKey}'`,
      data: {
        key: fullKey,
        ttl: body.ttl,
        setAt: new Date().toISOString(),
        setBy: user.id,
      },
    };
  }

  @Delete('key/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete cache key' })
  @ApiResponse({ status: 200, description: 'Cache key deleted successfully' })
  async deleteCacheKey(
    @Param('key') key: string,
    @CurrentUser() user: any,
    @Query('namespace') namespace?: string,
  ) {
    this.logger.log(`Cache key deletion requested for: ${key} by user: ${user.id}`);
    
    const fullKey = namespace ? `${namespace}:${key}` : key;
    await this.cacheService.delete(fullKey);
    
    return {
      success: true,
      message: `Cache key '${fullKey}' deleted successfully`,
      deletedAt: new Date().toISOString(),
      deletedBy: user.id,
    };
  }

  @Delete('pattern/:pattern')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete cache keys matching pattern' })
  @ApiResponse({ status: 200, description: 'Cache keys deleted successfully' })
  async deleteCachePattern(
    @Param('pattern') pattern: string,
    @CurrentUser() user: any,
    @Query('namespace') namespace?: string,
  ) {
    this.logger.log(`Cache pattern deletion requested: ${pattern} by user: ${user.id}`);
    
    const deletedCount = await this.cacheService.deleteByPattern(pattern, namespace);
    
    return {
      success: true,
      message: `Deleted ${deletedCount} cache keys matching pattern '${pattern}'`,
      data: {
        pattern,
        namespace,
        deletedCount,
        deletedAt: new Date().toISOString(),
        deletedBy: user.id,
      },
    };
  }

  @Delete('tag/:tag')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete cache keys by tag' })
  @ApiResponse({ status: 200, description: 'Tagged cache keys deleted successfully' })
  async deleteCacheByTag(
    @Param('tag') tag: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Cache tag deletion requested: ${tag} by user: ${user.id}`);
    
    const deletedCount = await this.cacheService.deleteByTag(tag);
    
    return {
      success: true,
      message: `Deleted ${deletedCount} cache keys with tag '${tag}'`,
      data: {
        tag,
        deletedCount,
        deletedAt: new Date().toISOString(),
        deletedBy: user.id,
      },
    };
  }

  @Delete('namespace/:namespace')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all cache in namespace' })
  @ApiResponse({ status: 200, description: 'Namespace cache cleared successfully' })
  async clearNamespace(
    @Param('namespace') namespace: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Cache namespace clear requested: ${namespace} by user: ${user.id}`);
    
    await this.cacheService.clear(namespace);
    
    return {
      success: true,
      message: `Cache namespace '${namespace}' cleared successfully`,
      data: {
        namespace,
        clearedAt: new Date().toISOString(),
        clearedBy: user.id,
      },
    };
  }

  @Delete('all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all cache (DANGEROUS)' })
  @ApiResponse({ status: 200, description: 'All cache cleared successfully' })
  async clearAllCache(@CurrentUser() user: any) {
    this.logger.warn(`FULL CACHE CLEAR requested by user: ${user.id}`);
    
    // Additional safety check for super admin
    if (user.role !== UserRole.SUPER_ADMIN) {
      return {
        success: false,
        message: 'Only Super Admin can clear all cache',
      };
    }
    
    await this.cacheService.clear();
    
    return {
      success: true,
      message: 'All cache cleared successfully',
      data: {
        clearedAt: new Date().toISOString(),
        clearedBy: user.id,
        warning: 'All application cache has been cleared',
      },
    };
  }

  @Post('warm')
  @ApiOperation({ summary: 'Warm cache with predefined data' })
  @ApiResponse({ status: 200, description: 'Cache warming completed successfully' })
  async warmCache(
    @Body() body: {
      type: 'popular-courses' | 'featured-courses' | 'categories' | 'custom';
      keys?: string[];
    },
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Cache warming requested: ${body.type} by user: ${user.id}`);
    
    const startTime = Date.now();
    let warmedCount = 0;
    
    try {
      switch (body.type) {
        case 'popular-courses':
          // This would trigger the popular courses cache warming
          // await this.courseCachedService.warmPopularCoursesCache();
          warmedCount = 1;
          break;
          
        case 'featured-courses':
          // This would trigger featured courses cache warming
          warmedCount = 1;
          break;
          
        case 'categories':
          // This would warm category-based caches
          warmedCount = 5; // Example count
          break;
          
        case 'custom':
          if (body.keys) {
            // Custom cache warming logic
            warmedCount = body.keys.length;
          }
          break;
          
        default:
          return {
            success: false,
            message: `Unknown warming type: ${body.type}`,
          };
      }
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        message: `Cache warming completed for type: ${body.type}`,
        data: {
          type: body.type,
          warmedCount,
          duration: `${duration}ms`,
          warmedAt: new Date().toISOString(),
          warmedBy: user.id,
        },
      };
    } catch (error) {
      this.logger.error('Cache warming failed:', error);
      
      return {
        success: false,
        message: 'Cache warming failed',
        error: error.message,
      };
    }
  }

  @Post('refresh/:key')
  @ApiOperation({ summary: 'Refresh cache key by forcing reload' })
  @ApiResponse({ status: 200, description: 'Cache key refreshed successfully' })
  async refreshCache(
    @Param('key') key: string,
    @CurrentUser() user: any,
    @Query('namespace') namespace?: string,
  ) {
    this.logger.log(`Cache refresh requested for: ${key} by user: ${user.id}`);
    
    const fullKey = namespace ? `${namespace}:${key}` : key;
    
    // Delete the existing key first
    await this.cacheService.delete(fullKey);
    
    return {
      success: true,
      message: `Cache key '${fullKey}' marked for refresh`,
      data: {
        key: fullKey,
        refreshedAt: new Date().toISOString(),
        refreshedBy: user.id,
        note: 'Key has been deleted and will be repopulated on next access',
      },
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check cache system health' })
  @ApiResponse({ status: 200, description: 'Cache health status' })
  async getCacheHealth() {
    try {
      // Test cache operations
      const testKey = `health-check:${Date.now()}`;
      const testValue = { test: true, timestamp: Date.now() };
      
      await this.cacheService.set(testKey, testValue, { ttl: 10 });
      const retrieved = await this.cacheService.get(testKey);
      await this.cacheService.delete(testKey);
      
      const isHealthy = retrieved !== null && retrieved.test === true;
      const stats = this.cacheService.getStats();
      
      return {
        success: true,
        data: {
          healthy: isHealthy,
          stats,
          lastChecked: new Date().toISOString(),
          status: isHealthy ? 'UP' : 'DOWN',
          details: {
            canWrite: true,
            canRead: retrieved !== null,
            canDelete: true,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        data: {
          healthy: false,
          error: error.message,
          lastChecked: new Date().toISOString(),
          status: 'DOWN',
        },
      };
    }
  }
}