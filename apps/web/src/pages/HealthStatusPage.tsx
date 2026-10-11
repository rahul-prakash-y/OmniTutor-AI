import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Activity, RefreshCw, Terminal, Database, Brain, Compass } from 'lucide-react';

export const HealthStatusPage: React.FC = () => {
  const {
    data: healthResponse,
    isLoading: isHealthLoading,
    refetch: refetchHealth,
  } = useQuery({
    queryKey: ['system-health-detail'],
    queryFn: () => apiClient.getHealth(),
  });

  const {
    data: readyResponse,
    isLoading: isReadyLoading,
    refetch: refetchReady,
  } = useQuery({
    queryKey: ['system-readiness-detail'],
    queryFn: () => apiClient.getReadiness(),
  });

  const health = healthResponse?.data;
  const ready = readyResponse?.data;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-brand-400" />
            System Architecture & Service Telemetry
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time health status, readiness probes, and database integration lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            id="btn-refetch-health"
            onClick={() => {
              refetchHealth();
              refetchReady();
            }}
            variant="secondary"
            size="sm"
            isLoading={isHealthLoading || isReadyLoading}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Poll Telemetry</span>
          </Button>
        </div>
      </div>

      {/* Probes Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* /api/v1/health Probe */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Health Probe
              </span>
              <h2 className="text-base font-bold text-white font-mono">GET /api/v1/health</h2>
            </div>
            <Badge
              variant={
                health?.status === 'healthy'
                  ? 'success'
                  : health?.status === 'degraded'
                  ? 'warning'
                  : 'danger'
              }
            >
              {health?.status ? health.status.toUpperCase() : 'CONNECTING'}
            </Badge>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-surface-border/50">
              <span className="text-slate-400">Uptime:</span>
              <span className="font-mono text-slate-200">{health?.uptimeSeconds ?? 0}s</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-border/50">
              <span className="text-slate-400">Environment:</span>
              <span className="font-mono text-slate-200">{health?.environment ?? 'development'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-border/50">
              <span className="text-slate-400">Request ID:</span>
              <span className="font-mono text-slate-400 text-[11px] truncate max-w-[200px]">
                {healthResponse?.meta.requestId}
              </span>
            </div>
          </div>
        </Card>

        {/* /api/v1/ready Probe */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Readiness Probe
              </span>
              <h2 className="text-base font-bold text-white font-mono">GET /api/v1/ready</h2>
            </div>
            <Badge variant={ready?.ready ? 'success' : 'warning'}>
              {ready?.ready ? 'READY FOR TRAFFIC' : 'STANDALONE READY'}
            </Badge>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-surface-border/50">
              <span className="text-slate-400">Database Ready:</span>
              <span className="font-mono text-slate-200">
                {ready?.services.database ? 'true' : 'false (standalone)'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-border/50">
              <span className="text-slate-400">Vector Store Ready:</span>
              <span className="font-mono text-slate-200">
                {ready?.services.vectorStore ? 'true' : 'false (standalone)'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-border/50">
              <span className="text-slate-400">Timestamp:</span>
              <span className="font-mono text-slate-400 text-[11px]">
                {ready?.timestamp ?? new Date().toISOString()}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Services Breakdown */}
      <Card className="space-y-4">
        <h2 className="text-base font-display font-bold text-white">
          Underlying Component Lifecycle
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* MongoDB */}
          <div className="p-4 rounded-xl bg-surface-dark border border-surface-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Database className="w-4 h-4 text-emerald-400" />
                MongoDB
              </div>
              <Badge
                variant={health?.services.database.status === 'healthy' ? 'success' : 'warning'}
                size="sm"
              >
                {health?.services.database.status ?? 'degraded'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              {health?.services.database.message || 'Managing document storage for users, sessions, and mastery notes.'}
            </p>
          </div>

          {/* Qdrant */}
          <div className="p-4 rounded-xl bg-surface-dark border border-surface-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Compass className="w-4 h-4 text-cyan-400" />
                Qdrant
              </div>
              <Badge
                variant={health?.services.vectorStore.status === 'healthy' ? 'success' : 'warning'}
                size="sm"
              >
                {health?.services.vectorStore.status ?? 'degraded'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              {health?.services.vectorStore.message || 'Manages vector embeddings and semantic similarity searches.'}
            </p>
          </div>

          {/* Gemini AI */}
          <div className="p-4 rounded-xl bg-surface-dark border border-surface-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Brain className="w-4 h-4 text-brand-400" />
                Google Gemini
              </div>
              <Badge
                variant={health?.services.aiProvider.status === 'healthy' ? 'success' : 'accent'}
                size="sm"
              >
                {health?.services.aiProvider.status ?? 'degraded'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              {health?.services.aiProvider.message || 'Server-side provider abstraction ready for API key.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Docker Compose Quick Guide */}
      <Card className="space-y-4">
        <h2 className="text-base font-display font-bold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-brand-400" />
          Starting Local Infrastructure (Docker Compose)
        </h2>
        <p className="text-xs text-slate-400">
          To launch local MongoDB and Qdrant instances with healthchecks configured, run in Windows PowerShell:
        </p>
        <div className="p-4 rounded-xl bg-surface-dark border border-surface-border font-mono text-xs text-brand-300 overflow-x-auto space-y-1">
          <div>docker compose up -d</div>
          <div className="text-slate-500"># Spins up omnitutor-mongodb (port 27017) and omnitutor-qdrant (port 6333)</div>
        </div>
      </Card>
    </div>
  );
};
