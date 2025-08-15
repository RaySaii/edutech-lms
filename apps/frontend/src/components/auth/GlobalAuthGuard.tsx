'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

interface GlobalAuthGuardProps {
  children: React.ReactNode;
}

export function GlobalAuthGuard({ children }: GlobalAuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      const isPublicRoute = publicRoutes.includes(pathname);
      
      if (!isAuthenticated && !isPublicRoute) {
        // Redirect to login if not authenticated and trying to access protected route
        router.push('/login');
      } else if (isAuthenticated && isPublicRoute) {
        // Redirect to dashboard if authenticated and trying to access public route
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // For unauthenticated users on non-public routes, show nothing (redirect will handle)
  if (!isAuthenticated && !publicRoutes.includes(pathname)) {
    return null;
  }

  // For authenticated users on public routes, show nothing (redirect will handle)
  if (isAuthenticated && publicRoutes.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}