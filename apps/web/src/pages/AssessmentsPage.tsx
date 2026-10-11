import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import { ASSESSMENTS_FIXTURE } from '../fixtures/assessments';
import {
  Award,
  Clock,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Brain,
} from 'lucide-react';

export const AssessmentsPage: React.FC = () => {
  const [filterType, setFilterType] = useState<string>('all');
  const navigate = useNavigate();

  const filtered = ASSESSMENTS_FIXTURE.filter(
    (a) => filterType === 'all' || a.type === filterType
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Award className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Assessments & Diagnostic Checkpoints
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Measure cognitive retention and verify conceptual mastery before progressing.
          </p>
        </div>

        <Tabs value={filterType} onChange={setFilterType}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="quiz">Quizzes</TabsTrigger>
            <TabsTrigger value="diagnostic">Diagnostics</TabsTrigger>
            <TabsTrigger value="challenge">Challenges</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Average Performance
            </span>
            <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-0.5">
              91.4%
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" /> Exceeds Passing Baseline
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tests Completed
            </span>
            <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-0.5">
              8 Assessments
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Across CS & Linear Algebra
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Diagnostic Readiness
            </span>
            <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-0.5">
              Level 4
            </div>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 block">
              Advanced Cognitive Stage
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Assessments List */}
      <div className="space-y-4">
        {filtered.map((asmt) => (
          <Card key={asmt.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    asmt.type === 'diagnostic'
                      ? 'accent'
                      : asmt.type === 'challenge'
                      ? 'warning'
                      : 'brand'
                  }
                  size="sm"
                >
                  {asmt.type.toUpperCase()}
                </Badge>
                <span className="text-xs text-slate-400">· {asmt.courseTitle}</span>
              </div>

              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {asmt.title}
              </h3>

              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {asmt.durationMinutes} mins
                </span>
                <span>{asmt.questionCount} Questions</span>
                <span>Pass threshold: {asmt.passingScorePercentage}%</span>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end sm:self-center">
              {asmt.completed ? (
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {asmt.scorePercentage}%
                  </span>
                  <span className="block text-[10px] text-slate-400">Recorded Score</span>
                </div>
              ) : (
                <div className="text-right">
                  <span className="text-xs font-semibold text-amber-500">Unanswered</span>
                  <span className="block text-[10px] text-slate-400">Due {asmt.dueDate}</span>
                </div>
              )}

              <Button
                variant={asmt.completed ? 'secondary' : 'primary'}
                size="md"
                onClick={() => navigate(`/assessments/${asmt.id}`)}
              >
                <span>{asmt.completed ? 'Review Answers' : 'Start Test'}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <EmptyState
            icon={<HelpCircle className="w-8 h-8 text-indigo-500" />}
            title="No Assessments in This Category"
            description="All diagnostic checkpoints in this category have been cleared."
            action={
              <Button variant="secondary" onClick={() => setFilterType('all')}>
                View All Assessments
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
};
