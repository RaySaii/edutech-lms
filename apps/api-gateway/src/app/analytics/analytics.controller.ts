import { Controller, Get, Post, Put, Delete, Param, Query, Body, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '@edutech-lms/auth';
import { AnalyticsService } from './analytics.service';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('*')
  async proxyGetRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: any,
  ) {
    const path = req.path.replace('/api/analytics/', '');
    
    this.analyticsService.proxyRequest(path, 'GET', null, query)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Analytics proxy error:', error.message);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (data) => res.json(data),
        error: (error) => {
          res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.message || 'Analytics service unavailable',
          });
        },
      });
  }

  @Post('*')
  async proxyPostRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
    @Query() query: any,
  ) {
    const path = req.path.replace('/api/analytics/', '');
    
    this.analyticsService.proxyRequest(path, 'POST', body, query)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Analytics proxy error:', error.message);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (data) => res.json(data),
        error: (error) => {
          res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.message || 'Analytics service unavailable',
          });
        },
      });
  }

  @Put('*')
  async proxyPutRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
    @Query() query: any,
  ) {
    const path = req.path.replace('/api/analytics/', '');
    
    this.analyticsService.proxyRequest(path, 'PUT', body, query)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Analytics proxy error:', error.message);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (data) => res.json(data),
        error: (error) => {
          res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.message || 'Analytics service unavailable',
          });
        },
      });
  }

  @Delete('*')
  async proxyDeleteRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: any,
  ) {
    const path = req.path.replace('/api/analytics/', '');
    
    this.analyticsService.proxyRequest(path, 'DELETE', null, query)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Analytics proxy error:', error.message);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (data) => res.json(data),
        error: (error) => {
          res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.message || 'Analytics service unavailable',
          });
        },
      });
  }
}