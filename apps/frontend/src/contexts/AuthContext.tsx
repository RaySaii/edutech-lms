'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthContextType, User, AuthTokens, LoginCredentials, RegisterData, BackendRegisterData, AuthResponse } from '../types/auth';
import { authAPI } from '../lib/auth';

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
        
        const storedTokens = authAPI.getStoredTokens();
        const storedUser = authAPI.getStoredUser();

        if (storedTokens && storedUser) {
          setTokens(storedTokens);
          setUser(storedUser);
          
          // Verify tokens are still valid by fetching current user
          try {
            const currentUser = await authAPI.getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
              authAPI.setStoredUser(currentUser);
            } else {
              // Tokens invalid, clear auth state
              await logout();
            }
          } catch {
            // If fetching current user fails, try to refresh token
            try {
              const newTokens = await authAPI.refreshToken(storedTokens.refreshToken);
              setTokens(newTokens);
              authAPI.setStoredTokens(newTokens);
              
              // Try fetching current user again with new token
              const currentUser = await authAPI.getCurrentUser();
              if (currentUser) {
                setUser(currentUser);
                authAPI.setStoredUser(currentUser);
              } else {
                await logout();
              }
            } catch {
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

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(credentials);
      
      if (response.success && response.data) {
        const { user: userData, tokens: tokensData } = response.data;
        
        setUser(userData);
        setTokens(tokensData);
        
        authAPI.setStoredUser(userData);
        authAPI.setStoredTokens(tokensData);
      } else {
        // Handle HTTP status code based errors
        if (!response.message) {
          switch (response.status) {
            case 404:
              response.message = 'User not found';
              break;
            case 401:
              response.message = 'Invalid credentials';
              break;
            default:
              response.message = 'Login failed. Please try again.';
          }
        }
      }
      
      return response;
    } catch (error: unknown) {
      console.error('Login failed:', error);
      
      // Transform error into a consistent response format
      if (error instanceof Error) {
        return {
          success: false,
          message: error.message.includes('fetch') 
            ? 'Network error. Please check your connection.' 
            : error.message
        };
      }
      
      return {
        success: false,
        message: 'An unexpected error occurred during login.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: BackendRegisterData): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(data);
      
      if (response.success && response.data) {
        const { user: userData, tokens: tokensData } = response.data;
        
        setUser(userData);
        setTokens(tokensData);
        
        authAPI.setStoredUser(userData);
        authAPI.setStoredTokens(tokensData);
      }
      
      return response;
    } catch (error: unknown) {
      console.error('Registration failed:', error);
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
      authAPI.clearStoredTokens();
    }
  };

  const refreshToken = async (): Promise<AuthTokens> => {
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const newTokens = await authAPI.refreshToken(tokens.refreshToken);
      setTokens(newTokens);
      authAPI.setStoredTokens(newTokens);
      return newTokens;
    } catch (error) {
      await logout();
      throw error;
    }
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    return authAPI.forgotPassword(email);
  };

  const resetPassword = async (token: string, password: string): Promise<{ success: boolean; message: string }> => {
    return authAPI.resetPassword(token, password);
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