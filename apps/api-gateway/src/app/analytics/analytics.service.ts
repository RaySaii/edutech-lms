import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';

@Injectable()
export class AnalyticsService {
  private readonly analyticsServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.analyticsServiceUrl = this.configService.get('ANALYTICS_SERVICE_URL', 'http://localhost:3006/api');
  }

  proxyRequest(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any, params?: any): Observable<AxiosResponse<any>> {
    const url = `${this.analyticsServiceUrl}/${path}`;
    
    switch (method) {
      case 'GET':
        return this.httpService.get(url, { params });
      case 'POST':
        return this.httpService.post(url, data, { params });
      case 'PUT':
        return this.httpService.put(url, data, { params });
      case 'DELETE':
        return this.httpService.delete(url, { params });
      default:
        return this.httpService.get(url, { params });
    }
  }
}