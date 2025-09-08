'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';
import { MainNavigation } from '@/components/navigation/MainNavigation';
import ContentManagementDashboard from '@/components/content-management/ContentManagementDashboard';
import ContentEditor from '@/components/content-management/ContentEditor';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

type ViewMode = 'dashboard' | 'editor' | 'new-content';

const ContentManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  // Check if user has access to content management
  const hasContentManagementAccess = user?.role === UserRole.TEACHER || 
                                    user?.role === UserRole.ADMIN;

  if (!hasContentManagementAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">
              You don't have permission to access the content management system.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleBackToDashboard = () => {
    setViewMode('dashboard');
    setSelectedContentId(null);
  };

  const handleEditContent = (contentId: string) => {
    setSelectedContentId(contentId);
    setViewMode('editor');
  };

  const handleCreateContent = () => {
    setSelectedContentId(null);
    setViewMode('new-content');
  };

  const renderBreadcrumb = () => {
    const breadcrumbs = [];
    
    breadcrumbs.push({ label: 'Content Management', active: viewMode === 'dashboard' });
    
    if (viewMode === 'editor' && selectedContentId) {
      breadcrumbs.push({ label: 'Edit Content', active: true });
    } else if (viewMode === 'new-content') {
      breadcrumbs.push({ label: 'New Content', active: true });
    }

    return (
      <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span>/</span>}
            <span className={crumb.active ? 'text-blue-600 font-medium' : 'hover:text-blue-600'}>
              {crumb.label}
            </span>
          </React.Fragment>
        ))}
      </nav>
    );
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'dashboard':
        return (
          <ContentManagementDashboard />
        );
      
      case 'editor':
      case 'new-content':
        return (
          <div>
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={handleBackToDashboard}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </div>
            
            <ContentEditor
              contentId={selectedContentId || undefined}
              onSave={(content) => {
                // Handle successful save
                console.log('Content saved:', content);
                // Optionally redirect back to dashboard
                // handleBackToDashboard();
              }}
              onCancel={handleBackToDashboard}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNavigation />
      
      <div className="container mx-auto px-4 py-8">
        {renderBreadcrumb()}
        {renderContent()}
      </div>
    </div>
  );
};

export default ContentManagementPage;