'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { RegisterData } from '../../types/auth';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '../ui/toast';
import { authAPI } from '../../lib/auth';
import { useDebounce } from 'ahooks';

interface RegisterFormProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
}

export function RegisterForm({ onSuccess, onLoginClick }: RegisterFormProps) {
  const { register, isLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    requirements: { met: boolean; text: string }[];
  }>({
    score: 0,
    requirements: [],
  });
  const [emailStatus, setEmailStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({
    checking: false,
  });

  const validatePassword = (password: string) => {
    const requirements = [
      { met: password.length >= 8, text: 'At least 8 characters' },
      { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
      { met: /[a-z]/.test(password), text: 'One lowercase letter' },
      { met: /\d/.test(password), text: 'One number' },
    ];

    const score = requirements.filter(req => req.met).length;
    return { score, requirements };
  };

  const debouncedEmail = useDebounce(formData.email, { wait: 500 });

  const checkEmailAvailability = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailStatus({ checking: false });
      return;
    }

    setEmailStatus({ checking: true });

    try {
      const result = await authAPI.checkEmailAvailability(email);
      setEmailStatus({
        checking: false,
        available: result.available,
        message: result.message,
      });
    } catch (error) {
      setEmailStatus({
        checking: false,
        available: true,
        message: 'Unable to check email availability',
      });
    }
  }, []);

  useEffect(() => {
    if (debouncedEmail) {
      checkEmailAvailability(debouncedEmail);
    } else {
      setEmailStatus({ checking: false });
    }
  }, [debouncedEmail, checkEmailAvailability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (passwordStrength.score < 4) {
      setError('Password does not meet security requirements');
      return;
    }

    // Validate email availability - prevent form submission if email exists
    if (emailStatus.available === false) {
      setError('This email is already registered. Please sign in or reset your password.');
      return;
    }

    try {
      // Remove confirmPassword before sending to backend
      const { confirmPassword, ...registrationData } = formData;
      const response = await register(registrationData);
      if (response.success) {
        showSuccess(
          'Registration Successful!',
          'Your account has been created successfully. Welcome to EduTech LMS!'
        );
        onSuccess?.();
      } else {
        const errorMessage = response.message || 'Registration failed';
        setError(errorMessage);
        showError('Registration Failed', errorMessage);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      showError('Registration Error', errorMessage);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Update password strength when password changes
    if (name === 'password') {
      setPasswordStrength(validatePassword(value));
    }
  };

  const getStrengthColor = (score: number) => {
    if (score < 2) return 'bg-red-500';
    if (score < 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number) => {
    if (score < 2) return 'Weak';
    if (score < 4) return 'Medium';
    return 'Strong';
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-600 mt-1">Join our learning platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center" data-testid="error-message">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="block w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="John"
                  disabled={isLoading}
                  data-testid="first-name-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="block w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="Doe"
                  disabled={isLoading}
                  data-testid="last-name-input"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`block w-full pl-9 pr-10 py-2.5 border rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent text-sm ${
                  emailStatus.available === false
                    ? 'border-red-300 focus:ring-red-500'
                    : emailStatus.available === true
                    ? 'border-green-300 focus:ring-green-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="john@example.com"
                disabled={isLoading}
                data-testid="email-input"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {emailStatus.checking ? (
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" data-testid="email-loading" />
                ) : formData.email && emailStatus.available !== undefined ? (
                  emailStatus.available ? (
                    <div className="h-4 w-4 rounded-full bg-green-100 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    </div>
                  ) : (
                    <div className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    </div>
                  )
                ) : null}
              </div>
            </div>
            {emailStatus.message && formData.email && (
              <div className={`text-xs mt-1 ${
                emailStatus.available === false ? 'text-red-600' : 'text-green-600'
              }`}>
                <p>{emailStatus.message}</p>
                {emailStatus.available === false && (
                  <p className="mt-1">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={onLoginClick}
                      className="text-blue-600 hover:text-blue-500 underline font-medium"
                    >
                      Sign in
                    </button>
                    {' '}or{' '}
                    <a
                      href="/forgot-password"
                      className="text-blue-600 hover:text-blue-500 underline font-medium"
                    >
                      forgot password?
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>



          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="block w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Create a strong password"
                disabled={isLoading}
                data-testid="password-input"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>

            {formData.password && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Password strength</span>
                  <span className={`font-medium ${
                    passwordStrength.score < 2 ? 'text-red-600' :
                    passwordStrength.score < 4 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {getStrengthText(passwordStrength.score)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength.score)}`}
                    style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                  ></div>
                </div>
                <div className="mt-2 space-y-1">
                  {passwordStrength.requirements.map((req, index) => (
                    <div key={index} className="flex items-center text-xs">
                      {req.met ? (
                        <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                      ) : (
                        <div className="h-3 w-3 border border-gray-300 rounded-full mr-2"></div>
                      )}
                      <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
                        {req.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="block w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Confirm your password"
                disabled={isLoading}
                data-testid="confirm-password-input"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-red-600 text-xs mt-1">Passwords do not match</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
              I agree to the{' '}
              <a href="/terms" className="text-blue-600 hover:text-blue-500">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-600 hover:text-blue-500">
                Privacy Policy
              </a>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || passwordStrength.score < 4}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            data-testid="register-submit"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating account...
              </div>
            ) : (
              'Create Account'
            )}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onLoginClick}
                className="font-medium text-blue-600 hover:text-blue-500"
                data-testid="login-link"
              >
                Sign in
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
