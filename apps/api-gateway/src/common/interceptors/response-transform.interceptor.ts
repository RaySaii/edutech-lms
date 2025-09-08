import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    timestamp: string;
    [key: string]: any;
  };
}

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, APIResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<APIResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already in the correct APIResponse format, return as is
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return data;
        }

        // If data contains user and tokens directly, wrap in data property
        if (data && typeof data === 'object' && ('user' in data || 'tokens' in data)) {
          return {
            success: true,
            data: data,
            meta: {
              timestamp: new Date().toISOString(),
            },
          };
        }

        // For all other responses, wrap in standard format
        return {
          success: true,
          data: data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}