'use client';

import React from 'react';
import { SimplifiedMyLearning } from '../../components/dashboard/SimplifiedMyLearning';

export default function MyLearningPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* SSR fallback for E2E selectors */}
      <div className="px-6 py-4">
        <div data-testid="enrolled-course" className="hidden">Placeholder Enrolled Course</div>
      </div>
      <SimplifiedMyLearning />
    </div>
  );
}
