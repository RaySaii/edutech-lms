'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar,
  Users,
  BookOpen,
  DollarSign,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart,
  Filter,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Mail
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'users' | 'courses' | 'financial' | 'engagement' | 'system';
  icon: React.ComponentType<any>;
  lastGenerated?: string;
  isScheduled: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
  estimatedTime: string;
  format: 'csv' | 'pdf' | 'excel' | 'json';
}

interface GeneratedReport {
  id: string;
  templateId: string;
  name: string;
  generatedAt: string;
  status: 'generating' | 'completed' | 'failed';
  fileSize?: string;
  downloadUrl?: string;
  progress?: number;
}

export function AdminReports() {
  const [reportTemplates] = useState<ReportTemplate[]>([
    {
      id: 'user-activity',
      name: 'User Activity Report',
      description: 'Comprehensive user engagement and activity metrics',
      category: 'users',
      icon: Users,
      lastGenerated: '2024-08-25T10:30:00Z',
      isScheduled: true,
      frequency: 'weekly',
      estimatedTime: '2-3 minutes',
      format: 'excel'
    },
    {
      id: 'course-performance',
      name: 'Course Performance Analysis',
      description: 'Course enrollment, completion rates, and student feedback',
      category: 'courses',
      icon: BookOpen,
      lastGenerated: '2024-08-24T15:45:00Z',
      isScheduled: false,
      estimatedTime: '3-5 minutes',
      format: 'pdf'
    },
    {
      id: 'revenue-analysis',
      name: 'Revenue & Financial Report',
      description: 'Sales data, revenue trends, and financial analytics',
      category: 'financial',
      icon: DollarSign,
      lastGenerated: '2024-08-23T09:15:00Z',
      isScheduled: true,
      frequency: 'monthly',
      estimatedTime: '1-2 minutes',
      format: 'excel'
    },
    {
      id: 'engagement-metrics',
      name: 'Student Engagement Metrics',
      description: 'Learning progress, time spent, and engagement patterns',
      category: 'engagement',
      icon: TrendingUp,
      estimatedTime: '4-6 minutes',
      format: 'csv',
      isScheduled: false
    },
    {
      id: 'instructor-performance',
      name: 'Instructor Performance Report',
      description: 'Teacher statistics, course creation, and student ratings',
      category: 'users',
      icon: Users,
      lastGenerated: '2024-08-22T14:20:00Z',
      isScheduled: false,
      estimatedTime: '2-4 minutes',
      format: 'pdf'
    },
    {
      id: 'system-usage',
      name: 'System Usage Statistics',
      description: 'Platform usage, peak times, and performance metrics',
      category: 'system',
      icon: BarChart3,
      isScheduled: true,
      frequency: 'daily',
      estimatedTime: '1-2 minutes',
      format: 'json'
    }
  ]);

  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([
    {
      id: 'report-1',
      templateId: 'user-activity',
      name: 'User Activity Report - Aug 2024',
      generatedAt: '2024-08-25T10:30:00Z',
      status: 'completed',
      fileSize: '2.4 MB',
      downloadUrl: '/reports/user-activity-aug-2024.xlsx'
    },
    {
      id: 'report-2',
      templateId: 'course-performance',
      name: 'Course Performance Analysis - Q3 2024',
      generatedAt: '2024-08-24T15:45:00Z',
      status: 'completed',
      fileSize: '5.7 MB',
      downloadUrl: '/reports/course-performance-q3-2024.pdf'
    },
    {
      id: 'report-3',
      templateId: 'revenue-analysis',
      name: 'Revenue Report - July 2024',
      generatedAt: '2024-08-23T09:15:00Z',
      status: 'completed',
      fileSize: '1.8 MB',
      downloadUrl: '/reports/revenue-july-2024.xlsx'
    }
  ]);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [generatingReports, setGeneratingReports] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const handleGenerateReport = async (templateId: string) => {
    setGeneratingReports(prev => [...prev, templateId]);
    
    const template = reportTemplates.find(t => t.id === templateId);
    if (!template) return;

    // Add generating report
    const newReport: GeneratedReport = {
      id: `report-${Date.now()}`,
      templateId,
      name: `${template.name} - ${new Date().toLocaleDateString()}`,
      generatedAt: new Date().toISOString(),
      status: 'generating',
      progress: 0
    };

    setGeneratedReports(prev => [newReport, ...prev]);

    // Simulate report generation progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Update report as completed
        setGeneratedReports(prev => prev.map(report => 
          report.id === newReport.id
            ? {
                ...report,
                status: 'completed',
                progress: 100,
                fileSize: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
                downloadUrl: `/reports/${templateId}-${Date.now()}.${template.format}`
              }
            : report
        ));
        
        setGeneratingReports(prev => prev.filter(id => id !== templateId));
      } else {
        setGeneratedReports(prev => prev.map(report => 
          report.id === newReport.id
            ? { ...report, progress: Math.round(progress) }
            : report
        ));
      }
    }, 500);
  };

  const handleScheduleReport = (templateId: string, frequency: 'daily' | 'weekly' | 'monthly') => {
    // Implementation for scheduling reports
    console.log(`Scheduling report ${templateId} with frequency ${frequency}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generating':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'users':
        return Users;
      case 'courses':
        return BookOpen;
      case 'financial':
        return DollarSign;
      case 'engagement':
        return TrendingUp;
      case 'system':
        return BarChart3;
      default:
        return FileText;
    }
  };

  const categories = [
    { id: 'all', name: 'All Reports', count: reportTemplates.length },
    { id: 'users', name: 'User Reports', count: reportTemplates.filter(r => r.category === 'users').length },
    { id: 'courses', name: 'Course Reports', count: reportTemplates.filter(r => r.category === 'courses').length },
    { id: 'financial', name: 'Financial', count: reportTemplates.filter(r => r.category === 'financial').length },
    { id: 'engagement', name: 'Engagement', count: reportTemplates.filter(r => r.category === 'engagement').length },
    { id: 'system', name: 'System', count: reportTemplates.filter(r => r.category === 'system').length }
  ];

  const filteredTemplates = activeCategory === 'all' 
    ? reportTemplates 
    : reportTemplates.filter(template => template.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{generatedReports.length}</p>
                <p className="text-gray-600">Total Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {reportTemplates.filter(t => t.isScheduled).length}
                </p>
                <p className="text-gray-600">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {generatedReports.filter(r => r.status === 'completed').length}
                </p>
                <p className="text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Download className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {generatedReports.filter(r => r.downloadUrl).length}
                </p>
                <p className="text-gray-600">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Categories */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                      activeCategory === category.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="font-medium">{category.name}</span>
                    <Badge variant="outline">{category.count}</Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Date Range Filter */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Date Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Templates */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Available Reports ({filteredTemplates.length})
                </div>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTemplates.map(template => {
                  const Icon = template.icon;
                  const isGenerating = generatingReports.includes(template.id);
                  
                  return (
                    <div key={template.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Icon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{template.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                            
                            <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                              <span>Format: {template.format.toUpperCase()}</span>
                              <span>Est. time: {template.estimatedTime}</span>
                              {template.lastGenerated && (
                                <span>Last: {formatDate(template.lastGenerated)}</span>
                              )}
                            </div>
                            
                            {template.isScheduled && (
                              <div className="mt-2">
                                <Badge variant="outline" className="text-green-600 border-green-200">
                                  Scheduled {template.frequency}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => handleGenerateReport(template.id)}
                            disabled={isGenerating}
                            size="sm"
                          >
                            {isGenerating ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Generate
                              </>
                            )}
                          </Button>
                          
                          <Button variant="outline" size="sm">
                            <Calendar className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Generated Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Recent Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {generatedReports.map(report => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(report.status)}
                  <div>
                    <p className="font-medium text-gray-900">{report.name}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Generated: {formatDate(report.generatedAt)}</span>
                      {report.fileSize && <span>Size: {report.fileSize}</span>}
                    </div>
                    {report.status === 'generating' && report.progress !== undefined && (
                      <div className="mt-2 w-48">
                        <Progress value={report.progress} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">{report.progress}% complete</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {report.status === 'completed' && report.downloadUrl && (
                    <>
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </Button>
                      <Button size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {generatedReports.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No reports generated yet</p>
              <p className="text-sm text-gray-400 mt-1">Generate your first report using the templates above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}