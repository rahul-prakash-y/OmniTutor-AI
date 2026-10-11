import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import { toast } from '../stores/useToastStore';
import { COURSES_FIXTURE, type LessonFixture } from '../fixtures/courses';
import {
  Clock,
  Star,
  Users,
  CheckCircle2,
  Circle,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('syllabus');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    m1: true,
    m2: true,
    m3: true,
  });

  const course = COURSES_FIXTURE.find((c) => c.id === courseId) || COURSES_FIXTURE[0];

  if (!course) {
    return (
      <EmptyState
        title="Course Not Found"
        description="The requested course identifier does not match any current syllabus."
        action={
          <Button variant="primary" onClick={() => navigate('/courses')}>
            Return to Catalog
          </Button>
        }
      />
    );
  }

  const toggleModule = (modId: string) => {
    setExpandedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const handleStartLesson = (lesson: LessonFixture) => {
    toast.info(`Launching interactive session for "${lesson.title}"`, 'Lesson Started');
    navigate('/tutor');
  };

  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedLessons = course.modules.reduce(
    (acc, m) => acc + m.lessons.filter((l) => l.completed).length,
    0
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Back button */}
      <div>
        <Link
          to="/courses"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Courses
        </Link>
      </div>

      {/* Course Hero */}
      <div className="rounded-2xl p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-3xl">
          <div className="flex items-center gap-2">
            <Badge variant="brand">{course.category}</Badge>
            <Badge variant="neutral">{course.difficulty}</Badge>
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-slate-100">
            {course.title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {course.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-2">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-500" />
              {course.durationHours} Total Hours
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              {course.rating} Rating
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {course.enrolledStudents.toLocaleString()} Enrolled
            </span>
            <span>·</span>
            <span>Instructor: <strong className="text-slate-800 dark:text-slate-200">{course.instructor.name}</strong></span>
          </div>
        </div>

        {/* Action Callout Box */}
        <div className="w-full lg:w-72 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 shrink-0">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-400">Course Progress</span>
              <span className="text-indigo-600 dark:text-indigo-400">{course.progressPercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${course.progressPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {completedLessons} of {totalLessons} lessons completed
            </p>
          </div>

          <Button
            id="btn-resume-course"
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => handleStartLesson(course.modules[0]?.lessons[0]!)}
          >
            <PlayCircle className="w-4 h-4 mr-1.5" />
            Resume Learning
          </Button>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabsList variant="underline">
          <TabsTrigger value="syllabus">Syllabus & Modules</TabsTrigger>
          <TabsTrigger value="overview">Course Overview</TabsTrigger>
          <TabsTrigger value="outcomes">Cognitive Outcomes</TabsTrigger>
        </TabsList>

        {/* Syllabus Tab Content */}
        <TabsContent value="syllabus" className="space-y-4 pt-4">
          {course.modules.map((mod, modIdx) => (
            <Card key={mod.id} className="p-0 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleModule(mod.id)}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Module {modIdx + 1}
                  </span>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {mod.lessons.length} lessons · {mod.lessons.filter((l) => l.completed).length} completed
                  </p>
                </div>
                <div className="p-1 rounded-lg text-slate-400">
                  {expandedModules[mod.id] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {expandedModules[mod.id] && (
                <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 bg-slate-50/30 dark:bg-slate-900/40">
                  {mod.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {lesson.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                        )}
                        <div>
                          <p className={`text-xs font-medium ${lesson.completed ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                            {lesson.title}
                          </p>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {lesson.type} · {lesson.duration}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant={lesson.completed ? 'ghost' : 'outline'}
                        size="sm"
                        onClick={() => handleStartLesson(lesson)}
                      >
                        {lesson.completed ? 'Review' : 'Start'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </TabsContent>

        {/* Overview Tab Content */}
        <TabsContent value="overview" className="pt-4">
          <Card className="space-y-4 p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-display">
              About This Course
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This curriculum is designed to transition learners from rote algorithmic memorization into structural intuition. Rather than presenting pre-baked solutions, our AI tutor scaffolds your thought process using progressive counter-examples and cognitive stress tests.
            </p>
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  Prerequisites
                </span>
                <p className="text-xs text-slate-500">
                  Basic familiarity with recursion, big-O asymptotic analysis, and basic graph representation (adjacency lists).
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  Estimated Completion
                </span>
                <p className="text-xs text-slate-500">
                  3 weeks at an average cadence of 5 hours per week.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Outcomes Tab Content */}
        <TabsContent value="outcomes" className="pt-4">
          <Card className="space-y-4 p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Cognitive Learning Objectives
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Independently formulate state definitions and transition equations for unseen recurrence problems.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Evaluate memory locality tradeoffs between top-down recursion trees and flat iterative matrices.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Apply Bitmask state compression to optimize NP-hard permutation searches.</span>
              </li>
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
