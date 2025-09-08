const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retry: boolean = true
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get token from localStorage or sessionStorage
    const token = this.getStoredToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // If we get 401 and have a refresh token, try to refresh and retry
        if (response.status === 401 && retry && this.getStoredRefreshToken()) {
          try {
            await this.refreshToken();
            // Retry the request with the new token
            return this.request<T>(endpoint, options, false);
          } catch (refreshError) {
            // Clear tokens and redirect to login
            this.clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            throw new Error('Session expired. Please login again.');
          }
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('API request error:', error);
      }
      throw error;
    }
  }

  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    // Check localStorage first (remember me), then sessionStorage (session only)
    let token = localStorage.getItem('access_token');
    if (!token || token === 'undefined' || token === 'null') {
      token = sessionStorage.getItem('access_token');
    }
    
    return token && token !== 'undefined' && token !== 'null' ? token : null;
  }

  private getStoredRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    // Check localStorage first, then sessionStorage
    let refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null') {
      refreshToken = sessionStorage.getItem('refresh_token');
    }
    
    return refreshToken && refreshToken !== 'undefined' && refreshToken !== 'null' ? refreshToken : null;
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = this.getStoredRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    
    // Update stored tokens
    const isRemembered = !!localStorage.getItem('access_token');
    if (isRemembered) {
      localStorage.setItem('access_token', data.data.tokens.accessToken);
      if (data.data.tokens.refreshToken) {
        localStorage.setItem('refresh_token', data.data.tokens.refreshToken);
      }
    } else {
      sessionStorage.setItem('access_token', data.data.tokens.accessToken);
      if (data.data.tokens.refreshToken) {
        sessionStorage.setItem('refresh_token', data.data.tokens.refreshToken);
      }
    }
  }

  private clearTokens(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const api = new ApiClient(API_BASE_URL);