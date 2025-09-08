import React from 'react';
import { Metadata } from 'next';
import LearningProfileSetup from '@/components/recommendations/LearningProfileSetup';

export const metadata: Metadata = {
  title: 'Learning Profile | EduTech LMS',  
  description: 'Set up your learning profile for personalized recommendations',
};

export default function LearningProfilePage() {
  return (
    <div className="container mx-auto p-6">
      <LearningProfileSetup />
    </div>
  );
}