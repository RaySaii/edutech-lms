'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthContextType, User, AuthTokens, LoginCredentials, RegisterData, BackendRegisterData, AuthResponse } from '../types/auth';
import { authAPI } from '../lib/api/auth';

// Token storage utilities
function getStoredTokens(): AuthTokens | null {
  if (typeof window === 'undefined') return null;

  try {
    // Check localStorage first (remember me), then sessionStorage (session only)
    let stored = localStorage.getItem('access_token');
    let refreshToken = localStorage.getItem('refresh_token');
    let isRemembered = true;

    if (!stored || stored === 'undefined' || stored === 'null') {
      stored = sessionStorage.getItem('access_token');
      refreshToken = sessionStorage.getItem('refresh_token');
      isRemembered = false;
    }

    if (!stored || stored === 'undefined' || stored === 'null') {
      return null;
    }

    return { accessToken: stored, refreshToken: refreshToken || '' };
  } catch (error) {
    console.warn('Failed to parse stored tokens:', error);
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('access_token');
    return null;
  }
}

function setStoredTokens(tokens: AuthTokens, rememberMe = false): void {
  if (typeof window === 'undefined') return;

  try {
    if (rememberMe) {
      // Store in localStorage for persistent login
      localStorage.setItem('access_token', tokens.accessToken);
      if (tokens.refreshToken) {
        localStorage.setItem('refresh_token', tokens.refreshToken);
      }
      // Clear sessionStorage to avoid confusion
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
    } else {
      // Store in sessionStorage for session-only login
      sessionStorage.setItem('access_token', tokens.accessToken);
      if (tokens.refreshToken) {
        sessionStorage.setItem('refresh_token', tokens.refreshToken);
      }
      // Clear localStorage to avoid confusion
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  } catch (error) {
    console.warn('Failed to store tokens:', error);
  }
}

function clearStoredTokens(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('auth_user');
  } catch (error) {
    console.warn('Failed to clear stored tokens:', error);
  }
}

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;

  try {
    // Check localStorage first (remember me), then sessionStorage (session only)
    let stored = localStorage.getItem('auth_user');

    if (!stored || stored === 'undefined' || stored === 'null') {
      stored = sessionStorage.getItem('auth_user');
    }

    if (!stored || stored === 'undefined' || stored === 'null') {
      return null;
    }

    return JSON.parse(stored);
  } catch (error) {
    console.warn('Failed to parse stored user:', error);
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_user');
    return null;
  }
}

function setStoredUser(user: User, rememberMe = false): void {
  if (typeof window === 'undefined') return;

  try {
    if (rememberMe) {
      localStorage.setItem('auth_user', JSON.stringify(user));
      sessionStorage.removeItem('auth_user');
    } else {
      sessionStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.removeItem('auth_user');
    }
  } catch (error) {
    console.warn('Failed to store user:', error);
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!tokens;

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        const storedTokens = getStoredTokens();
        const storedUser = getStoredUser();

        if (storedTokens && storedUser) {
          setTokens(storedTokens);
          setUser(storedUser);

          // Verify tokens are still valid by fetching current user
          try {
            const currentUser = await authAPI.getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
              setStoredUser(currentUser);
            } else {
              // Tokens invalid, clear auth state
              await logout();
            }
          } catch (error) {
            console.warn('Token validation failed, attempting refresh:', error);
            // If fetching current user fails, try to refresh token
            try {
              const newTokens = await authAPI.refreshToken(storedTokens.refreshToken);
              setTokens(newTokens);
              setStoredTokens(newTokens);

              // Try fetching current user again with new token
              const currentUser = await authAPI.getCurrentUser();
              if (currentUser) {
                setUser(currentUser);
                setStoredUser(currentUser);
              } else {
                await logout();
              }
            } catch (refreshError) {
              console.warn('Token refresh failed:', refreshError);
              // Refresh failed, clear auth state
              await logout();
            }
          }
        }
      } catch (error) {
        console.warn('Failed to initialize auth:', error);
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);

      const response = await authAPI.login(credentials);
      const { user, tokens } = response.data!;

      setUser(user);
      setTokens(tokens);
      setStoredUser(user, credentials.rememberMe);
      setStoredTokens(tokens, credentials.rememberMe);

    } catch (error: unknown) {
      console.error('Login failed:', error);

      // Let the error propagate to the UI layer
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: BackendRegisterData) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(data);
      const { user, tokens } = response.data!;

      setUser(user);
      setTokens(tokens);
      setStoredUser(user);
      setStoredTokens(tokens);

    } catch (error: unknown) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Registration failed:', error);
      }

      // Let the error propagate to the UI layer
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      setUser(null);
      setTokens(null);
      clearStoredTokens();
    }
  };

  const refreshToken = async (): Promise<AuthTokens> => {
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const newTokens = await authAPI.refreshToken(tokens.refreshToken);
      setTokens(newTokens);
      setStoredTokens(newTokens);
      return newTokens;
    } catch (error) {
      await logout();
      throw error;
    }
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    return authAPI.forgotPassword({ email });
  };

  const resetPassword = async (token: string, password: string): Promise<{ success: boolean; message: string }> => {
    return authAPI.resetPassword({ token, password });
  };

  const contextValue: AuthContextType = {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
    forgotPassword,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
