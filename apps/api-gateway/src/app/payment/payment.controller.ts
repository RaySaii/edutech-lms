import { Controller, Get, Post, Put, Delete, Param, Query, Body, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '@edutech-lms/auth';
import { PaymentService } from './payment.service';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('*')
  async proxyGetRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Query() query: any,
  ) {
    const path = req.path.replace('/api/payments/', '');
    
    this.paymentService.proxyRequest(path, 'GET', null, query)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Payment proxy error:', error.message);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (data) => res.json(data),
        error: (error) => {
          res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.message || 'Payment service unavailable',
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
    const path = req.path.replace('/api/payments/', '');
    
    this.paymentService.proxyRequest(path, 'POST', body, query)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Payment proxy error:', error.message);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (data) => res.json(data),
        error: (error) => {
          res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.message || 'Payment service unavailable',
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
    const path = req.path.replace('/api/payments/', '');
    
    this.paymentService.proxyRequest(path, 'PUT', body, query)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Payment proxy error:', error.message);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (data) => res.json(data),
        error: (error) => {
          res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.message || 'Payment service unavailable',
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
    const path = req.path.replace('/api/payments/', '');
    
    this.paymentService.proxyRequest(path, 'DELETE', null, query)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Payment proxy error:', error.message);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (data) => res.json(data),
        error: (error) => {
          res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.message || 'Payment service unavailable',
          });
        },
      });
  }
}