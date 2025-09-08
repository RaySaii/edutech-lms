import { Controller, All, Req, Res, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import axios from 'axios';

@ApiTags('Content Management Proxy')
@Controller('content-management')
export class ContentManagementController {
  private readonly logger = new Logger(ContentManagementController.name);
  private readonly contentServiceUrl: string;

  constructor() {
    this.contentServiceUrl = process.env.CONTENT_SERVICE_HOST 
      ? `http://${process.env.CONTENT_SERVICE_HOST}:${process.env.CONTENT_SERVICE_PORT || 3004}`
      : 'http://localhost:3004';
  }

  @All('*')
  @ApiOperation({ summary: 'Proxy requests to Content Management Service' })
  async proxyToContentManagement(@Req() req: Request, @Res() res: Response) {
    try {
      const targetUrl = `${this.contentServiceUrl}/content-management${req.url}`;
      
      this.logger.debug(`Proxying ${req.method} request to: ${targetUrl}`);

      const config = {
        method: req.method.toLowerCase(),
        url: targetUrl,
        headers: {
          ...req.headers,
          host: undefined, // Remove host header to avoid conflicts
        },
        data: req.body,
        params: req.query,
        timeout: 30000,
      };

      const response = await axios(config);
      
      // Forward status and headers
      res.status(response.status);
      Object.keys(response.headers).forEach(key => {
        res.set(key, response.headers[key]);
      });
      
      res.send(response.data);
    } catch (error) {
      this.logger.error(`Content Management proxy error:`, error.message);
      
      if (axios.isAxiosError(error) && error.response) {
        res.status(error.response.status).send(error.response.data);
      } else {
        res.status(503).json({
          success: false,
          error: 'Content Management service unavailable',
          message: 'The content management service is currently unavailable. Please try again later.',
        });
      }
    }
  }
}