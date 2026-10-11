import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import {
  WEEKLY_STUDY_TIME,
  SKILL_MASTERY_LIST,
  MILESTONE_BADGES,
} from '../fixtures/progress';
import {
  LineChart,
  Flame,
  Award,
  Clock,
  TrendingUp,
  Brain,
} from 'lucide-react';

export const ProgressPage: React.FC = () => {
  const maxWeeklyHours = Math.max(...WEEKLY_STUDY_TIME.map((d) => d.hours), 5);
  const totalWeeklyHours = WEEKLY_STUDY_TIME.reduce((acc, d) => acc + d.hours, 0).toFixed(1);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <LineChart className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Cognitive Analytics & Skill Mastery
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Real-time measurement of retention, inquiry depth, and time allocation.
        </p>
      </div>

      {/* Top 3 High Level KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Weekly Practice
            </span>
            <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">
              {totalWeeklyHours} Hours
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" /> +18% over prior week
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cognitive Streak
            </span>
            <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">
              5 Consecutive Days
            </div>
            <span className="text-[11px] text-amber-500 font-semibold mt-0.5 block">
              Flame Multiplier: 1.5x
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
            <Flame className="w-5 h-5 fill-amber-500" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overall Retention Index
            </span>
            <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">
              88.4%
            </div>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 block">
              Optimal Learning Rate
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Weekly Study Time Bar Chart & Streak Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Bar Chart */}
        <Card className="lg:col-span-2 space-y-4 p-6">
          <CardHeader className="p-0 border-0">
            <CardTitle>Weekly Time Allocation</CardTitle>
            <CardDescription>Daily focused study hours (Mon – Sun)</CardDescription>
          </CardHeader>

          <div className="pt-4 flex items-end justify-between gap-3 h-48">
            {WEEKLY_STUDY_TIME.map((item) => {
              const heightPercent = Math.round((item.hours / maxWeeklyHours) * 100);
              return (
                <div key={item.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    {item.hours}h
                  </span>
                  <div className="w-full max-w-[42px] bg-slate-100 dark:bg-slate-800 rounded-t-lg h-36 flex items-end p-1">
                    <div
                      className="w-full bg-indigo-600 dark:bg-indigo-500 rounded-md transition-all duration-300"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Milestones & Badges */}
        <Card className="space-y-4 p-6">
          <CardHeader className="p-0 border-0">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-500" />
              <CardTitle>Milestone Badges</CardTitle>
            </div>
            <CardDescription>Verified pedagogical achievements</CardDescription>
          </CardHeader>

          <div className="space-y-3 pt-2">
            {MILESTONE_BADGES.map((badge) => (
              <div
                key={badge.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    {badge.title}
                  </h4>
                  <span className="text-[10px] text-slate-400">{badge.earnedDate}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {badge.description}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Conceptual Mastery Matrix Table */}
      <Card className="space-y-4 p-6">
        <CardHeader className="p-0 border-0 pb-2">
          <CardTitle>Topic & Skill Mastery Breakdown</CardTitle>
          <CardDescription>
            Continuous evaluation based on diagnostic questions and active problem solving.
          </CardDescription>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Skill & Concept Area</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Mastery Bar</TableHead>
              <TableHead className="text-right">Level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SKILL_MASTERY_LIST.map((item) => (
              <TableRow key={item.skill}>
                <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                  {item.skill}
                </TableCell>
                <TableCell>
                  <Badge variant="neutral" size="sm">
                    {item.category}
                  </Badge>
                </TableCell>
                <TableCell className="w-48">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${item.masteryPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-8 text-right">
                      {item.masteryPercentage}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={
                      item.level === 'Master'
                        ? 'success'
                        : item.level === 'Proficient'
                        ? 'brand'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {item.level}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
