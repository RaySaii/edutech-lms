import { api } from './base';
import { LoginCredentials, RegisterData, BackendRegisterData, AuthResponse, AuthTokens, User } from '../../types/auth';
import { APIResponse, LoginResponse, RegisterResponse, EmailCheckResponse } from '../../types/api';

export const authAPI = {
  async login(credentials: LoginCredentials): Promise<APIResponse<LoginResponse>> {
    return api.post('/auth/login', credentials);
  },

  async register(data: BackendRegisterData): Promise<APIResponse<RegisterResponse>> {
    return api.post('/auth/register', data);
  },

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await api.post<APIResponse<{ tokens: AuthTokens }>>('/auth/refresh', { refreshToken });
    return response.data?.tokens || { accessToken: '', refreshToken: '' };
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async forgotPassword(data: { email: string }): Promise<{ success: boolean; message: string }> {
    const response = await api.post<APIResponse<{ success: boolean; message: string }>>('/auth/forgot-password', data);
    return response.data || { success: false, message: 'Request failed' };
  },

  async resetPassword(data: { token: string; password: string }): Promise<{ success: boolean; message: string }> {
    const response = await api.post<APIResponse<{ success: boolean; message: string }>>('/auth/reset-password', data);
    return response.data || { success: false, message: 'Request failed' };
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get<APIResponse<User>>('/auth/profile');
      return response.data || null;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to get current user:', error);
      }
      return null;
    }
  },

  async checkEmailAvailability(email: string): Promise<{ available: boolean; message: string }> {
    try {
      const response = await api.post<APIResponse<EmailCheckResponse>>('/auth/check-email', { email });
      // Handle standardized response format: { success: true, data: { available: boolean, message: string }, meta: {...} }
      return response.data || { available: true, message: 'Email availability unknown' };
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to check email availability:', error);
      }
      return {
        available: true,
        message: 'Unable to check email availability'
      };
    }
  },

  async verifyEmail(token: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const response = await api.post<APIResponse<any>>('/auth/verify-email', { token });
      return {
        success: response.success || false,
        message: response.message || 'Email verification processed',
        data: response.data
      };
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to verify email:', error);
      }
      return {
        success: false,
        message: error.response?.data?.message || 'Email verification failed'
      };
    }
  }
};