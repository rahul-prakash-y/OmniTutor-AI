import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import { Badge } from '../ui/Badge';
import { useAppStore } from '../../stores/useAppStore';
import { Sparkles, Activity, ShieldCheck, Menu } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { toggleSidebar, userRole, userName } = useAppStore();

  const { data: healthData, isError } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => apiClient.getHealth(),
    refetchInterval: 15000,
  });

  const isHealthy = healthData?.success && healthData.data?.status === 'healthy';
  const isDegraded = healthData?.success && healthData.data?.status === 'degraded';

  const statusVariant = isHealthy ? 'success' : isDegraded ? 'warning' : 'danger';
  const statusText = isError
    ? 'API Offline'
    : isHealthy
    ? 'Core Services Healthy'
    : isDegraded
    ? 'Degraded (Standalone)'
    : 'Connecting...';

  return (
    <header
      id="app-navbar"
      className="sticky top-0 z-40 w-full glass-panel border-b border-surface-border/80 px-4 lg:px-6 py-3 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <button
          id="btn-toggle-sidebar"
          onClick={toggleSidebar}
          aria-label="Toggle Navigation Sidebar"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-hover transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-cyan p-0.5 flex items-center justify-center shadow-glow-brand">
            <div className="w-full h-full bg-surface-dark rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-brand-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg tracking-tight gradient-text">
                OmniTutor AI
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-900/60 text-brand-300 border border-brand-500/20">
                v0.1.0 Foundation
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Adaptive Multimodal Tutoring</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* System Health Telemetry Badge */}
        <div id="navbar-health-pill" className="flex items-center">
          <Badge variant={statusVariant} size="md" className="hidden xs:inline-flex">
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthy
                  ? 'bg-emerald-400 animate-pulse'
                  : isDegraded
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <Activity className="w-3 h-3" />
            <span>{statusText}</span>
          </Badge>
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-surface-border">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-accent-violet flex items-center justify-center text-white text-xs font-bold">
            {userName.charAt(0)}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-medium text-slate-200 leading-tight">{userName}</p>
            <p className="text-[10px] text-slate-400 capitalize flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-brand-400" />
              {userRole}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
