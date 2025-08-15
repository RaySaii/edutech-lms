'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRoles?: UserRole[];
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true,
  requiredRoles = [],
  redirectTo = '/login',
  fallback = null
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, router, requireAuth, requiredRoles, redirectTo]);

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

  // Show fallback if provided and user doesn't meet requirements
  if (requireAuth && !isAuthenticated) {
    return fallback || null;
  }

  if (requiredRoles.length > 0 && user && !requiredRoles.includes(user.role)) {
    return fallback || null;
  }

  return <>{children}</>;
}

// Higher-order component for protecting pages
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  const ProtectedComponent = (props: P) => {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };

  ProtectedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  
  return ProtectedComponent;
}

// Role-specific protection components
export function AdminOnly({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute
      requiredRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}
      redirectTo="/unauthorized"
    >
      {children}
    </ProtectedRoute>
  );
}

export function InstructorOnly({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute
      requiredRoles={[UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]}
      redirectTo="/unauthorized"
    >
      {children}
    </ProtectedRoute>
  );
}

export function StudentAndUp({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute
      requiredRoles={[UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ORG_ADMIN, UserRole.ADMIN, UserRole.SUPER_ADMIN]}
      redirectTo="/unauthorized"
    >
      {children}
    </ProtectedRoute>
  );
}