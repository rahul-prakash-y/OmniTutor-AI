import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { toast } from '../stores/useToastStore';
import { apiClient } from '../services/apiClient';
import type {
  Assessment,
  AssessmentAttempt,
  ClientAssessmentQuestion,
  QuestionSubmission,
} from '@omnitutor/shared';
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  Flag,
  CheckCircle2,
  Lightbulb,
  Award,
  Compass,
  Check,
  TrendingUp,
} from 'lucide-react';

export const AssessmentRunnerPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  // State
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, unknown>>({});
  const [hintsUsed, setHintsUsed] = useState<Record<string, number>>({});
  const [showHint, setShowHint] = useState<Record<string, boolean>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(15 * 60);

  // Submission & Results
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAttempt, setSubmittedAttempt] = useState<AssessmentAttempt | null>(null);

  // 1. Fetch Assessment
  useEffect(() => {
    if (!assessmentId) return;

    const fetchAssessment = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.getAssessment(assessmentId);
        if (res.success && res.data) {
          setAssessment(res.data);
          setTimeLeftSeconds((res.data.timeLimitMinutes || 15) * 60);
        } else {
          toast.error(res.error?.message || 'Assessment not found', 'Error');
        }
      } catch {
        toast.error('Unable to fetch assessment details', 'Network Error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssessment();
  }, [assessmentId]);

  // 2. Timer Countdown
  useEffect(() => {
    if (submittedAttempt || !assessment) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [submittedAttempt, assessment]);

  if (isLoading) {
    return (
      <div className="py-24 text-center max-w-md mx-auto space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
        <p className="text-xs text-slate-500">Loading verified assessment questions...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <EmptyState
        title="Assessment Not Found"
        description="The requested assessment session could not be located."
        action={
          <Button variant="primary" onClick={() => navigate('/assessments')}>
            Back to Assessments
          </Button>
        }
      />
    );
  }

  const questions: ClientAssessmentQuestion[] = assessment.clientQuestions || [];
  const currentQ = questions[currentIdx];

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Answer handler
  const handleAnswerChange = (qId: string, answer: unknown) => {
    if (submittedAttempt) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: answer }));
  };

  const handleToggleHint = (qId: string) => {
    if (submittedAttempt) return;
    const isShown = showHint[qId];
    if (!isShown) {
      setHintsUsed((prev) => ({ ...prev, [qId]: (prev[qId] || 0) + 1 }));
    }
    setShowHint((prev) => ({ ...prev, [qId]: !isShown }));
  };

  const handleToggleFlag = (qId: string) => {
    setFlagged((prev) => ({ ...prev, [qId]: !prev[qId] }));
    toast.info(flagged[qId] ? 'Bookmark removed' : 'Question bookmarked for review', 'Bookmark');
  };

  // Submit Attempt
  const handleSubmit = async () => {
    if (isSubmitting || submittedAttempt) return;

    const payload: QuestionSubmission[] = questions.map((q) => ({
      questionId: q.id,
      userAnswer: userAnswers[q.id] !== undefined ? userAnswers[q.id] : '',
      hintsUsed: hintsUsed[q.id] || 0,
      timeSpentSeconds: 60,
    }));

    setIsSubmitting(true);
    try {
      const res = await apiClient.submitAssessmentAttempt(assessment.id, payload);
      if (res.success && res.data) {
        setSubmittedAttempt(res.data);
        toast.success('Assessment scored against curriculum rubrics!', 'Scored');
      } else {
        toast.error(res.error?.message || 'Failed to submit attempt', 'Error');
      }
    } catch {
      toast.error('Submission failed. Check network.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <Link
          to="/assessments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Assessments
        </Link>

        <div className="flex items-center gap-3">
          <Badge variant="brand" size="sm" className="capitalize">
            {assessment.mode.replace('_', ' ')}
          </Badge>

          {!submittedAttempt && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                timeLeftSeconds < 120
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 animate-pulse'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{timeFormatted}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress & Question Jump Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold">
            Question {currentIdx + 1} of {questions.length}
          </span>
          <span>
            {Object.keys(userAnswers).length} of {questions.length} Answered
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {questions.map((q, idx) => {
            const isAnswered = userAnswers[q.id] !== undefined;
            const isFlag = flagged[q.id];
            const isCurrent = idx === currentIdx;

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIdx(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all relative ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-700'
                    : isAnswered
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {idx + 1}
                {isFlag && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Card */}
      {currentQ && (
        <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
          {/* Question Meta Header */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Topic: {currentQ.topic}
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                {currentQ.prompt}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => handleToggleFlag(currentQ.id)}
              className={`p-1.5 rounded-lg border transition-colors ${
                flagged[currentQ.id]
                  ? 'bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950 dark:border-amber-700'
                  : 'text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-700'
              }`}
              title="Bookmark question"
            >
              <Flag className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* Interactive Question Inputs by Type */}
          <div className="space-y-3">
            {/* 1. Multiple Choice (Single) */}
            {currentQ.type === 'multiple_choice' && currentQ.options && (
              <div className="space-y-2">
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = userAnswers[currentQ.id] === optIdx;
                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleAnswerChange(currentQ.id, optIdx)}
                      className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-slate-300 text-slate-500'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. Multiple Select (Multi) */}
            {currentQ.type === 'multiple_select' && currentQ.options && (
              <div className="space-y-2">
                <span className="text-[11px] text-slate-400 italic">
                  Select all options that apply:
                </span>
                {currentQ.options.map((opt, optIdx) => {
                  const currentSelected = Array.isArray(userAnswers[currentQ.id])
                    ? (userAnswers[currentQ.id] as number[])
                    : [];
                  const isSelected = currentSelected.includes(optIdx);

                  return (
                    <div
                      key={optIdx}
                      onClick={() => {
                        const updated = isSelected
                          ? currentSelected.filter((i) => i !== optIdx)
                          : [...currentSelected, optIdx];
                        handleAnswerChange(currentQ.id, updated);
                      }}
                      className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-indigo-600 pointer-events-none"
                        />
                        <span>{opt}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. True / False */}
            {currentQ.type === 'true_false' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { val: true, label: 'True' },
                  { val: false, label: 'False' },
                ].map((item) => {
                  const isSelected = userAnswers[currentQ.id] === item.val;
                  return (
                    <button
                      key={String(item.val)}
                      type="button"
                      onClick={() => handleAnswerChange(currentQ.id, item.val)}
                      className={`py-3.5 px-4 rounded-xl text-sm font-bold border transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 4. Short Answer (Rubric Evaluation) */}
            {currentQ.type === 'short_answer' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">
                  Provide your structured response for rubric-based AI grading:
                </label>
                <textarea
                  rows={4}
                  value={String(userAnswers[currentQ.id] || '')}
                  onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                  placeholder="Type your explanation clearly..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>
            )}

            {/* 5. Flashcard Concept Check */}
            {currentQ.type === 'flashcard' && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 text-center">
                <p className="text-xs text-slate-500">
                  Reflect on the definition before marking your recollection:
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    variant={userAnswers[currentQ.id] === true ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handleAnswerChange(currentQ.id, true)}
                  >
                    I Know This Concept
                  </Button>
                  <Button
                    variant={userAnswers[currentQ.id] === false ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => handleAnswerChange(currentQ.id, false)}
                  >
                    Review Again Later
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Progressive Hint Drawer */}
          {currentQ.hints && currentQ.hints.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleHint(currentQ.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{showHint[currentQ.id] ? 'Hide Hint' : 'Request Progressive Hint'}</span>
                </button>

                {hintsUsed[currentQ.id] && (
                  <span className="text-[10px] text-slate-400">
                    Hint requested ({hintsUsed[currentQ.id]}x)
                  </span>
                )}
              </div>

              {showHint[currentQ.id] && (
                <div className="mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  💡 <strong>Hint:</strong> {currentQ.hints[0]}
                </div>
              )}
            </div>
          )}

          {/* Bottom Card Navigation Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="gap-1 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Previous
            </Button>

            {currentIdx < questions.length - 1 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                className="gap-1 text-xs"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || submittedAttempt !== null}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting ? (
                  <span>Evaluating Answers...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Assessment</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Results Review & Diagnostic Feedback Modal */}
      {submittedAttempt && (
        <div className="mt-8 space-y-6 pt-6 border-t-2 border-indigo-100 dark:border-indigo-950">
          <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-400">
                  Attempt Results Summary
                </span>
                <h3 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-500" /> Score: {submittedAttempt.percentage}%
                  ({submittedAttempt.totalScore} / {submittedAttempt.maxScore} pts)
                </h3>
              </div>

              <Badge
                variant={submittedAttempt.passed ? 'success' : 'danger'}
                size="md"
                className="text-xs"
              >
                {submittedAttempt.passed ? 'Passed Assessment' : 'Revision Required'}
              </Badge>
            </div>

            {/* Per-Topic Mastery Outcomes */}
            {Object.keys(submittedAttempt.topicOutcomes || {}).length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                  Adaptive Mastery Outcomes:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(submittedAttempt.topicOutcomes).map(([topic, res]) => (
                    <div
                      key={topic}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold block">{topic}</span>
                        <span className="text-[10px] text-slate-400">
                          {res.correct}/{res.total} answered correctly
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xs">
                          {res.newMastery}%
                        </span>
                        <span
                          className={`text-[10px] block font-semibold ${
                            res.masteryChange >= 0 ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {res.masteryChange >= 0 ? `+${res.masteryChange}%` : `${res.masteryChange}%`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Question-by-Question Solution Breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-500" />
              Verified Answers & Grounded Citations
            </h3>

            {submittedAttempt.responses.map((resp, idx) => {
              return (
                <Card
                  key={resp.questionId}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Q{idx + 1}. {questions[idx]?.prompt}
                    </span>
                    <Badge variant={resp.isCorrect ? 'success' : 'danger'} size="sm">
                      {resp.score} / {resp.maxScore} pts
                    </Badge>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800 space-y-1">
                    <p className="text-slate-600 dark:text-slate-300">
                      <strong>Feedback:</strong> {resp.feedback}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      <strong>Grounded Explanation:</strong> {resp.explanation}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => navigate('/assessments')}>
              Back to Assessments Catalog
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
