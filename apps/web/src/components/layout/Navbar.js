import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';
import { Badge } from '../ui/Badge';
import { useAppStore } from '../../stores/useAppStore';
import { Sparkles, Activity, ShieldCheck, Menu } from 'lucide-react';
export const Navbar = () => {
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
    return (_jsxs("header", { id: "app-navbar", className: "sticky top-0 z-40 w-full glass-panel border-b border-surface-border/80 px-4 lg:px-6 py-3 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { id: "btn-toggle-sidebar", onClick: toggleSidebar, "aria-label": "Toggle Navigation Sidebar", className: "p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-hover transition-colors lg:hidden", children: _jsx(Menu, { className: "w-5 h-5" }) }), _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-cyan p-0.5 flex items-center justify-center shadow-glow-brand", children: _jsx("div", { className: "w-full h-full bg-surface-dark rounded-[10px] flex items-center justify-center", children: _jsx(Sparkles, { className: "w-4 h-4 text-brand-400" }) }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-display font-bold text-lg tracking-tight gradient-text", children: "OmniTutor AI" }), _jsx("span", { className: "hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-900/60 text-brand-300 border border-brand-500/20", children: "v0.1.0 Foundation" })] }), _jsx("p", { className: "text-xs text-slate-400 hidden sm:block", children: "Adaptive Multimodal Tutoring" })] })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { id: "navbar-health-pill", className: "flex items-center", children: _jsxs(Badge, { variant: statusVariant, size: "md", className: "hidden xs:inline-flex", children: [_jsx("span", { className: `w-2 h-2 rounded-full ${isHealthy
                                        ? 'bg-emerald-400 animate-pulse'
                                        : isDegraded
                                            ? 'bg-amber-400'
                                            : 'bg-rose-400'}` }), _jsx(Activity, { className: "w-3 h-3" }), _jsx("span", { children: statusText })] }) }), _jsxs("div", { className: "flex items-center gap-2.5 pl-2 border-l border-surface-border", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-gradient-to-tr from-brand-500 to-accent-violet flex items-center justify-center text-white text-xs font-bold", children: userName.charAt(0) }), _jsxs("div", { className: "hidden md:block text-left", children: [_jsx("p", { className: "text-xs font-medium text-slate-200 leading-tight", children: userName }), _jsxs("p", { className: "text-[10px] text-slate-400 capitalize flex items-center gap-1", children: [_jsx(ShieldCheck, { className: "w-3 h-3 text-brand-400" }), userRole] })] })] })] })] }));
};
