import React from 'react';
import { Metadata } from 'next';
import MobileDashboard from '@/components/admin/MobileDashboard';

export const metadata: Metadata = {
  title: 'Mobile Dashboard | Admin',
  description: 'Monitor and manage mobile application usage, performance, and analytics',
};

export default function MobilePage() {
  return <MobileDashboard />;
}