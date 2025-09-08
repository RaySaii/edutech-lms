'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SearchComponent from '@/components/search/SearchComponent';
import { MainNavigation } from '@/components/navigation/MainNavigation';

const SearchPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initialQuery, setInitialQuery] = useState('');

  useEffect(() => {
    const query = searchParams?.get('q') || '';
    setInitialQuery(query);
  }, [searchParams]);

  const handleResultSelect = (result: any) => {
    // Navigate to the appropriate page based on result type
    switch (result.type) {
      case 'course':
        router.push(`/courses/${result.id}`);
        break;
      case 'user':
        router.push(`/users/${result.id}`);
        break;
      case 'content':
        router.push(`/content/${result.id}`);
        break;
      case 'discussion':
        router.push(`/discussions/${result.id}`);
        break;
      default:
        console.log('Selected result:', result);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Search</h1>
          <p className="text-gray-600">
            Find courses, instructors, and learning materials across our platform
          </p>
        </div>

        <SearchComponent
          defaultQuery={initialQuery}
          onResultSelect={handleResultSelect}
          showFilters={true}
          placeholder="Search for courses, instructors, content..."
          className="max-w-none"
        />
      </div>
    </div>
  );
};

export default SearchPage;