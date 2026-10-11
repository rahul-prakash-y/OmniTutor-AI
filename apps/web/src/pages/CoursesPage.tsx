import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import { COURSES_FIXTURE } from '../fixtures/courses';
import { Search, BookOpen, Clock, Star, Users, ArrowRight } from 'lucide-react';

export const CoursesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [tab, setTab] = useState<'all' | 'enrolled'>('all');
  const navigate = useNavigate();

  const categories = ['All', 'Computer Science', 'Mathematics', 'Data Science', 'Physics'];

  const filteredCourses = COURSES_FIXTURE.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || course.category === selectedCategory;
    const matchesTab =
      tab === 'all' || (tab === 'enrolled' && course.progressPercentage > 0);

    return matchesSearch && matchesCategory && matchesTab;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
            Course Catalog & Curricula
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Multimodal curricula aligned with adaptive Socratic inquiry.
          </p>
        </div>

        <Tabs value={tab} onChange={(v) => setTab(v as 'all' | 'enrolled')}>
          <TabsList>
            <TabsTrigger value="all">All Courses</TabsTrigger>
            <TabsTrigger value="enrolled" badge={COURSES_FIXTURE.filter((c) => c.progressPercentage > 0).length}>
              Enrolled
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="flex-1">
          <Input
            id="input-search-courses"
            placeholder="Search by topic, instructor, or keywords..."
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
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course.id} hover className="flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <Badge variant="brand" size="sm">
                    {course.category}
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    {course.difficulty}
                  </Badge>
                </div>

                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                    {course.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {course.durationHours} hrs
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    {course.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {course.enrolledStudents.toLocaleString()}
                  </span>
                </div>

                {course.progressPercentage > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Completed</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {course.progressPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full"
                        style={{ width: `${course.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  By {course.instructor.name}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  <span>{course.progressPercentage > 0 ? 'Resume' : 'View Course'}</span>
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
          description={`No courses matched "${searchQuery}" in category "${selectedCategory}". Try adjusting your filters.`}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setTab('all');
              }}
            >
              Clear Filters
            </Button>
          }
        />
      )}
    </div>
  );
};
