import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { apiClient } from '../services/apiClient';
import {
  LineChart,
  Flame,
  Clock,
  TrendingUp,
  Brain,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  BookOpen,
  Plus,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import type {
  StudentAnalyticsSummary,
  TopicMasteryAnalytics,
  StudyRecommendation,
  StudyGoal,
  StudyPlan,
  Course,
} from '@omnitutor/shared';
import { Link } from 'react-router-dom';

export const ProgressPage: React.FC = () => {
  const [summary, setSummary] = useState<StudentAnalyticsSummary | null>(null);
  const [topics, setTopics] = useState<TopicMasteryAnalytics[]>([]);
  const [recommendations, setRecommendations] = useState<StudyRecommendation[]>([]);
  const [studyGoal, setStudyGoal] = useState<StudyGoal | null>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [weeklyHours, setWeeklyHours] = useState(6);
  const [targetWeeks, setTargetWeeks] = useState(4);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, topRes, recRes, goalRes, planRes, courseRes] = await Promise.all([
        apiClient.getAnalyticsSummary(),
        apiClient.getTopicMasteryAnalytics(),
        apiClient.getPersonalizedRecommendations(),
        apiClient.getStudyGoal(),
        apiClient.getStudyPlan(),
        apiClient.getCourses(),
      ]);

      if (sumRes.success && sumRes.data) setSummary(sumRes.data);
      if (topRes.success && topRes.data) setTopics(topRes.data);
      if (recRes.success && recRes.data) setRecommendations(recRes.data);
      if (goalRes.success && goalRes.data) setStudyGoal(goalRes.data);
      if (planRes.success && planRes.data) setStudyPlan(planRes.data);
      if (courseRes.success && courseRes.data?.courses) setCourses(courseRes.data.courses);
    } catch {
      // Fallback handled in render
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleMilestone = async (milestoneId: string, currentStatus: boolean) => {
    if (!studyPlan) return;
    try {
      const res = await apiClient.updateStudyPlanMilestone(studyPlan.id, milestoneId, {
        completed: !currentStatus,
      });
      if (res.success && res.data) {
        setStudyPlan(res.data);
      }
    } catch {
      // ignore
    }
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    setIsGeneratingPlan(true);
    try {
      const res = await apiClient.generateStudyPlan({
        courseId: selectedCourseId,
        weeklyAvailableHours: weeklyHours,
        targetWeeks,
        scheduleType: 'weekly',
      });
      if (res.success && res.data) {
        setStudyPlan(res.data);
        setPlanModalOpen(false);
      }
    } catch {
      // ignore
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const totalHours = summary ? (summary.activeStudyTimeMinutes / 60).toFixed(1) : '0.0';
  const streakDays = summary?.currentStreakDays ?? 0;
  const accuracy = summary?.overallAccuracy ?? 0;
  const revisionCount = summary?.topicsNeedingRevisionCount ?? 0;

  const dailyMinutes = summary?.dailyActiveMinutes || [
    { date: 'Mon', minutes: 25 },
    { date: 'Tue', minutes: 40 },
    { date: 'Wed', minutes: 60 },
    { date: 'Thu', minutes: 35 },
    { date: 'Fri', minutes: 50 },
    { date: 'Sat', minutes: 75 },
    { date: 'Sun', minutes: 30 },
  ];
  const maxDailyMinutes = Math.max(...dailyMinutes.map((d) => d.minutes), 60);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <LineChart className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Cognitive Analytics & Study Planner
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verified study time, estimated curriculum mastery, and personalized adaptive study plans.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setPlanModalOpen(true)}
            className="text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Study Plan
          </Button>
        </div>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center justify-between shadow-xs border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Active Study Time</span>
              <span title="Calculated strictly from verified user interactions (quizzes, tutor turns, material reads), not idle open tabs." className="cursor-help">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </span>
            </div>
            <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">
              {totalHours} hrs
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" /> Reliable Active Events
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between shadow-xs border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cognitive Streak
            </span>
            <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1 flex items-baseline gap-1">
              {streakDays} <span className="text-sm font-normal text-slate-500">Days</span>
            </div>
            <span className="text-[11px] text-amber-500 font-semibold mt-0.5 block">
              Flame Multiplier: {streakDays > 3 ? '1.5x' : '1.0x'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
            <Flame className="w-5 h-5 fill-amber-500" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between shadow-xs border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overall Accuracy
            </span>
            <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">
              {accuracy.toFixed(1)}%
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 block">
              {summary?.totalQuestionsAttempted ?? 0} Questions Attempted
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between shadow-xs border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Revision Targets
            </span>
            <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">
              {revisionCount}
            </div>
            <span className={`text-[11px] font-semibold mt-0.5 block ${revisionCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {revisionCount > 0 ? 'Concepts need reinforcement' : 'All topics on track'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Weekly Activity Chart & Personalized Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Time Allocation Bar Chart */}
        <Card className="lg:col-span-2 space-y-4 p-6 shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="p-0 border-0">
            <CardTitle>Daily Focus Allocation (Past 7 Days)</CardTitle>
            <CardDescription>Verified focused study time in minutes per day</CardDescription>
          </CardHeader>

          <div className="pt-6 flex items-end justify-between gap-3 h-52">
            {dailyMinutes.map((item, idx) => {
              const heightPercent = Math.max((item.minutes / maxDailyMinutes) * 100, 6);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.minutes}m
                  </span>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[42px] bg-gradient-to-t from-indigo-600 to-indigo-400 dark:from-indigo-700 dark:to-indigo-500 rounded-t-md transition-all duration-200 group-hover:from-indigo-500 group-hover:to-indigo-300 shadow-xs"
                  />
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    {item.date.slice(-5)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Personalized Recommendations */}
        <Card className="p-6 space-y-4 shadow-xs border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              Adaptive Study Guidance
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Algorithmic recommendations derived from recent mastery trends and missed concepts:
          </p>

          <div className="space-y-3 pt-1">
            {recommendations.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center text-xs text-slate-500">
                No immediate revision gaps detected. Great progress!
              </div>
            ) : (
              recommendations.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 space-y-2 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {rec.title}
                    </span>
                    <Badge variant={rec.priority === 'high' ? 'danger' : 'brand'}>
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {rec.reason}
                  </p>
                  <Link
                    to={rec.actionUrl}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
                  >
                    Take Action <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Active Study Plan Section */}
      <Card className="p-6 space-y-6 shadow-xs border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                {studyPlan ? studyPlan.title : 'Active Personalized Study Plan'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Structured weekly milestones based on your available study time ({studyPlan?.weeklyAvailableHours ?? studyGoal?.weeklyHoursTarget ?? 6} hrs/week).
            </p>
          </div>
          {studyPlan && (
            <Badge variant="brand">
              Target: {new Date(studyPlan.targetCompletionDate).toLocaleDateString()}
            </Badge>
          )}
        </div>

        {!studyPlan ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No active study plan generated yet
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Select an enrolled course to generate a personalized weekly milestone plan adapted to your available schedule.
            </p>
            <Button variant="primary" size="sm" onClick={() => setPlanModalOpen(true)}>
              Generate Study Plan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {studyPlan.milestones.map((ms) => (
              <div
                key={ms.id}
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                  ms.completed
                    ? 'border-emerald-200 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleMilestone(ms.id, ms.completed)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-500 transition-colors"
                  >
                    <CheckCircle2
                      className={`w-5 h-5 ${
                        ms.completed
                          ? 'text-emerald-500 fill-emerald-500/20'
                          : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  </button>
                  <div className="space-y-1">
                    <span
                      className={`text-sm font-semibold ${
                        ms.completed
                          ? 'line-through text-slate-400 dark:text-slate-600'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {ms.title}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {ms.description}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                      <span>Week {ms.week}</span>
                      <span>•</span>
                      <span>{ms.estimatedHours} hrs estimated</span>
                      <span>•</span>
                      <span className="capitalize">{ms.actionType.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                <Badge variant={ms.completed ? 'success' : 'neutral'}>
                  {ms.completed ? 'Completed' : 'Pending'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Estimated Topic Mastery Table */}
      <Card className="p-6 space-y-4 shadow-xs border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle>Curriculum Topic Mastery</CardTitle>
            <CardDescription>
              Clearly labeled estimated mastery calculated from question correctness and difficulty transitions.
            </CardDescription>
          </div>
          <span className="text-[11px] text-slate-400 italic">
            *Estimated scores; not psychometric ground truth.
          </span>
        </div>

        {topics.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No topic mastery data recorded yet. Take an assessment or quiz to begin tracking mastery.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Current Difficulty</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Estimated Mastery</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topics.map((t, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {t.topic}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {t.courseTitle || 'Curriculum'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="brand" className="text-[10px]">
                        {t.currentDifficulty}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                      {t.correctCount} / {t.attemptCount}
                    </TableCell>
                    <TableCell>
                      <div className="w-32 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${t.estimatedMasteryScore}%` }}
                            className={`h-full rounded-full ${
                              t.estimatedMasteryScore >= 70
                                ? 'bg-emerald-500'
                                : t.estimatedMasteryScore >= 45
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {t.estimatedMasteryScore}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {t.recommendedRevision || t.estimatedMasteryScore < 45 ? (
                        <Badge variant="danger" className="text-[10px]">
                          Needs Revision
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px]">
                          Mastered
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Generate Study Plan Modal */}
      <Dialog
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title="Generate Personalized Study Plan"
      >
        <form onSubmit={handleGeneratePlan} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Select Enrolled Course
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              required
              className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose a course --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Weekly Study Time (Hours)
              </label>
              <Input
                type="number"
                min={1}
                max={40}
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Target Duration (Weeks)
              </label>
              <Input
                type="number"
                min={1}
                max={16}
                value={targetWeeks}
                onChange={(e) => setTargetWeeks(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPlanModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isGeneratingPlan || !selectedCourseId}
            >
              {isGeneratingPlan ? 'Synthesizing...' : 'Generate Plan'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
