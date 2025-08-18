'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const ToastProvider = dynamic(
  () => import('./toast').then(mod => ({ default: mod.ToastProvider })),
  {
    ssr: false,
    loading: () => null,
  }
);

interface ClientOnlyToastProviderProps {
  children: React.ReactNode;
}

export default function ClientOnlyToastProvider({ children }: ClientOnlyToastProviderProps) {
  return <ToastProvider>{children}</ToastProvider>;
}