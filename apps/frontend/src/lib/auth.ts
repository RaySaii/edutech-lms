import axios, { AxiosInstance } from 'axios';
import { LoginCredentials, RegisterData, BackendRegisterData, AuthResponse, AuthTokens, User } from '../types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class AuthAPI {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/auth`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const tokens = this.getStoredTokens();
        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const tokens = this.getStoredTokens();
            if (tokens?.refreshToken) {
              const newTokens = await this.refreshToken(tokens.refreshToken);
              this.setStoredTokens(newTokens);

              // Retry the original request with new token
              originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.clearStoredTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.api.post('/login', credentials);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message;

      // Debug: Log error for troubleshooting
      console.error('Login API error:', { status, message });

      return {
        success: false,
        message,
        status,
        error: this.getErrorCodeFromStatus(status, message)
      };
    }
  }

  async register(data: BackendRegisterData): Promise<AuthResponse> {
    try {
      const response = await this.api.post('/register', data);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message;

      // Debug: Log full error details for troubleshooting
      console.error('Registration API error details:', {
        status,
        message,
        fullResponse: error.response?.data,
        requestData: data,
        validation: error.response?.data?.details || error.response?.data?.validation
      });

      return {
        success: false,
        message,
        status,
        error: this.getErrorCodeFromStatus(status, message)
      };
    }
  }

  private getErrorCodeFromStatus(status: number, message: string): string {
    switch (status) {
      case 404:
        return 'USER_NOT_FOUND';
      case 401:
        return 'INVALID_CREDENTIALS';
      case 400:
        if (message.toLowerCase().includes('already registered')) {
          return 'EMAIL_ALREADY_EXISTS';
        }
        return 'BAD_REQUEST';
      case 409:
        return 'CONFLICT';
      case 500:
        return 'INTERNAL_ERROR';
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await this.api.post('/refresh', { refreshToken });
    return response.data.data.tokens;
  }

  async logout(): Promise<void> {
    const tokens = this.getStoredTokens();
    if (tokens) {
      try {
        await this.api.post('/logout');
      } catch (error) {
        // Even if logout fails on server, clear local storage
        console.warn('Server logout failed:', error);
      }
    }
    this.clearStoredTokens();
  }

  async forgotPassword(data: { email: string }): Promise<{ success: boolean; message: string }> {
    const response = await this.api.post('/forgot-password', data);
    return response.data;
  }

  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.post('/reset-password', { token, password });
    return response.data;
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await this.api.get('/me');
      return response.data.data.user;
    } catch (error) {
      console.warn('Failed to get current user:', error);
      return null;
    }
  }

  // Token storage methods
  getStoredTokens(): AuthTokens | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem('auth_tokens');
      if (!stored || stored === 'undefined' || stored === 'null') {
        return null;
      }
      return JSON.parse(stored);
    } catch (error) {
      console.warn('Failed to parse stored tokens:', error);
      // Clear corrupted data
      localStorage.removeItem('auth_tokens');
      return null;
    }
  }

  setStoredTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
    } catch (error) {
      console.warn('Failed to store tokens:', error);
    }
  }

  clearStoredTokens(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('auth_user');
    } catch (error) {
      console.warn('Failed to clear stored tokens:', error);
    }
  }

  getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem('auth_user');
      if (!stored || stored === 'undefined' || stored === 'null') {
        return null;
      }
      return JSON.parse(stored);
    } catch (error) {
      console.warn('Failed to parse stored user:', error);
      // Clear corrupted data
      localStorage.removeItem('auth_user');
      return null;
    }
  }

  setStoredUser(user: User): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } catch (error) {
      console.warn('Failed to store user:', error);
    }
  }

  async checkEmailAvailability(email: string): Promise<{ available: boolean; message: string }> {
    try {
      const response = await this.api.post('/check-email', { email });
      return response.data;
    } catch (error: any) {
      console.warn('Failed to check email availability:', error);
      return {
        available: true,
        message: 'Unable to check email availability'
      };
    }
  }
}

export const authAPI = new AuthAPI();
