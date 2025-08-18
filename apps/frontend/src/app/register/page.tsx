'use client';

import { useRouter } from 'next/navigation';
import { RegisterForm } from '../../components/auth/RegisterForm';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <RegisterForm
        onSuccess={() => router.push('/dashboard')}
        onLoginClick={() => router.push('/login')}
      />
    </div>
  );
}