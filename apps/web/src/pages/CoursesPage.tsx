import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import { CreateCourseModal } from '../components/course/CreateCourseModal';
import { COURSES_FIXTURE } from '../fixtures/courses';
import { apiClient } from '../services/apiClient';
import { toast } from '../stores/useToastStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  BookOpen,
  Clock,
  ArrowRight,
  Plus,
  Archive,
  Trash2,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { Course } from '@omnitutor/shared';

export const CoursesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [tab, setTab] = useState<'all' | 'active' | 'archived'>('active');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const categories = [
    'All',
    'Computer Science',
    'Mathematics',
    'Data Science',
    'Physics',
    'Languages',
  ];

  // Fetch real user courses from backend API
  const { data: apiCoursesData, isLoading } = useQuery({
    queryKey: ['courses', tab],
    queryFn: async () => {
      const res = await apiClient.getCourses({
        status: tab === 'all' ? 'all' : tab === 'archived' ? 'archived' : 'active',
      });
      return res.success && res.data ? res.data.courses : [];
    },
  });

  const apiCourses: Course[] = apiCoursesData || [];

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async ({ courseId, isArchived }: { courseId: string; isArchived: boolean }) => {
      return await apiClient.archiveCourse(courseId, isArchived);
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.isArchived ? 'Course archived successfully.' : 'Course restored to active library.',
        'Course Updated'
      );
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return await apiClient.deleteCourse(courseId);
    },
    onSuccess: () => {
      toast.success('Course and all materials deleted.', 'Course Deleted');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });

  // Combined display list: API courses first, or fixture courses if user has not created any
  const combinedCourses = [
    ...apiCourses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.subject.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      difficulty: c.academicLevel,
      durationHours: Math.max(2, c.materialCount * 3),
      rating: 4.9,
      enrolledStudents: 1,
      progressPercentage: c.indexedChunkCount > 0 ? 100 : 0,
      instructor: { name: 'You (Course Creator)' },
      materialCount: c.materialCount,
      indexedChunkCount: c.indexedChunkCount,
      processingStatus: c.processingStatus,
      isArchived: c.isArchived,
      isUserCreated: true,
    })),
    // Include fixture courses if in active tab
    ...(tab !== 'archived'
      ? COURSES_FIXTURE.map((f) => ({
          ...f,
          materialCount: f.modules.length * 3,
          indexedChunkCount: f.modules.length * 15,
          processingStatus: 'indexed' as const,
          isArchived: false,
          isUserCreated: false,
        }))
      : []),
  ];

  const filteredCourses = combinedCourses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' ||
      course.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesTab =
      tab === 'all' ||
      (tab === 'active' && !course.isArchived) ||
      (tab === 'archived' && course.isArchived);

    return matchesSearch && matchesCategory && matchesTab;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Course Catalog & Curricula</span>
            <span className="text-xs py-0.5 px-2 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-normal">
              {filteredCourses.length} courses
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Multimodal curricula with secure material indexing and adaptive Socratic tutoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Tabs
            value={tab}
            onChange={(v) => setTab(v as 'all' | 'active' | 'archived')}
          >
            <TabsList>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            id="btn-create-course-modal"
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>New Course</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="flex-1">
          <Input
            id="input-search-courses"
            placeholder="Search by topic, keyword, or course title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leadingIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-slate-400">
          Loading course library...
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course.id} hover className="flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="brand" size="sm">
                      {course.category}
                    </Badge>
                    <Badge variant="neutral" size="sm" className="capitalize">
                      {course.difficulty}
                    </Badge>
                  </div>

                  {course.isUserCreated && (
                    <Badge
                      variant={
                        course.processingStatus === 'indexed'
                          ? 'success'
                          : course.processingStatus === 'processing'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                      className="capitalize"
                    >
                      {course.processingStatus}
                    </Badge>
                  )}
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                    {course.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                {/* Material & Chunk Counts */}
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    {course.materialCount} materials
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {course.indexedChunkCount} indexed chunks
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {course.durationHours} hrs
                  </span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {course.isUserCreated && (
                    <>
                      <button
                        type="button"
                        title={course.isArchived ? 'Restore Course' : 'Archive Course'}
                        onClick={() =>
                          archiveMutation.mutate({
                            courseId: course.id,
                            isArchived: !course.isArchived,
                          })
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        title="Delete Course"
                        onClick={() => {
                          if (confirm(`Delete "${course.title}" and its materials?`)) {
                            deleteMutation.mutate(course.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <span className="text-xs text-slate-400">
                    By {course.instructor.name}
                  </span>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  <span>{course.progressPercentage > 0 ? 'Resume' : 'View Library'}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-indigo-500" />}
          title="No Courses Found"
          description={`No courses matched "${searchQuery}" in category "${selectedCategory}".`}
          action={
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create First Course
            </Button>
          }
        />
      )}

      {/* Create Course Modal */}
      <CreateCourseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['courses'] });
        }}
      />
    </div>
  );
};
