import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { LayoutDashboard, MessagesSquare, Activity, Layers, GraduationCap, Sparkles, ChevronLeft, ChevronRight, } from 'lucide-react';
export const Sidebar = () => {
    const { sidebarOpen, toggleSidebar, activeMode, setActiveMode } = useAppStore();
    const navItems = [
        {
            to: '/',
            label: 'Dashboard',
            icon: LayoutDashboard,
            badge: 'Module 1',
        },
        {
            to: '/sessions',
            label: 'Tutoring Sessions',
            icon: MessagesSquare,
            badge: 'Preview',
        },
        {
            to: '/health',
            label: 'System & Services',
            icon: Activity,
        },
    ];
    const modes = [
        { id: 'socratic', label: 'Socratic Dialogue', description: 'Guided inquiry & reasoning' },
        { id: 'direct', label: 'Direct Explanation', description: 'Conceptual breakdown' },
        { id: 'quiz', label: 'Adaptive Quiz', description: 'Active recall verification' },
        { id: 'code_review', label: 'Code & Math Tutor', description: 'Step-by-step problem solver' },
    ];
    return (_jsxs("aside", { id: "app-sidebar", className: `fixed lg:static inset-y-0 left-0 z-30 flex flex-col justify-between glass-panel border-r border-surface-border/80 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`, children: [_jsxs("div", { className: "p-4 space-y-6", children: [_jsxs("div", { className: "hidden lg:flex items-center justify-between pb-2 border-b border-surface-border", children: [_jsx("span", { className: `text-xs font-semibold uppercase tracking-wider text-slate-400 ${!sidebarOpen && 'hidden'}`, children: "Navigation" }), _jsx("button", { id: "btn-collapse-sidebar", onClick: toggleSidebar, "aria-label": sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar', className: "p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-hover transition-colors ml-auto", children: sidebarOpen ? _jsx(ChevronLeft, { className: "w-4 h-4" }) : _jsx(ChevronRight, { className: "w-4 h-4" }) })] }), _jsx("nav", { className: "space-y-1.5", "aria-label": "Main Navigation", children: navItems.map((item) => (_jsxs(NavLink, { to: item.to, id: `nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`, className: ({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover'}`, children: [_jsx(item.icon, { className: "w-5 h-5 flex-shrink-0 text-brand-400" }), sidebarOpen && (_jsxs("div", { className: "flex items-center justify-between flex-1 truncate", children: [_jsx("span", { children: item.label }), item.badge && (_jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-surface-card border border-surface-border text-slate-400", children: item.badge }))] }))] }, item.to))) }), sidebarOpen && (_jsxs("div", { className: "pt-4 border-t border-surface-border/60", children: [_jsx("div", { className: "flex items-center justify-between mb-2", children: _jsxs("span", { className: "text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5", children: [_jsx(Sparkles, { className: "w-3.5 h-3.5 text-brand-400" }), "Tutoring Mode"] }) }), _jsx("div", { className: "space-y-1.5", children: modes.map((m) => (_jsxs("button", { id: `btn-mode-${m.id}`, onClick: () => setActiveMode(m.id), className: `w-full text-left p-2 rounded-xl text-xs transition-all ${activeMode === m.id
                                        ? 'bg-brand-950/80 border border-brand-500/40 text-brand-200 font-medium'
                                        : 'text-slate-400 hover:bg-surface-card/60 hover:text-slate-300'}`, children: [_jsx("div", { className: "font-semibold", children: m.label }), _jsx("div", { className: "text-[10px] text-slate-500 truncate", children: m.description })] }, m.id))) })] }))] }), _jsx("div", { className: "p-4 border-t border-surface-border", children: sidebarOpen ? (_jsxs("div", { className: "glass-panel rounded-xl p-3 border border-surface-border/60 text-xs", children: [_jsxs("div", { className: "flex items-center gap-2 text-slate-300 font-semibold mb-1", children: [_jsx(Layers, { className: "w-4 h-4 text-accent-cyan" }), _jsx("span", { children: "Full-Stack Monorepo" })] }), _jsx("p", { className: "text-[11px] text-slate-400 leading-relaxed", children: "React + Fastify + MongoDB + Qdrant + Gemini AI abstraction." })] })) : (_jsx("div", { className: "flex justify-center", title: "OmniTutor AI Monorepo", children: _jsx(GraduationCap, { className: "w-5 h-5 text-brand-400" }) })) })] }));
};
