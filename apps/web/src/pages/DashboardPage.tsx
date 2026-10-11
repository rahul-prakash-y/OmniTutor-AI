import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppStore } from '../stores/useAppStore';
import { COURSES_FIXTURE } from '../fixtures/courses';
import { ASSESSMENTS_FIXTURE } from '../fixtures/assessments';
import {
  Flame,
  Clock,
  Award,
  BookOpen,
  Bot,
  ArrowRight,
  TrendingUp,
  Sparkles,
  RotateCcw,
  PlayCircle,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { userName } = useAppStore();
  const [showEmptyState, setShowEmptyState] = useState(false);
  const navigate = useNavigate();

  const enrolledCourses = COURSES_FIXTURE.filter((c) => c.progressPercentage > 0);
  const recentAssessments = ASSESSMENTS_FIXTURE;

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Student Workspace
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-xs text-slate-500">October 11, 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-slate-100">
            Welcome back, {userName.split(' ')[0]}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Your Socratic inquiry pace is calibrated. Here is your daily learning pulse.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            id="btn-toggle-empty-state"
            variant="outline"
            size="sm"
            onClick={() => setShowEmptyState(!showEmptyState)}
            className="text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1 text-slate-400" />
            {showEmptyState ? 'Show Active Data' : 'Preview Empty State'}
          </Button>

          <Button
            id="btn-dashboard-tutor"
            variant="primary"
            size="sm"
            onClick={() => navigate('/tutor')}
          >
            <Bot className="w-4 h-4 mr-1.5" />
            Open AI Tutor
          </Button>
        </div>
      </div>

      {/* When Empty State is active */}
      {showEmptyState ? (
        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-indigo-500" />}
          title="No Learning History Found"
          description="You haven't enrolled in any courses or answered diagnostic queries yet. Explore our curated course catalog or launch an AI tutoring session."
          action={
            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={() => navigate('/courses')}>
                Explore Courses
              </Button>
              <Button variant="secondary" onClick={() => setShowEmptyState(false)}>
                Restore Data View
              </Button>
            </div>
          }
        />
      ) : (
        <>
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Streak */}
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Learning Streak</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
                  <Flame className="w-4 h-4 fill-amber-500" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
                  5 Days
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Personal Best
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Goal: 7 days continuous</p>
            </Card>

            {/* Study Time */}
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Weekly Time</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
                  14.2 hrs
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> +22%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Target: 15 hrs / week</p>
            </Card>

            {/* Mastery Score */}
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Mastery Index</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
                  88%
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Top Tier</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Evaluated across 4 subjects</p>
            </Card>

            {/* Enrolled Courses */}
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Courses</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-500 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
                  3 Courses
                </span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">1 Near Completion</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">2 modules pending today</p>
            </Card>
          </div>

          {/* Continue Learning Cards */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold font-display text-slate-900 dark:text-slate-100">
                  Continue Learning
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pick up right where you left off
                </p>
              </div>
              <Link to="/courses" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                View all courses <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {enrolledCourses.map((course) => (
                <Card key={course.id} hover className="flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="brand" size="sm">
                        {course.category}
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        {course.difficulty}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {course.description}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Progress</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {course.progressPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${course.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Instructor: {course.instructor.name}
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/courses/${course.id}`)}
                    >
                      <PlayCircle className="w-3.5 h-3.5 mr-1" />
                      Resume
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* AI Recommended Next Steps & Recent Assessments */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recommended Next Steps */}
            <Card className="lg:col-span-1 space-y-4">
              <CardHeader>
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                  <CardTitle>AI Tutor Recommendations</CardTitle>
                </div>
                <CardDescription>
                  Tailored based on your recent subproblem evaluations
                </CardDescription>
              </CardHeader>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100">
                    <span>Practice Bitmask DP</span>
                    <Badge variant="warning" size="sm">Suggested</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    You have mastered 1D memoization. Pushing to state compression will deepen your mastery.
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate('/tutor')}
                    className="text-xs font-semibold pt-1"
                  >
                    Start Socratic Session <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100">
                    <span>Eigenvectors Diagnostic</span>
                    <Badge variant="accent" size="sm">Diagnostic</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Verify geometric intuition on matrix spectral decomposition.
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate('/assessments/asmt-linear-diag')}
                    className="text-xs font-semibold pt-1"
                  >
                    Take Checkpoint <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Recent Assessments Table */}
            <Card className="lg:col-span-2 space-y-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Assessments & Quizzes</CardTitle>
                    <CardDescription>Score history and diagnostic benchmarks</CardDescription>
                  </div>
                  <Link to="/assessments" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    View all
                  </Link>
                </div>
              </CardHeader>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentAssessments.map((a) => (
                  <div key={a.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {a.title}
                        </span>
                        <Badge
                          variant={a.completed ? 'success' : 'warning'}
                          size="sm"
                        >
                          {a.type}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {a.courseTitle} · {a.durationMinutes} min · {a.questionCount} questions
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {a.completed ? (
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {a.scorePercentage}%
                          </span>
                          <span className="block text-[10px] text-slate-400">Passed</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-500 font-medium">Pending</span>
                      )}

                      <Button
                        variant={a.completed ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => navigate(`/assessments/${a.id}`)}
                      >
                        {a.completed ? 'Review' : 'Start'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
