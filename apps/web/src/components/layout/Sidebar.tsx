import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import {
  LayoutDashboard,
  BookOpen,
  Bot,
  Award,
  LineChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Flame,
  GraduationCap,
  X,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';

export const Sidebar: React.FC = () => {
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useAppStore();

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/courses', label: 'My Courses', icon: BookOpen },
    { to: '/tutor', label: 'AI Tutor', icon: Bot, badge: 'Socratic' },
    { to: '/assessments', label: 'Assessments', icon: Award },
    { to: '/progress', label: 'Progress', icon: LineChart },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar (Desktop fixed/sticky, Mobile fixed drawer) */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 lg:z-20 flex flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 transition-all duration-200 ${
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          mobileMenuOpen
            ? 'w-64 translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Logo & Brand Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              {(!sidebarCollapsed || mobileMenuOpen) && (
                <div className="flex flex-col truncate">
                  <span className="font-display font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                    OmniTutor AI
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Adaptive Workspace
                  </span>
                </div>
              )}
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Sidebar Navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navLinks.map((item) => {
              const linkContent = (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  id={`sidebar-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {(!sidebarCollapsed || mobileMenuOpen) && (
                    <div className="flex items-center justify-between flex-1 truncate">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <Badge size="sm" variant="brand">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  )}
                </NavLink>
              );

              if (sidebarCollapsed && !mobileMenuOpen) {
                return (
                  <Tooltip key={item.to} content={item.label} position="right">
                    {linkContent}
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </nav>
        </div>

        {/* Footer: Learning Streak & Collapse Toggle */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
          {(!sidebarCollapsed || mobileMenuOpen) ? (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                  5-Day Streak
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  Active
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Study 15 min today to keep your multiplier.
              </p>
            </div>
          ) : (
            <div className="flex justify-center" title="5-Day Streak Active">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
            </div>
          )}

          {/* Collapse Toggle Button (Desktop only) */}
          <button
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex w-full items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="flex items-center gap-2 text-xs font-medium">
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse Sidebar</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
