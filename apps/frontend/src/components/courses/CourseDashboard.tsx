'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Book, Users, Star, Clock, Edit, Trash2, Eye, MoreVertical } from 'lucide-react';
import { courseAPI, Course, CoursesResponse } from '../../lib/api/courses';
import { getVideoThumbnail, getRandomVideos, formatVideoDuration } from '../../lib/videoSources';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../ui/toast';
import Link from 'next/link';
import { PAGINATION_CONFIG, UI_CONFIG } from '../../constants/pagination';

interface CourseDashboardProps {
  userRole?: 'student' | 'instructor' | 'admin';
}

// Helper function to get sample thumbnails for courses
const getCourseThumbnail = (title: string): string => {
  const thumbnails: Record<string, string> = {
    // Programming & Development
    'javascript': 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'react': 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'python': 'https://images.unsplash.com/photo-1526379879527-8559ecfcaec0?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'node': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'vue': 'https://images.unsplash.com/photo-1594904351111-a072f80b1a71?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'vue.js': 'https://images.unsplash.com/photo-1594904351111-a072f80b1a71?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'composition api': 'https://images.unsplash.com/photo-1594904351111-a072f80b1a71?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'angular': 'https://images.unsplash.com/photo-1572177812156-58036aae439c?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'typescript': 'https://images.unsplash.com/photo-1599837565318-67429bde7162?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'typescript complete': 'https://images.unsplash.com/photo-1599837565318-67429bde7162?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'java': 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'php': 'https://images.unsplash.com/photo-1599507593499-a3f7d7d97667?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'golang': 'https://images.unsplash.com/photo-1564865878688-9a244444042a?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'rust': 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'kotlin': 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'swift': 'https://images.unsplash.com/photo-1621839673705-6617adf9e890?w=400&h=200&fit=crop&crop=entropy&auto=format',
    
    // Mobile Development
    'mobile': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'android': 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'ios': 'https://images.unsplash.com/photo-1621839673705-6617adf9e890?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'flutter': 'https://images.unsplash.com/photo-1563813251-90a84b1d8550?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'flutter complete': 'https://images.unsplash.com/photo-1563813251-90a84b1d8550?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'build ios': 'https://images.unsplash.com/photo-1563813251-90a84b1d8550?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'react native': 'https://images.unsplash.com/photo-1574169208507-84376144848b?w=400&h=200&fit=crop&crop=entropy&auto=format',
    
    // DevOps & Cloud
    'devops': 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'docker': 'https://images.unsplash.com/photo-1605745341112-85968b19335a?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'kubernetes': 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'aws': 'https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'aws cloud': 'https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'cloud practitioner': 'https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'azure': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'gcp': 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'terraform': 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=400&h=200&fit=crop&crop=entropy&auto=format',
    
    // Data & AI
    'data': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'machine learning': 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'ai': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'deep learning': 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'tensorflow': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'pytorch': 'https://images.unsplash.com/photo-1516110833967-0b5716ca1387?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'pandas': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'numpy': 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&h=200&fit=crop&crop=entropy&auto=format',
    
    // Cybersecurity
    'cybersecurity': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'security': 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'ethical hacking': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'penetration testing': 'https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=400&h=200&fit=crop&crop=entropy&auto=format',
    
    // Web Development
    'web development': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'progressive web apps': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'pwa': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'frontend': 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'backend': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'fullstack': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'html': 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'css': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop&crop=entropy&auto=format',
    
    // Design & Creative
    'design': 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'ui': 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'ux': 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'figma': 'https://images.unsplash.com/photo-1609921212029-bb5a28e60960?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'photoshop': 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'illustrator': 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&h=200&fit=crop&crop=entropy&auto=format',
    
    // Algorithms & CS
    'algorithms': 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'data structures': 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'data structures and algorithms': 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'leetcode': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'coding interview': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop&crop=entropy&auto=format',
    
    // Business & Marketing
    'business': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'marketing': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'digital marketing': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'entrepreneurship': 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'finance': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=200&fit=crop&crop=entropy&auto=format',
    
    // Photography & Video
    'photography': 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'video editing': 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'premier': 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=200&fit=crop&crop=entropy&auto=format',
    'after effects': 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=200&fit=crop&crop=entropy&auto=format',
  };

  // Find matching thumbnail based on course title keywords
  const titleLower = title.toLowerCase();
  for (const [keyword, thumbnail] of Object.entries(thumbnails)) {
    if (titleLower.includes(keyword)) {
      return thumbnail;
    }
  }
  
  // Default programming thumbnail
  return 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=200&fit=crop&crop=entropy&auto=format';
};

