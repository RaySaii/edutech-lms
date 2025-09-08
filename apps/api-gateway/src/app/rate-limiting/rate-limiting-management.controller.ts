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
import { RateLimitingService } from '@edutech-lms/common';

@ApiTags('Rate Limiting Management')
@Controller('rate-limiting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class RateLimitingManagementController {
  private readonly logger = new Logger(RateLimitingManagementController.name);

  constructor(private readonly rateLimitingService: RateLimitingService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get global rate limiting statistics' })
  @ApiResponse({
    status: 200,
    description: 'Rate limiting statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            totalKeys: { type: 'number' },
            activeWindows: { type: 'number' },
            totalRequests: { type: 'number' },
          },
        },
      },
    },
  })
  async getRateLimitingStats(@CurrentUser() user: any) {
    this.logger.log(`Rate limiting stats requested by user: ${user.id}`);
    
    const stats = await this.rateLimitingService.getGlobalRateLimitStats();
    
    return {
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString(),
        requestedBy: user.id,
      },
    };
  }

  @Get('info/:key')
  @ApiOperation({ summary: 'Get rate limit information for a specific key' })
  @ApiQuery({ name: 'windowMs', required: false, description: 'Rate limit window in milliseconds' })
  @ApiResponse({ status: 200, description: 'Rate limit information retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Rate limit information not found' })
  async getRateLimitInfo(
    @Param('key') key: string,
    @CurrentUser() user: any,
    @Query('windowMs') windowMs = 60000,
  ) {
    this.logger.log(`Rate limit info requested for key: ${key} by user: ${user.id}`);
    
    const rateLimitInfo = await this.rateLimitingService.getRateLimitInfo(key, Number(windowMs));
    
    if (!rateLimitInfo) {
      return {
        success: false,
        message: `No rate limit information found for key: ${key}`,
      };
    }
    
    return {
      success: true,
      data: {
        key,
        ...rateLimitInfo,
        retrievedAt: new Date().toISOString(),
      },
    };
  }

  @Delete('reset/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset rate limit for a specific key' })
  @ApiResponse({ status: 200, description: 'Rate limit reset successfully' })
  async resetRateLimit(
    @Param('key') key: string,
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Rate limit reset requested for key: ${key} by user: ${user.id}`);
    
    await this.rateLimitingService.resetRateLimit(key);
    
    return {
      success: true,
      message: `Rate limit reset for key: ${key}`,
      data: {
        key,
        resetAt: new Date().toISOString(),
        resetBy: user.id,
      },
    };
  }

  @Get('presets')
  @ApiOperation({ summary: 'Get available rate limiting presets' })
  @ApiResponse({ status: 200, description: 'Rate limiting presets retrieved successfully' })
  async getRateLimitingPresets() {
    const presets = {
      AUTH_LOGIN: {
        description: 'Login endpoint rate limiting',
        windowMs: 15 * 60 * 1000,
        maxRequests: 5,
        keyGenerator: 'ip',
      },
      AUTH_REGISTER: {
        description: 'Registration endpoint rate limiting',
        windowMs: 60 * 60 * 1000,
        maxRequests: 3,
        keyGenerator: 'ip',
      },
      PASSWORD_RESET: {
        description: 'Password reset endpoint rate limiting',
        windowMs: 60 * 60 * 1000,
        maxRequests: 3,
        keyGenerator: 'ip',
      },
      API_GENERAL: {
        description: 'General API endpoint rate limiting',
        windowMs: 60 * 1000,
        maxRequests: 100,
        keyGenerator: 'user',
        roleBasedLimits: {
          STUDENT: { windowMs: 60 * 1000, maxRequests: 60 },
          TEACHER: { windowMs: 60 * 1000, maxRequests: 120 },
          ADMIN: { windowMs: 60 * 1000, maxRequests: 300 },
          SUPER_ADMIN: { windowMs: 60 * 1000, maxRequests: 1000 },
        },
      },
      FILE_UPLOAD: {
        description: 'File upload endpoint rate limiting',
        windowMs: 60 * 1000,
        maxRequests: 10,
        keyGenerator: 'user',
        roleBasedLimits: {
          STUDENT: { windowMs: 60 * 1000, maxRequests: 5 },
          TEACHER: { windowMs: 60 * 1000, maxRequests: 20 },
          ADMIN: { windowMs: 60 * 1000, maxRequests: 50 },
        },
      },
      SEARCH: {
        description: 'Search endpoint rate limiting',
        windowMs: 60 * 1000,
        maxRequests: 30,
        keyGenerator: 'user',
      },
    };

    return {
      success: true,
      data: {
        presets,
        totalPresets: Object.keys(presets).length,
        retrievedAt: new Date().toISOString(),
      },
    };
  }

  @Post('test')
  @ApiOperation({ summary: 'Test rate limiting configuration' })
  @ApiResponse({ status: 200, description: 'Rate limiting test completed' })
  async testRateLimit(
    @Body() body: {
      key: string;
      windowMs: number;
      maxRequests: number;
      testRequests: number;
    },
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Rate limiting test requested by user: ${user.id}`, body);
    
    const results = [];
    const testKey = `test:${body.key}:${Date.now()}`;
    
    try {
      // Simulate multiple requests
      for (let i = 0; i < body.testRequests; i++) {
        const result = await this.rateLimitingService.checkRateLimit(testKey, {
          windowMs: body.windowMs,
          maxRequests: body.maxRequests,
        });
        
        results.push({
          requestNumber: i + 1,
          allowed: result.allowed,
          remainingRequests: result.rateLimitInfo.remainingRequests,
          totalRequests: result.rateLimitInfo.totalRequests,
          resetTime: result.rateLimitInfo.resetTime,
        });

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Clean up test key
      await this.rateLimitingService.resetRateLimit(testKey);

      return {
        success: true,
        message: `Rate limiting test completed for key: ${body.key}`,
        data: {
          testKey,
          config: {
            windowMs: body.windowMs,
            maxRequests: body.maxRequests,
            testRequests: body.testRequests,
          },
          results,
          summary: {
            totalRequests: body.testRequests,
            allowedRequests: results.filter(r => r.allowed).length,
            blockedRequests: results.filter(r => !r.allowed).length,
          },
          testedAt: new Date().toISOString(),
          testedBy: user.id,
        },
      };
    } catch (error) {
      this.logger.error('Rate limiting test failed:', error);
      
      return {
        success: false,
        message: 'Rate limiting test failed',
        error: error.message,
      };
    }
  }

  @Get('active-limits')
  @ApiOperation({ summary: 'Get currently active rate limits' })
  @ApiResponse({ status: 200, description: 'Active rate limits retrieved successfully' })
  async getActiveLimits(@CurrentUser() user: any) {
    this.logger.log(`Active rate limits requested by user: ${user.id}`);
    
    // This would require scanning the cache for active rate limit keys
    // For now, return a mock response indicating the feature is not fully implemented
    return {
      success: true,
      message: 'Active rate limits feature requires Redis SCAN implementation',
      data: {
        activeLimits: [],
        totalActive: 0,
        note: 'This feature requires implementing Redis key scanning functionality',
        retrievedAt: new Date().toISOString(),
      },
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check rate limiting system health' })
  @ApiResponse({ status: 200, description: 'Rate limiting health status' })
  async getRateLimitingHealth() {
    try {
      // Test rate limiting system
      const testKey = `health-check:${Date.now()}`;
      const testConfig = {
        windowMs: 60000,
        maxRequests: 5,
      };
      
      const result = await this.rateLimitingService.checkRateLimit(testKey, testConfig);
      await this.rateLimitingService.resetRateLimit(testKey);
      
      const isHealthy = result.allowed;
      
      return {
        success: true,
        data: {
          healthy: isHealthy,
          status: isHealthy ? 'UP' : 'DOWN',
          lastChecked: new Date().toISOString(),
          testResult: {
            allowed: result.allowed,
            rateLimitInfo: result.rateLimitInfo,
          },
          details: {
            cacheConnected: true, // Would check cache connection
            rateLimitingEnabled: true,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        data: {
          healthy: false,
          status: 'DOWN',
          error: error.message,
          lastChecked: new Date().toISOString(),
        },
      };
    }
  }
}