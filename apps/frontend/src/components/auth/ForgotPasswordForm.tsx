'use client';

import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { authAPI } from '../../lib/api/auth';
import { useToast } from '../ui/toast';

interface ForgotPasswordFormProps {
  onBackClick?: () => void;
  onSuccess?: () => void;
}

export function ForgotPasswordForm({ onBackClick, onSuccess }: ForgotPasswordFormProps) {
  const { showSuccess, showError } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Always show generic success message regardless of whether user exists
      // This prevents user enumeration attacks
      await authAPI.forgotPassword({ email });

      setIsSubmitted(true);
      showSuccess(
        'Password Reset Requested',
        'If an account with this email exists, you will receive password reset instructions.'
      );
      onSuccess?.();
    } catch (error) {
      console.error('Password reset error:', error);

      // Even on errors, show generic message to prevent user enumeration
      setIsSubmitted(true);
      showSuccess(
        'Password Reset Requested',
        'If an account with this email exists, you will receive password reset instructions.'
      );
      onSuccess?.();
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Check Your Email</h1>
            <p className="text-gray-600 mt-2">
              If an account with <strong>{email}</strong> exists, you will receive password reset instructions within the next few minutes.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Mail className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Didn't receive an email?
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Check your spam or junk mail folder</li>
                      <li>Make sure the email address is correct</li>
                      <li>Wait a few more minutes for the email to arrive</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSubmitted(false)}
              className="w-full flex justify-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Try a Different Email
            </button>

            <button
              type="button"
              onClick={onBackClick}
              className="w-full flex items-center justify-center py-2.5 px-4 text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
              data-testid="back-to-login"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-600 mt-2">
            Enter your email address and we'll send you password reset instructions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="forgot-password-form">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center" data-testid="error-message">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Enter your email address"
                disabled={isLoading}
                data-testid="email-input"
              />
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Security Notice
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    For security reasons, we'll send reset instructions only if an account exists with this email address.
                    You won't receive confirmation whether the account exists or not.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            data-testid="submit-button"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Sending...
              </div>
            ) : (
              'Send Reset Instructions'
            )}
          </button>

          <button
            type="button"
            onClick={onBackClick}
            className="w-full flex items-center justify-center py-2.5 px-4 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200"
            data-testid="back-to-login"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
