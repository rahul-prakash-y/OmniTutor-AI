import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { toast } from '../stores/useToastStore';
import { apiClient } from '../services/apiClient';
import type {
  Course,
  Assessment,
  AssessmentMode,
  AcademicLevel,
  TopicMastery,
  AssessmentAttempt,
} from '@omnitutor/shared';
import {
  Award,
  Clock,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Brain,
  Plus,
  BookOpen,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BarChart2,
} from 'lucide-react';

export const AssessmentsPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');


  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(false);

  const [topicMasteries, setTopicMasteries] = useState<TopicMastery[]>([]);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);

  // Generation Modal
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [genMode, setGenMode] = useState<AssessmentMode>('quiz');
  const [genTopic, setGenTopic] = useState('');
  const [genDifficulty, setGenDifficulty] = useState<AcademicLevel>('intermediate');
  const [genQuestionCount, setGenQuestionCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState(false);

  // 1. Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await apiClient.getCourses();
        if (res.success && res.data) {
          setCourses(res.data.courses);
          if (res.data.courses.length > 0) {
            setSelectedCourseId(res.data.courses[0]!.id);
          }
        }
      } catch {
        toast.error('Failed to load courses', 'Error');
      }
    };

    fetchCourses();
  }, []);

  // 2. Fetch assessments, masteries, attempts when selectedCourseId changes
  useEffect(() => {
    if (!selectedCourseId) return;

    const fetchCourseData = async () => {
      setIsLoadingAssessments(true);
      try {
        const [assessRes, masteryRes, attemptRes] = await Promise.all([
          apiClient.listAssessments(selectedCourseId),
          apiClient.getTopicMasteries(selectedCourseId),
          apiClient.getAssessmentAttempts(selectedCourseId),
        ]);

        if (assessRes.success && assessRes.data) {
          setAssessments(assessRes.data.items);
        }
        if (masteryRes.success && masteryRes.data) {
          setTopicMasteries(masteryRes.data);
        }
        if (attemptRes.success && attemptRes.data) {
          setAttempts(attemptRes.data);
        }
      } catch {
        // Fallback
      } finally {
        setIsLoadingAssessments(false);
      }
    };

    fetchCourseData();
  }, [selectedCourseId]);

  // Handle generation
  const handleGenerateAssessment = async () => {
    if (!selectedCourseId) {
      toast.error('Please select an active course first', 'Validation');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await apiClient.generateAssessment(selectedCourseId, {
        mode: genMode,
        topic: genTopic.trim() || undefined,
        difficulty: genDifficulty,
        questionCount: genQuestionCount,
      });

      if (res.success && res.data) {
        const newAssessment = res.data;
        setAssessments((prev) => [newAssessment, ...prev]);
        setGenerateModalOpen(false);
        setGenTopic('');
        toast.success('Assessment generated from indexed curriculum!', 'Generated');
        // Navigate directly to the new assessment
        navigate(`/assessments/${newAssessment.id}`);
      } else {
        toast.error(
          res.error?.message || 'Could not generate questions. Ensure material is uploaded and indexed.',
          'Generation Failed'
        );
      }
    } catch {
      toast.error('Failed to connect to assessment engine', 'Network Error');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  // Compute metrics
  const totalCompleted = attempts.length;
  const avgScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((acc, a) => acc + a.percentage, 0) / attempts.length
        )
      : 0;

  const weakTopics = topicMasteries.filter((m) => m.recommendedRevision);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Award className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Dynamic Adaptive Assessments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Evaluate retention with curriculum-grounded quizzes, rubric grading, and real-time mastery tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Course Selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="text-xs font-medium bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setGenerateModalOpen(true)}
            className="text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Generate Assessment
          </Button>
        </div>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Average Performance
            </span>
            <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-0.5">
              {totalCompleted > 0 ? `${avgScore}%` : 'N/A'}
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" /> Baseline Passing: 70%
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Completed Attempts
            </span>
            <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-0.5">
              {totalCompleted} Tests
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {selectedCourse?.title || 'Active Course'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Tracked Topics
            </span>
            <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-0.5">
              {topicMasteries.length} Concepts
            </div>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 block">
              {weakTopics.length > 0 ? `${weakTopics.length} Need Revision` : 'All on Track'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Weak Concept Revision Banner */}
      {weakTopics.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Revision Recommended for {weakTopics.length} Topic{weakTopics.length > 1 ? 's' : ''}
              </h4>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                {weakTopics[0]?.revisionReason ||
                  'Your recent performance indicates concept drift. Review recommended before advanced topics.'}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setGenMode('missed_practice');
              setGenTopic(weakTopics[0]?.topic || '');
              setGenerateModalOpen(true);
            }}
            className="text-xs shrink-0 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100"
          >
            Practice Weak Topics
          </Button>
        </div>
      )}

      {/* Per-Topic Mastery Progress Grid */}
      {topicMasteries.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            Topic Mastery & Adaptive Pacing
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topicMasteries.map((m) => (
              <Card
                key={m.id}
                className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {m.topic}
                    </h3>
                    <span className="text-[10px] text-slate-400 capitalize">
                      Stage: {m.currentDifficulty}
                    </span>
                  </div>
                  <Badge
                    variant={m.masteryScore >= 75 ? 'success' : m.masteryScore < 50 ? 'danger' : 'warning'}
                    size="sm"
                  >
                    {m.masteryScore}%
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      m.masteryScore >= 75
                        ? 'bg-emerald-500'
                        : m.masteryScore < 50
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${m.masteryScore}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Streak: {m.streakCount} 🔥</span>
                  <span>{m.attemptCount} questions tested</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Assessments Catalog */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-500" /> Available Assessments ({assessments.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assessments.map((a) => (
            <Card
              key={a.id}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="brand" size="sm" className="capitalize">
                    {a.mode.replace('_', ' ')}
                  </Badge>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" /> {a.timeLimitMinutes || 15}m
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {a.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {a.questionCount} curriculum-verified questions covering {a.topic || 'core modules'}.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 capitalize">
                  Level: {a.difficulty}
                </span>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/assessments/${a.id}`)}
                  className="text-xs gap-1"
                >
                  <span>Start Quiz</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {assessments.length === 0 && !isLoadingAssessments && (
          <div className="py-16 text-center rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <Sparkles className="w-8 h-8 text-indigo-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Assessments Generated Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click the "Generate Assessment" button above to dynamically produce structured quizzes from your indexed course documents.
            </p>
            <Button variant="primary" size="sm" onClick={() => setGenerateModalOpen(true)}>
              Generate First Assessment
            </Button>
          </div>
        )}
      </div>

      {/* Previous Attempts History */}
      {attempts.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="text-sm font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-indigo-500" /> Recent Assessment Submissions
          </h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Mode</th>
                  <th className="py-2.5 px-4">Score</th>
                  <th className="py-2.5 px-4">Percentage</th>
                  <th className="py-2.5 px-4">Outcome</th>
                  <th className="py-2.5 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {attempts.map((att) => (
                  <tr key={att.id}>
                    <td className="py-2.5 px-4 capitalize font-medium">{att.mode.replace('_', ' ')}</td>
                    <td className="py-2.5 px-4 font-mono">
                      {att.totalScore} / {att.maxScore}
                    </td>
                    <td className="py-2.5 px-4 font-semibold">{att.percentage}%</td>
                    <td className="py-2.5 px-4">
                      <Badge variant={att.passed ? 'success' : 'danger'} size="sm">
                        {att.passed ? 'Passed' : 'Needs Review'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {new Date(att.startedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate Assessment Modal */}
      <Dialog
        open={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="Generate Adaptive Assessment"
      >
        <div className="space-y-3.5 p-1 text-xs">
          <div>
            <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
              Assessment Mode
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'quiz', label: 'Quick Quiz (5 Qs)' },
                { id: 'topic_practice', label: 'Topic Practice' },
                { id: 'chapter_assessment', label: 'Chapter Assessment' },
                { id: 'revision_test', label: 'Revision Test' },
                { id: 'adaptive_session', label: 'Adaptive Session' },
                { id: 'missed_practice', label: 'Weak Topics Drill' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setGenMode(item.id as AssessmentMode)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all ${
                    genMode === item.id
                      ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
              Target Topic (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Dynamic Programming, Linear Algebra, Memory Hierarchy"
              value={genTopic}
              onChange={(e) => setGenTopic(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                Difficulty
              </label>
              <select
                value={genDifficulty}
                onChange={(e) => setGenDifficulty(e.target.value as AcademicLevel)}
                className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                Question Count
              </label>
              <select
                value={genQuestionCount}
                onChange={(e) => setGenQuestionCount(Number(e.target.value))}
                className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs"
              >
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGenerateModalOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateAssessment}
              disabled={isGenerating}
              className="gap-1.5"
            >
              {isGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Synthesizing Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Assessment</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
