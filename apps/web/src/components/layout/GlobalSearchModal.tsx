import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { Search, BookOpen, Bot, Award, LineChart, Settings, X, ArrowRight } from 'lucide-react';
import { COURSES_FIXTURE } from '../../fixtures/courses';
import { ASSESSMENTS_FIXTURE } from '../../fixtures/assessments';

export const GlobalSearchModal: React.FC = () => {
  const { searchModalOpen, setSearchModalOpen } = useAppStore();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen(!searchModalOpen);
      }
      if (e.key === 'Escape' && searchModalOpen) {
        setSearchModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchModalOpen, setSearchModalOpen]);

  if (!searchModalOpen) return null;

  const filteredCourses = COURSES_FIXTURE.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const filteredAssessments = ASSESSMENTS_FIXTURE.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.courseTitle.toLowerCase().includes(query.toLowerCase())
  );

  const quickNav = [
    { label: 'AI Tutor Workspace', path: '/tutor', icon: <Bot className="w-4 h-4 text-indigo-500" /> },
    { label: 'My Learning Progress', path: '/progress', icon: <LineChart className="w-4 h-4 text-emerald-500" /> },
    { label: 'Course Catalog', path: '/courses', icon: <BookOpen className="w-4 h-4 text-cyan-500" /> },
    { label: 'Assessments', path: '/assessments', icon: <Award className="w-4 h-4 text-amber-500" /> },
    { label: 'Account & Model Settings', path: '/settings', icon: <Settings className="w-4 h-4 text-slate-500" /> },
  ];

  const handleSelect = (path: string) => {
    navigate(path);
    setSearchModalOpen(false);
    setQuery('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Search Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-6"
    >
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={() => setSearchModalOpen(false)}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-elevated border border-slate-200 dark:border-slate-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, concepts, assessments, or navigation..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={() => setSearchModalOpen(false)}
            aria-label="Close search"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 text-xs">
          {/* Quick Navigation */}
          {!query && (
            <div>
              <p className="px-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Quick Navigation
              </p>
              <div className="space-y-0.5">
                {quickNav.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleSelect(item.path)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filtered Courses */}
          {filteredCourses.length > 0 && (
            <div>
              <p className="px-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Courses ({filteredCourses.length})
              </p>
              <div className="space-y-0.5">
                {filteredCourses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(`/courses/${c.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <div>
                      <p className="font-semibold">{c.title}</p>
                      <p className="text-[10px] text-slate-400">{c.category} · {c.difficulty}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {c.progressPercentage}% done
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filtered Assessments */}
          {filteredAssessments.length > 0 && (
            <div>
              <p className="px-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Assessments ({filteredAssessments.length})
              </p>
              <div className="space-y-0.5">
                {filteredAssessments.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleSelect(`/assessments/${a.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <div>
                      <p className="font-semibold">{a.title}</p>
                      <p className="text-[10px] text-slate-400">{a.courseTitle} · {a.durationMinutes} min</p>
                    </div>
                    <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                      Start Test
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && filteredCourses.length === 0 && filteredAssessments.length === 0 && (
            <div className="py-8 text-center text-slate-400">
              <p>No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-[11px] text-slate-500 mt-1">Try searching for &quot;Dynamic Programming&quot; or &quot;Algebra&quot;</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">Esc</kbd> to close</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono">↵</kbd> to select</span>
          </div>
          <span className="font-medium text-indigo-600 dark:text-indigo-400">OmniTutor AI Search</span>
        </div>
      </div>
    </div>
  );
};
