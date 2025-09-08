'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { authAPI } from '../../lib/api/auth';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setMessage('No verification token provided');
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const result = await authAPI.verifyEmail(verificationToken);

      if (result.success) {
        setStatus('success');
        setMessage(result.message || 'Email verified successfully! You can now sign in.');
      } else {
        setStatus('error');
        setMessage(result.message || 'Email verification failed. The link may be expired or invalid.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred during email verification. Please try again later.');
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'error':
      case 'invalid':
        return <XCircle className="h-12 w-12 text-red-600" />;
      default:
        return <Mail className="h-12 w-12 text-gray-600" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verifying Your Email...';
      case 'success':
        return 'Email Verified Successfully!';
      case 'error':
        return 'Verification Failed';
      case 'invalid':
        return 'Invalid Verification Link';
      default:
        return 'Email Verification';
    }
  };

  const getBackgroundColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-50';
      case 'error':
      case 'invalid':
        return 'bg-red-50';
      default:
        return 'bg-blue-50';
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${getBackgroundColor()}`}>
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            {getIcon()}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {getTitle()}
          </h1>

          <p className="text-gray-600 mb-6">
            {message}
          </p>

          <div className="space-y-3">
            {status === 'success' && (
              <Link 
                href="/login" 
                className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 inline-block text-center font-medium"
              >
                Sign In Now
              </Link>
            )}

            {status === 'error' && (
              <div className="space-y-3">
                <Link 
                  href="/register" 
                  className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 inline-block text-center font-medium"
                >
                  Register Again
                </Link>
                <Link 
                  href="/login" 
                  className="w-full bg-gray-100 text-gray-700 py-2.5 px-4 rounded-md hover:bg-gray-200 transition-colors duration-200 inline-block text-center font-medium"
                >
                  Back to Login
                </Link>
              </div>
            )}

            {status === 'invalid' && (
              <Link 
                href="/register" 
                className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 inline-block text-center font-medium"
              >
                Register New Account
              </Link>
            )}

            {status === 'loading' && (
              <div className="text-sm text-gray-500">
                Please wait while we verify your email address...
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need help? <Link href="/support" className="text-blue-600 hover:text-blue-500">Contact Support</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}