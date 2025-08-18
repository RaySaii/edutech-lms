'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ForgotPasswordForm } from '../../components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const handleBackClick = () => {
    router.push('/login');
  };

  const handleSuccess = () => {
    // Stay on the same page to show the success message
    // The ForgotPasswordForm handles the UI state
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <ForgotPasswordForm 
        onBackClick={handleBackClick}
        onSuccess={handleSuccess}
      />
    </div>
  );
}