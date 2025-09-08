'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { courseAPI, CreateCourseData, Course } from '../../lib/api/courses';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '../ui/toast';
import { v4 as uuidv4 } from 'uuid';

interface CourseFormProps {
  courseId?: string;
  mode: 'create' | 'edit';
}

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'text' | 'quiz' | 'assignment';
  content: string;
  duration: number;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export function CourseForm({ courseId, mode }: CourseFormProps) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCourseData>({
    title: '',
    description: '',
    shortDescription: '',
    thumbnail: '',
    price: 0,
    level: 'beginner',
    tags: [],
    curriculum: {
      modules: []
    }
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (mode === 'edit' && courseId) {
      loadCourse();
    }
  }, [courseId, mode]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const response = await courseAPI.getCourseById(courseId!);
      if (response.success) {
        const course = response.data;
        setFormData({
          title: course.title,
          description: course.description,
          shortDescription: course.shortDescription || '',
          thumbnail: course.thumbnail || '',
          price: course.price,
          level: course.level,
          tags: course.tags || [],
          curriculum: course.curriculum || { modules: [] }
        });
      }
    } catch (error) {
      console.error('Error loading course:', error);
      showError('Failed to load course', 'Please try again later');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      showError('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      let response;
      
      if (mode === 'create') {
        response = await courseAPI.createCourse(formData);
      } else {
        response = await courseAPI.updateCourse(courseId!, formData);
      }

      if (response.success) {
        showSuccess(
          mode === 'create' ? 'Course created successfully' : 'Course updated successfully',
          response.message
        );
        router.push('/courses');
      }
    } catch (error) {
      console.error('Error saving course:', error);
      showError(
        `Failed to ${mode} course`,
        error instanceof Error ? error.message : 'Please try again later'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateCourseData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      handleInputChange('tags', [...(formData.tags || []), tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags?.filter(tag => tag !== tagToRemove) || []);
  };

  const addModule = () => {
    const newModule: Module = {
      id: uuidv4(),
      title: '',
      lessons: []
    };
    
    handleInputChange('curriculum', {
      modules: [...(formData.curriculum?.modules || []), newModule]
    });
  };

  const updateModule = (moduleId: string, field: keyof Module, value: any) => {
    const updatedModules = formData.curriculum?.modules.map(module =>
      module.id === moduleId ? { ...module, [field]: value } : module
    ) || [];
    
    handleInputChange('curriculum', { modules: updatedModules });
  };

  const removeModule = (moduleId: string) => {
    const updatedModules = formData.curriculum?.modules.filter(module => module.id !== moduleId) || [];
    handleInputChange('curriculum', { modules: updatedModules });
  };

  const addLesson = (moduleId: string) => {
    const newLesson: Lesson = {
      id: uuidv4(),
      title: '',
      type: 'video',
      content: '',
      duration: 0
    };

    const updatedModules = formData.curriculum?.modules.map(module =>
      module.id === moduleId 
        ? { ...module, lessons: [...module.lessons, newLesson] }
        : module
    ) || [];

    handleInputChange('curriculum', { modules: updatedModules });
  };

  const updateLesson = (moduleId: string, lessonId: string, field: keyof Lesson, value: any) => {
    const updatedModules = formData.curriculum?.modules.map(module =>
      module.id === moduleId
        ? {
            ...module,
            lessons: module.lessons.map(lesson =>
              lesson.id === lessonId ? { ...lesson, [field]: value } : lesson
            )
          }
        : module
    ) || [];

    handleInputChange('curriculum', { modules: updatedModules });
  };

  const removeLesson = (moduleId: string, lessonId: string) => {
    const updatedModules = formData.curriculum?.modules.map(module =>
      module.id === moduleId
        ? { ...module, lessons: module.lessons.filter(lesson => lesson.id !== lessonId) }
        : module
    ) || [];

    handleInputChange('curriculum', { modules: updatedModules });
  };

  if (loading && mode === 'edit') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {mode === 'create' ? 'Create New Course' : 'Edit Course'}
              </h1>
              <p className="text-gray-600 mt-1">
                {mode === 'create' 
                  ? 'Fill in the details below to create your course'
                  : 'Update your course information and curriculum'
                }
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Provide the essential details about your course
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Course Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter course title"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short Description</Label>
                <Input
                  id="shortDescription"
                  value={formData.shortDescription}
                  onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                  placeholder="Brief description for course previews"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Full Description *</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Detailed course description"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Difficulty Level</Label>
                  <select
                    id="level"
                    value={formData.level}
                    onChange={(e) => handleInputChange('level', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Thumbnail URL</Label>
                  <Input
                    id="thumbnail"
                    value={formData.thumbnail}
                    onChange={(e) => handleInputChange('thumbnail', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    Add Tag
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Curriculum */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Course Curriculum</CardTitle>
                  <CardDescription>
                    Organize your course content into modules and lessons
                  </CardDescription>
                </div>
                <Button type="button" onClick={addModule} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Module
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.curriculum?.modules.map((module, moduleIndex) => (
                <div key={module.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <Input
                        value={module.title}
                        onChange={(e) => updateModule(module.id, 'title', e.target.value)}
                        placeholder={`Module ${moduleIndex + 1} title`}
                        className="font-medium"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        onClick={() => addLesson(module.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Lesson
                      </Button>
                      <Button
                        type="button"
                        onClick={() => removeModule(module.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Lessons */}
                  <div className="pl-4 space-y-3">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <div key={lesson.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                          <Input
                            value={lesson.title}
                            onChange={(e) => updateLesson(module.id, lesson.id, 'title', e.target.value)}
                            placeholder={`Lesson ${lessonIndex + 1} title`}
                          />
                          <select
                            value={lesson.type}
                            onChange={(e) => updateLesson(module.id, lesson.id, 'type', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="video">Video</option>
                            <option value="text">Text</option>
                            <option value="quiz">Quiz</option>
                            <option value="assignment">Assignment</option>
                          </select>
                          <Input
                            type="number"
                            min="0"
                            value={lesson.duration}
                            onChange={(e) => updateLesson(module.id, lesson.id, 'duration', parseInt(e.target.value) || 0)}
                            placeholder="Duration (min)"
                          />
                          <Button
                            type="button"
                            onClick={() => removeLesson(module.id, lesson.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {(!formData.curriculum?.modules || formData.curriculum.modules.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <p>No modules added yet. Click "Add Module" to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {mode === 'create' ? 'Create Course' : 'Update Course'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}