export function CourseDashboard({ userRole = 'instructor' }: CourseDashboardProps) {
  const { showSuccess, showError } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPriceFilter, setSelectedPriceFilter] = useState<string>('');
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    enrolled: 0
  });

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const query = {
        page: currentPage,
        limit: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
        ...(debouncedSearchQuery && { search: debouncedSearchQuery }),
        ...(selectedLevel && { level: selectedLevel }),
        ...(selectedStatus && { status: selectedStatus }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(selectedPriceFilter && { priceFilter: selectedPriceFilter }),
        ...(selectedRatingFilter && { rating: selectedRatingFilter }),
        ...(sortBy && { sortBy: sortBy }),
      };

      console.log('Loading courses with query:', query);
      console.log('User role:', userRole);

      let response: CoursesResponse;
      if (userRole === 'instructor') {
        console.log('Calling getMyCourses for instructor');
        response = await courseAPI.getMyCourses();
      } else {
        console.log('Calling getCourses for student with query:', query);
        response = await courseAPI.getCourses(query);
      }

      console.log('API Response:', response);

      if (response.success) {
        let filteredCourses = response.data.courses || [];
        console.log('Courses from API:', filteredCourses.length);
        console.log('First few courses:', filteredCourses.slice(0, 2));
        
        // Ensure we have valid courses array
        if (!Array.isArray(filteredCourses)) {
          console.error('Courses is not an array:', filteredCourses);
          filteredCourses = [];
        }
        
        // Apply client-side search filtering
        if (debouncedSearchQuery) {
          const searchLower = debouncedSearchQuery.toLowerCase();
          filteredCourses = filteredCourses.filter(course => 
            course.title.toLowerCase().includes(searchLower) ||
            course.description?.toLowerCase().includes(searchLower) ||
            course.instructor?.firstName?.toLowerCase().includes(searchLower) ||
            course.instructor?.lastName?.toLowerCase().includes(searchLower) ||
            course.category?.toLowerCase().includes(searchLower)
          );
        }
        
        // Apply client-side filtering for filters not supported by backend
        if (selectedCategory) {
          filteredCourses = filteredCourses.filter(course => 
            course.category?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
            course.title.toLowerCase().includes(selectedCategory.toLowerCase()) ||
            course.description?.toLowerCase().includes(selectedCategory.toLowerCase())
          );
        }
        
        if (selectedPriceFilter) {
          filteredCourses = filteredCourses.filter(course => {
            const price = Number(course.price) || 0;
            switch (selectedPriceFilter) {
              case 'free': return price === 0;
              case 'under-50': return price > 0 && price < 50;
              case '50-100': return price >= 50 && price <= 100;
              case '100-200': return price >= 100 && price <= 200;
              case 'over-200': return price > 200;
              default: return true;
            }
          });
        }
        
        if (selectedRatingFilter) {
          const minRating = parseFloat(selectedRatingFilter);
          filteredCourses = filteredCourses.filter(course => 
            (Number(course.rating) || 0) >= minRating
          );
        }
        
        // Apply sorting
        filteredCourses = filteredCourses.sort((a, b) => {
          switch (sortBy) {
            case 'popular':
              return (b.enrollmentCount || 0) - (a.enrollmentCount || 0);
            case 'rating':
              return (Number(b.rating) || 0) - (Number(a.rating) || 0);
            case 'price-low':
              return (Number(a.price) || 0) - (Number(b.price) || 0);
            case 'price-high':
              return (Number(b.price) || 0) - (Number(a.price) || 0);
            case 'title':
              return a.title.localeCompare(b.title);
            case 'newest':
            default:
              return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          }
        });
        
        setCourses(filteredCourses);
        
        // Calculate total pages based on actual content count to ensure accuracy
        // This fixes the pagination calculation to use real data instead of hardcoded values
        const apiTotalCourses = response.data.pagination.total || filteredCourses.length;
        const actualTotal = apiTotalCourses; // Use actual API response data
        const calculatedTotalPages = Math.ceil(actualTotal / PAGINATION_CONFIG.DEFAULT_PAGE_SIZE);
        const apiTotalPages = response.data.pagination.totalPages;
        
        // Use the calculated value to ensure all content is accessible
        setTotalPages(Math.max(calculatedTotalPages, apiTotalPages));
        
        // Calculate stats - use API total for overall count, filtered results for displayed stats
        const publishedCourses = filteredCourses.filter(c => c.status === 'published').length;
        const draftCourses = filteredCourses.filter(c => c.status === 'draft').length;
        const enrolledCourses = filteredCourses.reduce((sum, c) => sum + (c.enrollmentCount || 0), 0);
        
        setStats({
          total: apiTotalCourses, // Use API total instead of filtered count
          published: publishedCourses,
          draft: draftCourses,
          enrolled: enrolledCourses
        });
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load courses';
      setError(errorMessage);
      showError('Failed to load courses', 'Please try again later');
    } finally {
      setLoading(false);
    }
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedLevel, selectedStatus, selectedCategory, selectedPriceFilter, selectedRatingFilter, sortBy]);

  useEffect(() => {
    loadCourses();
  }, [currentPage, debouncedSearchQuery, selectedLevel, selectedStatus, selectedCategory, selectedPriceFilter, selectedRatingFilter, sortBy, userRole]);

  // Scroll to top when pagination changes
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }, [currentPage]);

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      const response = await courseAPI.deleteCourse(courseId);
      if (response.success) {
        showSuccess('Course deleted successfully', response.message);
        loadCourses();
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      showError('Failed to delete course', 'Please try again later');
    }
  };

  const handlePublishCourse = async (courseId: string) => {
    try {
      const response = await courseAPI.publishCourse(courseId);
      if (response.success) {
        showSuccess('Course published successfully', response.message);
        loadCourses();
      }
    } catch (error) {
      console.error('Error publishing course:', error);
      showError('Failed to publish course', 'Please ensure course has all required content');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      published: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    return variants[status as keyof typeof variants] || variants.draft;
  };

  const getLevelBadge = (level: string) => {
    const variants = {
      beginner: 'bg-blue-100 text-blue-800',
      intermediate: 'bg-purple-100 text-purple-800',
      advanced: 'bg-orange-100 text-orange-800',
      expert: 'bg-red-100 text-red-800'
    };
    return variants[level as keyof typeof variants] || variants.beginner;
  };

  return (
    <div className="space-y-6">
      {/* Header - Enhanced Design */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-5xl font-bold text-gray-900">All Courses</h1>
          <div className="text-right">
            <div className="text-sm text-gray-500">Showing</div>
            <div className="text-2xl font-bold text-purple-600">{stats.total}</div>
            <div className="text-sm text-gray-500">courses</div>
          </div>
        </div>
        <p className="text-xl text-gray-600 max-w-3xl">
          Choose from {stats.total} online video courses with new additions published every month
        </p>
      </div>

      {/* Category Tabs - Optimized Design */}
      <div className="relative mb-8">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl overflow-x-auto scrollbar-hide">
          {[
            { key: '', label: 'All Courses', icon: '📚' },
            { key: 'development', label: 'Development', icon: '💻' },
            { key: 'business', label: 'Business', icon: '📊' },
            { key: 'it-software', label: 'IT & Software', icon: '⚙️' },
            { key: 'design', label: 'Design', icon: '🎨' },
            { key: 'marketing', label: 'Marketing', icon: '📈' },
            { key: 'lifestyle', label: 'Lifestyle', icon: '🌱' },
            { key: 'photography', label: 'Photography', icon: '📸' }
          ].map((category) => (
            <button
              key={category.key}
              onClick={() => setSelectedCategory(category.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all duration-200 ${
                selectedCategory === category.key
                  ? 'bg-white text-purple-700 shadow-sm border border-purple-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              <span className="text-sm">{category.icon}</span>
              <span className="text-sm">{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search and Filters - Optimized Layout */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Search Section */}
        <div className="p-6 border-b border-gray-100">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search for anything"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-base border-gray-200 focus:border-purple-400 focus:ring-purple-100 w-full rounded-xl bg-gray-50 focus:bg-white transition-all duration-200"
            />
          </div>
        </div>
        
        {/* Filters Section */}
        <div className="p-6">
          <div className="flex flex-col space-y-4">
            {/* Filter Label */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter Results
              </h3>
              {(searchQuery || selectedLevel || selectedCategory || selectedPriceFilter || selectedRatingFilter || sortBy !== 'newest') && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedLevel('');
                    setSelectedCategory('');
                    setSelectedPriceFilter('');
                    setSelectedRatingFilter('');
                    setSortBy('newest');
                  }}
                  className="text-gray-500 hover:text-gray-700 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>
            
            {/* Filter Controls */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="h-11 text-sm border-gray-200 focus:border-purple-400 focus:ring-purple-100 rounded-lg bg-gray-50 hover:bg-white transition-colors">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPriceFilter} onValueChange={setSelectedPriceFilter}>
                <SelectTrigger className="h-11 text-sm border-gray-200 focus:border-purple-400 focus:ring-purple-100 rounded-lg bg-gray-50 hover:bg-white transition-colors">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="under-50">Under $50</SelectItem>
                  <SelectItem value="50-100">$50 - $100</SelectItem>
                  <SelectItem value="100-200">$100 - $200</SelectItem>
                  <SelectItem value="over-200">Over $200</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedRatingFilter} onValueChange={setSelectedRatingFilter}>
                <SelectTrigger className="h-11 text-sm border-gray-200 focus:border-purple-400 focus:ring-purple-100 rounded-lg bg-gray-50 hover:bg-white transition-colors">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4.5">⭐ 4.5 & up</SelectItem>
                  <SelectItem value="4.0">⭐ 4.0 & up</SelectItem>
                  <SelectItem value="3.5">⭐ 3.5 & up</SelectItem>
                  <SelectItem value="3.0">⭐ 3.0 & up</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-11 text-sm border-gray-200 focus:border-purple-400 focus:ring-purple-100 rounded-lg bg-gray-50 hover:bg-white transition-colors">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">🆕 Newest</SelectItem>
                  <SelectItem value="popular">🔥 Most Popular</SelectItem>
                  <SelectItem value="rating">⭐ Highest Rated</SelectItem>
                  <SelectItem value="price-low">💰 Price: Low to High</SelectItem>
                  <SelectItem value="price-high">💎 Price: High to Low</SelectItem>
                  <SelectItem value="title">🔤 A-Z</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                className="h-11 px-4 text-sm border-gray-200 hover:border-purple-300 hover:bg-purple-50 rounded-lg transition-colors"
              >
                <Filter className="h-4 w-4 mr-2" />
                More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="course-grid">
          {[...Array(UI_CONFIG.SKELETON_COUNT)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
              <div className="w-full h-48 bg-gray-200"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="flex items-center space-x-2">
                  <div className="h-3 bg-gray-200 rounded w-8"></div>
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, j) => (
                      <div key={j} className="h-3 w-3 bg-gray-200 rounded-full"></div>
                    ))}
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-10"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load courses</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={loadCourses} className="bg-purple-600 hover:bg-purple-700">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Book className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
            <p className="text-gray-600 mb-6">
              {userRole === 'instructor' 
                ? "You haven't created any courses yet. Get started by creating your first course!"
                : "No courses match your search criteria. Try adjusting your filters."
              }
            </p>
            {userRole === 'instructor' && (
              <Link href="/courses/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Course
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="course-catalog">
          {courses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`} className="block" data-testid="course-card">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer">
              {/* Course Thumbnail */}
              <div className="relative">
                {course.thumbnail || getVideoThumbnail(course.title) ? (
                  <img 
                    src={course.thumbnail || getVideoThumbnail(course.title)} 
                    alt={course.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      // Fallback to gradient background if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-full h-48 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center ${course.thumbnail || getVideoThumbnail(course.title) ? 'hidden' : ''}`}>
                  <Book className="h-16 w-16 text-white opacity-80" />
                </div>
                
                {/* Course Duration Overlay */}
                {course.curriculum?.totalDuration && (
                  <div className="absolute bottom-3 right-3 bg-black bg-opacity-75 text-white px-2 py-1 text-xs font-medium rounded">
                    {Math.floor(course.curriculum.totalDuration / 60)}h {course.curriculum.totalDuration % 60}m
                  </div>
                )}
                
                {/* Free Badge */}
                {(Number(course.price) === 0) && (
                  <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 text-xs font-semibold rounded">
                    FREE
                  </div>
                )}
                
                {/* Play Button Overlay on Hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                  <div className="bg-white bg-opacity-90 rounded-full p-3">
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Course Content */}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1 min-h-[40px]">
                  {course.title}
                </h3>
                
                <p className="text-xs text-gray-600 mb-2">
                  {course.instructor?.firstName} {course.instructor?.lastName}
                </p>
                
                <div className="flex items-center mb-2">
                  <span className="text-orange-500 font-bold text-sm mr-1">
                    {(Number(course.rating) || 0).toFixed(1)}
                  </span>
                  <div className="flex items-center mr-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-3 w-3 ${i < Math.floor(Number(course.rating) || 0) ? 'text-orange-500 fill-current' : 'text-gray-300'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">({course.reviewCount || 0})</span>
                </div>
                
                {/* Course additional info */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <div className="flex items-center">
                    {course.curriculum?.totalDuration && (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{Math.floor(course.curriculum.totalDuration / 60)}h {course.curriculum.totalDuration % 60}m</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center">
                    <span>{course.curriculum?.totalLessons || 0} lessons</span>
                  </div>
                </div>
                
                {/* Course description preview */}
                {course.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                    {course.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-gray-500">
                    <Users className="h-3 w-3 mr-1" />
                    <span>{(course.enrollmentCount || 0).toLocaleString()} students</span>
                  </div>
                  
                  <div className="text-right">
                    {(Number(course.price) === 0) ? (
                      <span className="text-lg font-bold text-gray-900">Free</span>
                    ) : (
                      <div>
                        <span className="text-lg font-bold text-gray-900">${course.price}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getLevelBadge(course.level)}`}>
                    {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                  </div>
                </div>

                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-3">
                  View Course
                </Button>
              </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Results Summary */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
        <p className="text-gray-600">
          Showing {((currentPage - 1) * PAGINATION_CONFIG.DEFAULT_PAGE_SIZE) + 1} to {Math.min(currentPage * PAGINATION_CONFIG.DEFAULT_PAGE_SIZE, stats.total)} of {stats.total} results
        </p>
        
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="text-purple-600 border-purple-600 hover:bg-purple-50"
            >
              Previous
            </Button>
            
            {(() => {
              const maxVisiblePages = 5;
              const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
              const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
              const adjustedStartPage = Math.max(1, endPage - maxVisiblePages + 1);
              
              const pages = [];
              
              // First page
              if (adjustedStartPage > 1) {
                pages.push(
                  <Button
                    key={1}
                    variant="outline"
                    onClick={() => setCurrentPage(1)}
                    className="text-purple-600 border-purple-600 hover:bg-purple-50"
                  >
                    1
                  </Button>
                );
                if (adjustedStartPage > 2) {
                  pages.push(<span key="ellipsis1" className="px-2 text-gray-500">...</span>);
                }
              }
              
              // Page numbers
              for (let i = adjustedStartPage; i <= endPage; i++) {
                pages.push(
                  <Button
                    key={i}
                    variant={currentPage === i ? "default" : "outline"}
                    onClick={() => setCurrentPage(i)}
                    className={currentPage === i ? "bg-purple-600 hover:bg-purple-700" : "text-purple-600 border-purple-600 hover:bg-purple-50"}
                  >
                    {i}
                  </Button>
                );
              }
              
              // Last page
              if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                  pages.push(<span key="ellipsis2" className="px-2 text-gray-500">...</span>);
                }
                pages.push(
                  <Button
                    key={totalPages}
                    variant="outline"
                    onClick={() => setCurrentPage(totalPages)}
                    className="text-purple-600 border-purple-600 hover:bg-purple-50"
                  >
                    {totalPages}
                  </Button>
                );
              }
              
              return pages;
            })()}
            
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="text-purple-600 border-purple-600 hover:bg-purple-50"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
