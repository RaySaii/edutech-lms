'use client';

import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { ContentManager } from '../../../components/content-management/ContentManager';

export default function AdminContentPage() {
  const { user } = useAuth();

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You must be an administrator to access this page.</p>
        </div>
      </div>
    );
  }

  return <ContentManager />;
}