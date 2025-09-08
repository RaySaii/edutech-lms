'use client';

import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { AdminReports } from '../../../components/admin/AdminReports';

export default function AdminReportsPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Generate comprehensive reports and export data for analysis
          </p>
        </div>
        
        <AdminReports />
      </div>
    </div>
  );
}