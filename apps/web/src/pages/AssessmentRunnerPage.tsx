import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { toast } from '../stores/useToastStore';
import { ASSESSMENTS_FIXTURE } from '../fixtures/assessments';
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  Flag,
  CheckCircle2,
  XCircle,
  Bot,
  RotateCcw,
} from 'lucide-react';

export const AssessmentRunnerPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  const assessment =
    ASSESSMENTS_FIXTURE.find((a) => a.id === assessmentId) || ASSESSMENTS_FIXTURE[0];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(
    (assessment?.durationMinutes || 15) * 60
  );
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (submitted) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted]);

  if (!assessment) {
    return (
      <EmptyState
        title="Assessment Not Found"
        description="The requested assessment could not be located."
        action={
          <Button variant="primary" onClick={() => navigate('/assessments')}>
            Back to Assessments
          </Button>
        }
      />
    );
  }

  const currentQ = assessment.questions[currentIdx];
  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const handleSelectOption = (optionIdx: number) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentIdx]: optionIdx }));
  };

  const handleToggleFlag = () => {
    setFlagged((prev) => ({ ...prev, [currentIdx]: !prev[currentIdx] }));
    toast.info(
      flagged[currentIdx] ? 'Flag removed' : 'Question flagged for review',
      'Bookmark'
    );
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setShowResultsModal(true);
    toast.success('Assessment submitted successfully!', 'Results Calculated');
  };

  // Score calculation
  const totalQuestions = assessment.questions.length;
  let correctCount = 0;
  assessment.questions.forEach((q, idx) => {
    if (selectedAnswers[idx] === q.correctOptionIndex) {
      correctCount++;
    }
  });
  const scorePercent = Math.round((correctCount / totalQuestions) * 100);
  const passed = scorePercent >= assessment.passingScorePercentage;

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <Link
          to="/assessments"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Exit Assessment
        </Link>

        {/* Live Timer Pill */}
        <div className="flex items-center gap-2">
          <Badge
            variant={timeLeftSeconds < 180 ? 'danger' : 'neutral'}
            size="md"
            className="font-mono text-xs"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Time Left: {timeFormatted}</span>
          </Badge>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Question {currentIdx + 1} of {totalQuestions}
          </span>
          <span className="text-slate-400">
            {Object.keys(selectedAnswers).length} Answered
          </span>
        </div>
        <div className="flex gap-1.5">
          {assessment.questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIdx(i)}
              className={`h-2 flex-1 rounded-full transition-all cursor-pointer ${
                i === currentIdx
                  ? 'bg-indigo-600 dark:bg-indigo-500'
                  : selectedAnswers[i] !== undefined
                  ? 'bg-slate-400 dark:bg-slate-600'
                  : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question Card */}
      {currentQ && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 font-display leading-snug">
              {currentQ.prompt}
            </h2>
            <Button
              variant={flagged[currentIdx] ? 'secondary' : 'ghost'}
              size="sm"
              onClick={handleToggleFlag}
              className="shrink-0 text-xs"
            >
              <Flag
                className={`w-3.5 h-3.5 mr-1 ${
                  flagged[currentIdx] ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
                }`}
              />
              {flagged[currentIdx] ? 'Flagged' : 'Flag'}
            </Button>
          </div>

          {currentQ.codeSnippet && (
            <div className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs border border-slate-800">
              <pre>{currentQ.codeSnippet}</pre>
            </div>
          )}

          {/* Multiple Choice Options */}
          <div className="space-y-3">
            {currentQ.options.map((opt, optIdx) => {
              const isSelected = selectedAnswers[currentIdx] === optIdx;
              const isCorrect = currentQ.correctOptionIndex === optIdx;
              const showValidation = submitted;

              return (
                <button
                  key={optIdx}
                  type="button"
                  disabled={submitted}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`w-full text-left p-4 rounded-xl border text-xs sm:text-sm font-medium transition-all duration-150 flex items-start gap-3 cursor-pointer ${
                    showValidation
                      ? isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-100'
                        : isSelected
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-100'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 opacity-60'
                      : isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 text-indigo-900 dark:text-indigo-100 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full border text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 text-slate-500'
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="flex-1">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation if submitted */}
          {submitted && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 block">
                Explanation:
              </span>
              <p>{currentQ.explanation}</p>
            </div>
          )}
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Previous
        </Button>

        <div className="flex items-center gap-3">
          {currentIdx < totalQuestions - 1 ? (
            <Button
              variant="primary"
              onClick={() => setCurrentIdx((prev) => Math.min(totalQuestions - 1, prev + 1))}
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
            >
              {submitted ? 'View Results Summary' : 'Submit Assessment'}
            </Button>
          )}
        </div>
      </div>

      {/* Submission Results Modal */}
      <Dialog
        open={showResultsModal}
        onClose={() => setShowResultsModal(false)}
        title="Assessment Result"
        description={`${assessment.title} Benchmark Score`}
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowResultsModal(false);
                setSubmitted(false);
                setSelectedAnswers({});
                setCurrentIdx(0);
                setTimeLeftSeconds((assessment.durationMinutes || 15) * 60);
              }}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retake Test
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/tutor')}
            >
              <Bot className="w-4 h-4 mr-1.5" /> Review With AI Tutor
            </Button>
          </div>
        }
      >
        <div className="text-center py-4 space-y-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
              passed ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-500' : 'bg-rose-50 dark:bg-rose-950 text-rose-500'
            }`}
          >
            {passed ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
          </div>

          <div>
            <div className="text-3xl font-display font-bold text-slate-900 dark:text-slate-100">
              {scorePercent}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              You answered {correctCount} of {totalQuestions} questions correctly.
            </p>
          </div>

          <Badge variant={passed ? 'success' : 'danger'} size="md">
            {passed ? 'Passed Benchmark' : 'Below Passing Threshold'}
          </Badge>

          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            {passed
              ? 'Great job! Your conceptual retention exceeds the target threshold for this topic.'
              : 'Review your missed questions below or open an AI Tutor session to work through the recurrence relations.'}
          </p>
        </div>
      </Dialog>
    </div>
  );
};
