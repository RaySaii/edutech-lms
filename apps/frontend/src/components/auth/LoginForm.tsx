'use client';

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoginCredentials } from '../../types/auth';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

interface LoginFormProps {
  onSuccess?: () => void;
  onRegisterClick?: () => void;
}

export function LoginForm({ onSuccess, onRegisterClick }: LoginFormProps) {
  const { login, isLoading } = useAuth();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateForm = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    // Email validation
    if (!credentials.email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    // Password validation
    if (!credentials.password) {
      setPasswordError('Password is required');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');


    if (!validateForm()) {
      return;
    }

    try {
      const response = await login(credentials);

      if (response.success) {
        onSuccess?.();
      } else {
        let errorMessage = 'Invalid email or password';

        // Use generic error message for all authentication failures (security best practice)
        if (response.status === 401 || response.status === 404 || 
            response.error === 'INVALID_CREDENTIALS' || response.error === 'USER_NOT_FOUND' ||
            response.message?.toLowerCase().includes('invalid credentials') ||
            response.message?.toLowerCase().includes('user not found')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (response.status === 400 || response.message?.toLowerCase().includes('account locked')) {
          errorMessage = 'Your account has been temporarily locked. Please try again later.';
        } else if (response.message?.toLowerCase().includes('account disabled')) {
          errorMessage = 'Your account has been disabled. Please contact support.';
        } else {
          errorMessage = 'Invalid email or password. Please try again.';
        }

        setError(errorMessage);
      }
    } catch (err: unknown) {
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (err instanceof Error) {
        if (err.message.toLowerCase().includes('network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (err.message.toLowerCase().includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (err.message.toLowerCase().includes('server')) {
          errorMessage = 'Server error. Please try again later.';
        }
      }

      setError(errorMessage);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation errors when user starts typing
    if (name === 'email' && emailError) {
      setEmailError('');
    }
    if (name === 'password' && passwordError) {
      setPasswordError('');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form" role="form">
            {error && (
              <Alert variant="destructive" data-testid="error-message" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={credentials.email}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="Enter your email"
                  disabled={isLoading}
                  data-testid="email-input"
                  aria-label="Email Address"
                />
                {emailError && (
                  <span data-testid="email-validation-error" className="text-red-500 text-sm mt-1 block">
                    {emailError}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={credentials.password}
                  onChange={handleChange}
                  className="pl-10 pr-10"
                  placeholder="Enter your password"
                  disabled={isLoading}
                  data-testid="password-input"
                  aria-label="Password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  data-testid="password-toggle"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                {passwordError && (
                  <span data-testid="password-validation-error" className="text-red-500 text-sm mt-1 block">
                    {passwordError}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                  data-testid="remember-me"
                />
                <Label htmlFor="remember-me" className="text-sm">
                  Remember me
                </Label>
              </div>

              <Button 
                variant="link" 
                className="px-0 text-sm"
                onClick={() => window.location.href = '/forgot-password'}
                data-testid="forgot-password-link"
              >
                Forgot password?
              </Button>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full" data-testid="login-submit">
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Button
                  type="button"
                  variant="link"
                  className="px-0"
                  onClick={onRegisterClick}
                  data-testid="register-link"
                >
                  Sign up
                </Button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
