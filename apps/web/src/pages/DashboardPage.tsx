import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '../services/apiClient';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../stores/useAppStore';
import {
  Sparkles,
  Database,
  Cpu,
  Brain,
  Compass,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';
import type { TutoringMode } from '@omnitutor/shared';

const NewSessionFormSchema = z.object({
  title: z.string().min(3, 'Topic title must be at least 3 characters').max(100),
  subject: z.string().min(1, 'Please select a subject'),
  mode: z.enum(['socratic', 'direct', 'quiz', 'code_review']),
});

type NewSessionFormData = z.infer<typeof NewSessionFormSchema>;

export const DashboardPage: React.FC = () => {
  const { activeMode, setActiveMode, userName } = useAppStore();
  const [createdSession, setCreatedSession] = useState<string | null>(null);

  const { data: healthResponse, refetch: refetchHealth } = useQuery({
    queryKey: ['system-health-dashboard'],
    queryFn: () => apiClient.getHealth(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NewSessionFormData>({
    resolver: zodResolver(NewSessionFormSchema),
    defaultValues: {
      title: 'Introduction to Dynamic Programming & Memoization',
      subject: 'Computer Science',
      mode: activeMode,
    },
  });

  const onSubmit = (data: NewSessionFormData) => {
    setActiveMode(data.mode as TutoringMode);
    setCreatedSession(data.title);
    setTimeout(() => {
      reset();
    }, 4000);
  };

  const health = healthResponse?.data;

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden glass-panel rounded-3xl p-6 lg:p-8 border border-surface-border">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-950/80 border border-brand-500/30 text-xs text-brand-300 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>Foundation Architecture Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-white tracking-tight">
              Welcome back, <span className="gradient-text">{userName}</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed">
              OmniTutor AI continuously analyzes cognitive comprehension, adjusting Socratic inquiry depth
              and multimodal learning pathways across sciences and humanities.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              id="btn-hero-start"
              onClick={() => {
                const formElem = document.getElementById('new-session-form');
                formElem?.scrollIntoView({ behavior: 'smooth' });
              }}
              variant="primary"
              size="lg"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Session</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Live Service Infrastructure Matrix */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold text-slate-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand-400" />
            Infrastructure & Integration Telemetry
          </h2>
          <button
            onClick={() => refetchHealth()}
            className="text-xs text-brand-400 hover:text-brand-300 underline cursor-pointer"
          >
            Refresh Status
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* API Server */}
          <Card hover className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Fastify Backend
              </span>
              <Badge variant={healthResponse?.success ? 'success' : 'danger'} size="sm">
                {healthResponse?.success ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <div className="text-xl font-bold font-display text-white">
              {health ? `${health.environment.toUpperCase()}` : 'Connecting...'}
            </div>
            <p className="text-xs text-slate-400">
              {health ? `Uptime: ${health.uptimeSeconds}s | v${health.version}` : 'Checking /api/v1/health'}
            </p>
          </Card>

          {/* Database */}
          <Card hover className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-accent-emerald" />
                MongoDB
              </span>
              <Badge
                variant={health?.services.database.status === 'healthy' ? 'success' : 'warning'}
                size="sm"
              >
                {health?.services.database.status === 'healthy' ? 'Connected' : 'Standalone'}
              </Badge>
            </div>
            <div className="text-xl font-bold font-display text-white">
              {health?.services.database.status === 'healthy'
                ? `${health.services.database.latencyMs ?? 1} ms`
                : 'Mongoose Ready'}
            </div>
            <p className="text-xs text-slate-400">
              {health?.services.database.status === 'healthy'
                ? 'Docker container connected'
                : 'Graceful fallback mode active'}
            </p>
          </Card>

          {/* Qdrant Vector Store */}
          <Card hover className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-accent-cyan" />
                Qdrant Vectors
              </span>
              <Badge
                variant={health?.services.vectorStore.status === 'healthy' ? 'success' : 'warning'}
                size="sm"
              >
                {health?.services.vectorStore.status === 'healthy' ? 'Active' : 'Standby'}
              </Badge>
            </div>
            <div className="text-xl font-bold font-display text-white">
              {health?.services.vectorStore.status === 'healthy' ? 'Vector DB Ready' : 'Service Abstracted'}
            </div>
            <p className="text-xs text-slate-400">
              Embeddings & semantic memory
            </p>
          </Card>

          {/* Gemini AI Provider */}
          <Card hover className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-brand-400" />
                Google Gemini
              </span>
              <Badge
                variant={health?.services.aiProvider.status === 'healthy' ? 'success' : 'accent'}
                size="sm"
              >
                {health?.services.aiProvider.status === 'healthy' ? 'Configured' : 'Offline Provider'}
              </Badge>
            </div>
            <div className="text-xl font-bold font-display text-white">
              gemini-2.0-flash
            </div>
            <p className="text-xs text-slate-400">
              {health?.services.aiProvider.status === 'healthy'
                ? 'Live AI generation ready'
                : 'Server-side provider abstraction'}
            </p>
          </Card>
        </div>
      </section>

      {/* Main Grid: Launcher + Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Launch Form */}
        <section className="lg:col-span-2 space-y-4">
          <Card id="new-session-form" className="space-y-5">
            <div className="border-b border-surface-border pb-4">
              <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                Launch Adaptive Tutoring Session
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure your subject, topic, and preferred pedagogical interaction paradigm.
              </p>
            </div>

            {createdSession && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <strong>Session initialized:</strong> &ldquo;{createdSession}&rdquo; ready for cognitive dialogue.
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="input-session-title" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Learning Topic or Problem Statement
                </label>
                <input
                  id="input-session-title"
                  type="text"
                  placeholder="e.g. Graph Algorithms, Quantum Superposition, Linear Regression"
                  {...register('title')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
                {errors.title && (
                  <p className="text-rose-400 text-xs mt-1">{errors.title.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="select-session-subject" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Academic Subject
                  </label>
                  <select
                    id="select-session-subject"
                    {...register('subject')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-slate-100 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                  >
                    <option value="Computer Science">Computer Science & Algorithms</option>
                    <option value="Mathematics">Calculus & Linear Algebra</option>
                    <option value="Physics">Quantum & Classical Mechanics</option>
                    <option value="Chemistry">Organic Chemistry</option>
                    <option value="Biology">Molecular Biology & Genetics</option>
                    <option value="Philosophy">Logic & Epistemology</option>
                  </select>
                  {errors.subject && (
                    <p className="text-rose-400 text-xs mt-1">{errors.subject.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="select-session-mode" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Pedagogical Strategy
                  </label>
                  <select
                    id="select-session-mode"
                    {...register('mode')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-dark border border-surface-border text-slate-100 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                  >
                    <option value="socratic">Socratic Dialogue (Guided Questions)</option>
                    <option value="direct">Direct Synthesis (Deep Explanation)</option>
                    <option value="quiz">Adaptive Mastery Check (Active Recall)</option>
                    <option value="code_review">Code & Problem Walkthrough</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  Adapts questioning depth based on answers
                </span>

                <Button
                  id="btn-submit-session"
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                >
                  <span>Launch Session</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </form>
          </Card>

          {/* Quick Start Suggested Prompts */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Curated Diagnostic Concepts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { title: 'Explain Backpropagation intuitively', subject: 'Computer Science' },
                { title: 'Why is the determinant of a matrix the volume change?', subject: 'Mathematics' },
                { title: 'Derive Heisenberg uncertainty from wave packets', subject: 'Physics' },
                { title: 'Explain Gibbs free energy and spontaneity', subject: 'Chemistry' },
              ].map((sample, i) => (
                <button
                  key={i}
                  id={`btn-sample-topic-${i}`}
                  onClick={() => reset({ title: sample.title, subject: sample.subject, mode: activeMode })}
                  className="p-3 rounded-xl glass-panel text-left text-xs hover:border-brand-500/40 transition-colors cursor-pointer"
                >
                  <p className="font-medium text-slate-200">{sample.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{sample.subject}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Side Panel: Adaptive Cognitive Analytics */}
        <section className="space-y-4">
          <Card className="space-y-4">
            <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent-cyan" />
              Cognitive Profile & Mastery
            </h3>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-surface-dark border border-surface-border">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Conceptual Retention</span>
                  <span className="text-brand-300 font-bold">89%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-brand-500 to-accent-cyan h-1.5 rounded-full w-[89%]" />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-dark border border-surface-border">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Socratic Inquiry Depth</span>
                  <span className="text-accent-emerald font-bold">Level 4 (Advanced)</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-accent-cyan h-1.5 rounded-full w-[78%]" />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-dark border border-surface-border">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Knowledge Graph Nodes</span>
                  <span className="text-accent-amber font-bold">142 Concept Nodes</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-rose-400 h-1.5 rounded-full w-[65%]" />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-brand-950/40 border border-brand-500/20 text-[11px] text-slate-300 space-y-1">
              <div className="font-semibold text-brand-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Adaptive Learning Tip
              </div>
              <p className="text-slate-400">
                You retain complex algorithms 34% better when guided through counter-example testing before direct code implementation.
              </p>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
};
