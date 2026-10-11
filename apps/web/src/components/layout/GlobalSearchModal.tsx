import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { apiClient } from '../../services/apiClient';
import {
  Search,
  BookOpen,
  FileText,
  Sparkles,
  Award,
  MessageSquare,
  Bookmark,
  X,
  ArrowRight,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import type { SearchResultItem, SearchResultCategory } from '@omnitutor/shared';

export const GlobalSearchModal: React.FC = () => {
  const { searchModalOpen, setSearchModalOpen } = useAppStore();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K and Esc
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

  // Debounced search effect with request cancellation
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await apiClient.globalSearch(
          {
            q: query.trim(),
            category: activeCategory === 'all' ? undefined : activeCategory,
            limit: 15,
            hybrid: true,
          },
          controller.signal
        );

        if (res.success && res.data) {
          setResults(res.data.results);
          setSelectedIndex(0);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // ignore aborted errors
        }
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, activeCategory]);

  const handleSelect = (item: SearchResultItem) => {
    setSearchModalOpen(false);
    setQuery('');
    navigate(item.linkUrl);
  };

  const handleKeyDownNav = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  if (!searchModalOpen) return null;

  const getCategoryIcon = (category: SearchResultCategory) => {
    switch (category) {
      case 'course':
        return <BookOpen className="w-4 h-4 text-cyan-500" />;
      case 'material':
        return <FileText className="w-4 h-4 text-indigo-500" />;
      case 'chunk':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'note':
        return <Bookmark className="w-4 h-4 text-emerald-500" />;
      case 'conversation':
        return <MessageSquare className="w-4 h-4 text-amber-500" />;
      case 'assessment':
        return <Award className="w-4 h-4 text-rose-500" />;
      default:
        return <ExternalLink className="w-4 h-4 text-slate-400" />;
    }
  };

  const categoryTabs = [
    { id: 'all', label: 'All' },
    { id: 'course', label: 'Courses' },
    { id: 'material', label: 'Materials' },
    { id: 'chunk', label: 'Curriculum Excerpts' },
    { id: 'note', label: 'Notes' },
    { id: 'conversation', label: 'Chats' },
    { id: 'assessment', label: 'Assessments' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Search Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 sm:px-6"
    >
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={() => setSearchModalOpen(false)}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-elevated border border-slate-200 dark:border-slate-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDownNav}
            placeholder="Search courses, concepts, assessments, materials, or saved notes..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
          {isSearching && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />}
          <button
            onClick={() => setSearchModalOpen(false)}
            aria-label="Close search"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 overflow-x-auto text-[11px]">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeCategory === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {query.trim() === '' ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p>Type keywords to search across your authorized curriculum.</p>
              <div className="flex items-center justify-center gap-2 pt-2 text-[10px] text-slate-400">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border">↑↓</kbd> to navigate
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border">↵</kbd> to select
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border">esc</kbd> to close
              </div>
            </div>
          ) : results.length === 0 && !isSearching ? (
            <div className="py-10 text-center text-xs text-slate-400 space-y-1">
              <p>No matching results found for "{query}".</p>
              <p className="text-[11px] text-slate-500">Try searching for course titles, concepts, or topics.</p>
            </div>
          ) : (
            results.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-xl cursor-pointer transition-colors flex items-start gap-3 ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="mt-0.5 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs shrink-0">
                    {getCategoryIcon(item.category)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                        {item.category}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {item.snippet}
                    </p>

                    {item.location && (
                      <div className="flex items-center gap-2 pt-0.5 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                        {item.location.pageNumber && <span>Page {item.location.pageNumber}</span>}
                        {item.location.slideNumber && <span>Slide {item.location.slideNumber}</span>}
                        {item.location.timestamp && (
                          <span>
                            {Math.floor(item.location.timestamp.start / 60)}:
                            {(item.location.timestamp.start % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                        {item.courseTitle && <span>• {item.courseTitle}</span>}
                      </div>
                    )}
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 text-slate-400 self-center shrink-0 transition-transform ${
                      isSelected ? 'translate-x-1 text-indigo-600' : ''
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
