'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '../../components/auth/LoginForm';
import { RegisterForm } from '../../components/auth/RegisterForm';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  const handleSuccess = () => {
    // Redirect based on user role
    if (user?.role === 'admin') {
      router.push('/admin/analytics');
    } else if (user?.role === 'teacher') {
      router.push('/dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold tracking-tight">
            EduTech LMS
          </h2>
          <p className="text-muted-foreground mt-2">Your Learning Management System</p>
        </div>

        <div data-testid="auth-container">
          {isLogin ? (
            <LoginForm 
              onSuccess={handleSuccess}
              onRegisterClick={() => setIsLogin(false)}
            />
          ) : (
            <RegisterForm 
              onSuccess={handleSuccess}
              onLoginClick={() => setIsLogin(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}