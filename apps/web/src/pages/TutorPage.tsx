import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { CitationPopover } from '../components/CitationPopover';
import { MaterialViewerModal } from '../components/MaterialViewerModal';
import { StudyToolsModal } from '../components/StudyToolsModal';
import { toast } from '../stores/useToastStore';
import { apiClient } from '../services/apiClient';
import type {
  Course,
  Conversation,
  ConversationMessage,
  TutoringMode,
  AcademicLevel,
  ExplanationStyle,
  ConceptNote,
} from '@omnitutor/shared';
import {
  Bot,
  User,
  Send,
  BookOpen,
  Pin,
  Lightbulb,
  RotateCcw,
  Copy,
  Check,
  Plus,
  Trash2,
  Bookmark,
  Sparkles,
  Layers,
  Search,
  Square,
  Compass,
} from 'lucide-react';

export const TutorPage: React.FC = () => {
  // Courses state
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // Pedagogical Controls
  const [mode, setMode] = useState<TutoringMode>('socratic');
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>('intermediate');
  const [explanationStyle, setExplanationStyle] = useState<ExplanationStyle>('step_by_step');

  // Messages state
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Notes state
  const [conceptNotes, setConceptNotes] = useState<ConceptNote[]>([]);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [newNoteModalOpen, setNewNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // UI helpers
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Material Viewer & Study Tools state
  const [viewerMaterialId, setViewerMaterialId] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [studyToolsOpen, setStudyToolsOpen] = useState(false);
  const [studyToolsTab, setStudyToolsTab] = useState<'summary' | 'flashcards' | 'notes'>('summary');

  // 1. Fetch available courses
  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoadingCourses(true);
      try {
        const res = await apiClient.getCourses();
        if (res.success && res.data) {
          setCourses(res.data.courses);
          if (res.data.courses.length > 0) {
            setSelectedCourseId(res.data.courses[0]!.id);
          }
        }
      } catch {
        toast.error('Failed to load courses for tutor session', 'Error');
      } finally {
        setIsLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  // 2. Fetch conversations when selectedCourseId changes
  useEffect(() => {
    if (!selectedCourseId) return;

    const fetchConversations = async () => {
      setIsLoadingConversations(true);
      try {
        const res = await apiClient.listConversations(selectedCourseId);
        if (res.success && res.data) {
          setConversations(res.data.items);
          if (res.data.items.length > 0) {
            setActiveConversationId(res.data.items[0]!.id);
          } else {
            setActiveConversationId(null);
            setMessages([]);
          }
        }
      } catch {
        // Fallback
      } finally {
        setIsLoadingConversations(false);
      }
    };

    fetchConversations();
    fetchNotes();
  }, [selectedCourseId]);

  // 3. Fetch messages when activeConversationId changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const res = await apiClient.getConversationMessages(activeConversationId);
        if (res.success && res.data) {
          setMessages(res.data.items);
        }
      } catch {
        // Fallback
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [activeConversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Fetch concept notes for the course
  const fetchNotes = async () => {
    if (!selectedCourseId) return;
    try {
      const res = await apiClient.listConceptNotes(selectedCourseId);
      if (res.success && res.data) {
        setConceptNotes(res.data);
      }
    } catch {
      // Ignored
    }
  };

  // Start new conversation
  const handleCreateNewConversation = async () => {
    if (!selectedCourseId) {
      toast.info('Please select or create a course first', 'Select Course');
      return;
    }

    const course = courses.find((c) => c.id === selectedCourseId);
    const title = `${course?.title || 'Course'} - ${mode.toUpperCase()} Session`;

    try {
      const res = await apiClient.createConversation(selectedCourseId, {
        title,
        mode,
        academicLevel,
        explanationStyle,
      });

      if (res.success && res.data) {
        const newConv = res.data;
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
        setMessages([]);
        toast.success('Started new tutoring session', 'Session Created');
      }
    } catch {
      toast.error('Failed to create session', 'Error');
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiClient.deleteConversation(convId);
      if (res.success) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (activeConversationId === convId) {
          const remaining = conversations.filter((c) => c.id !== convId);
          setActiveConversationId(remaining[0]?.id || null);
        }
        toast.info('Conversation deleted', 'Deleted');
      }
    } catch {
      toast.error('Could not delete conversation', 'Error');
    }
  };

  // Pin / Unpin conversation
  const handleTogglePin = async (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiClient.updateConversation(conv.id, {
        isPinned: !conv.isPinned,
      });
      if (res.success && res.data) {
        const updated = res.data;
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? updated : c))
        );
      }
    } catch {
      // Ignored
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string, requestHint = false) => {
    const text = textToSend || inputVal;
    if (!text.trim() || isGenerating) return;

    let convId = activeConversationId;
    if (!convId) {
      if (!selectedCourseId) {
        toast.error('Please select an active course first', 'No Course');
        return;
      }
      // Auto-create conversation
      const course = courses.find((c) => c.id === selectedCourseId);
      const res = await apiClient.createConversation(selectedCourseId, {
        title: `${course?.title || 'Tutoring'} - ${mode.toUpperCase()}`,
        mode,
        academicLevel,
        explanationStyle,
      });
      if (res.success && res.data) {
        const newConv = res.data;
        convId = newConv.id;
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(convId);
      } else {
        toast.error('Failed to start conversation', 'Error');
        return;
      }
    }

    const optimisticUserMsg: ConversationMessage = {
      id: `temp-${Date.now()}`,
      conversationId: convId,
      courseId: selectedCourseId,
      userId: 'current-user',
      role: 'user',
      content: text.trim(),
      citations: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setInputVal('');
    setIsGenerating(true);

    abortControllerRef.current = new AbortController();

    try {
      const res = await apiClient.sendConversationMessage(convId, {
        content: text.trim(),
        academicLevel,
        explanationStyle,
        requestHint,
      });

      if (res.success && res.data) {
        const assistantMsg = res.data;
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        toast.error(res.error?.message || 'AI generation encountered an issue', 'Generation Error');
      }
    } catch {
      toast.error('Failed to send message to tutor engine', 'Network Error');
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Stop generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
    toast.info('Generation stopped', 'Cancelled');
  };

  // Regenerate last assistant response
  const handleRegenerate = async (msgId: string) => {
    if (!activeConversationId || isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await apiClient.regenerateMessage(activeConversationId, msgId, {
        academicLevel,
        explanationStyle,
      });
      if (res.success && res.data) {
        const regeneratedMsg = res.data;
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? regeneratedMsg : m))
        );
        toast.success('Response regenerated', 'Success');
      }
    } catch {
      toast.error('Failed to regenerate response', 'Error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save concept note from message
  const handleSaveNote = async () => {
    if (!selectedCourseId || !noteTitle.trim() || !noteContent.trim()) {
      toast.error('Please enter note title and content', 'Validation');
      return;
    }

    try {
      const res = await apiClient.createConceptNote(selectedCourseId, {
        title: noteTitle.trim(),
        content: noteContent.trim(),
        conversationId: activeConversationId || undefined,
        tags: [mode, academicLevel],
      });

      if (res.success && res.data) {
        const newNote = res.data;
        setConceptNotes((prev) => [newNote, ...prev]);
        setNewNoteModalOpen(false);
        setNoteTitle('');
        setNoteContent('');
        toast.success('Concept note saved successfully!', 'Saved');
      }
    } catch {
      toast.error('Failed to save concept note', 'Error');
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Answer copied to clipboard', 'Copied');
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    toast.success('Code copied to clipboard', 'Copied');
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Render markdown text with citations and code blocks
  const renderMessageContent = (msg: ConversationMessage) => {
    const text = msg.content;
    const parts = text.split(/(```[\s\S]*?```)/g);

    return (
      <div className="space-y-3">
        {parts.map((part, pIdx) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const rawCode = part.slice(3, -3);
            const firstNewline = rawCode.indexOf('\n');
            const lang = firstNewline !== -1 ? rawCode.slice(0, firstNewline).trim() : '';
            const code = firstNewline !== -1 ? rawCode.slice(firstNewline + 1) : rawCode;
            const codeId = `${msg.id}-${pIdx}`;

            return (
              <div
                key={codeId}
                className="relative my-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 overflow-hidden shadow-md"
              >
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/80 text-[11px] text-slate-400 border-b border-slate-800/80">
                  <span className="font-mono uppercase font-semibold">{lang || 'Code'}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(codeId, code)}
                    className="inline-flex items-center gap-1 hover:text-white transition-colors"
                  >
                    {copiedCodeId === codeId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedCodeId === codeId ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3.5 text-xs font-mono overflow-x-auto leading-relaxed">
                  <code>{code}</code>
                </pre>
              </div>
            );
          }

          // Format paragraphs and inline citations
          return (
            <div key={pIdx} className="text-sm leading-relaxed whitespace-pre-wrap">
              {renderParagraphWithCitations(part, msg.citations || [])}
            </div>
          );
        })}

        {/* Display citations summary cards if assistant */}
        {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Compass className="w-3 h-3 text-indigo-500" /> Sources:
            </span>
            {msg.citations.map((cite, idx) => (
              <CitationPopover
                key={cite.chunkId || idx}
                citation={cite}
                index={idx}
                onOpenMaterial={(matId) => {
                  setViewerMaterialId(matId);
                  setIsViewerOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Replace [cite:1] or [1] with interactive CitationPopover
  const renderParagraphWithCitations = (text: string, citations: any[]) => {
    const citeRegex = /(\[cite:?\s*[a-zA-Z0-9_-]+\]|\[\d+\])/gi;
    const pieces = text.split(citeRegex);

    return pieces.map((piece, idx) => {
      const match = piece.match(/\[cite:?\s*([a-zA-Z0-9_-]+)\]|\[(\d+)\]/i);
      if (match) {
        const citeKey = (match[1] || match[2] || '').toLowerCase();
        const found = citations.find(
          (c, cIdx) =>
            c.id?.toLowerCase() === citeKey ||
            c.id?.toLowerCase() === `cite-${citeKey}` ||
            String(cIdx + 1) === citeKey
        );
        if (found) {
          return (
            <CitationPopover
              key={idx}
              citation={found}
              onOpenMaterial={(matId) => {
                setViewerMaterialId(matId);
                setIsViewerOpen(true);
              }}
            />
          );
        }
      }
      return piece;
    });
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(conversationSearch.toLowerCase())
  );

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-7xl mx-auto pb-4">
      {/* Top Banner & Course Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
              OmniTutor AI Cognitive Workspace
              <Badge variant="brand" size="sm">
                RAG Grounded
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evidence-based Socratic mentoring personalized to your active course curriculum.
            </p>
          </div>
        </div>

        {/* Global Course Switcher */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Active Course:
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            disabled={isLoadingCourses}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.academicLevel})
              </option>
            ))}
            {courses.length === 0 && <option value="">No courses created yet</option>}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotesDrawer(!showNotesDrawer)}
            className="text-xs flex items-center gap-1.5"
          >
            <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
            <span>Notes ({conceptNotes.length})</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStudyToolsTab('summary');
              setStudyToolsOpen(true);
            }}
            className="text-xs flex items-center gap-1.5 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Study Tools</span>
          </Button>
        </div>
      </div>

      {/* 3-Panel Main Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* PANEL 1: Left Navigation & Session Manager (3 Cols) */}
        <div className="lg:col-span-3 flex flex-col gap-3 min-h-0">
          <Card className="flex-1 p-3 flex flex-col min-h-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
            {/* New Session Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateNewConversation}
              className="w-full justify-center text-xs font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Start New Session
            </Button>

            {/* Pedagogical Preferences */}
            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Mentoring Mode
                </span>
                <div className="grid grid-cols-2 gap-1">
                  {(['socratic', 'direct', 'quiz', 'code_review'] as TutoringMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`px-2 py-1 rounded text-[11px] font-medium capitalize text-center transition-all ${
                        mode === m
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Academic Depth
                </span>
                <select
                  value={academicLevel}
                  onChange={(e) => setAcademicLevel(e.target.value as AcademicLevel)}
                  className="w-full px-2 py-1 rounded text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <option value="beginner">Beginner (Foundations)</option>
                  <option value="intermediate">Intermediate (Standard)</option>
                  <option value="advanced">Advanced (Deep Rigor)</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Explanation Style
                </span>
                <select
                  value={explanationStyle}
                  onChange={(e) => setExplanationStyle(e.target.value as ExplanationStyle)}
                  className="w-full px-2 py-1 rounded text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <option value="step_by_step">Step-by-Step Breakdown</option>
                  <option value="analogy">Intuitive Analogies</option>
                  <option value="summary">Executive Summary</option>
                  <option value="revision_notes">Revision Notes</option>
                </select>
              </div>
            </div>

            {/* Conversation Search */}
            <div className="relative my-2.5">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
              {filteredConversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`group relative p-2.5 rounded-xl cursor-pointer text-left transition-all ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 shadow-xs'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100">
                        {conv.title}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(conv, e)}
                          className={`p-0.5 rounded text-slate-400 hover:text-indigo-600 ${
                            conv.isPinned ? 'text-indigo-600 opacity-100' : ''
                          }`}
                          title="Pin conversation"
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          className="p-0.5 rounded text-slate-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span className="capitalize">{conv.mode}</span>
                      <span>{conv.messageCount} messages</span>
                    </div>
                  </div>
                );
              })}

              {isLoadingConversations && (
                <div className="py-6 text-center text-xs text-slate-400">Loading sessions...</div>
              )}

              {!isLoadingConversations && filteredConversations.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No sessions found. Start a new session above!
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* PANEL 2: Center Interactive Chat Workspace (6 or 9 Cols) */}
        <div className={`flex flex-col min-h-0 ${showNotesDrawer ? 'lg:col-span-6' : 'lg:col-span-9'}`}>
          <Card className="flex-1 p-0 flex flex-col min-h-0 overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
            {/* Header info bar */}
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/30">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedCourse?.title || 'OmniTutor Workspace'}
                </span>
                <span>•</span>
                <Badge variant="brand" size="sm" className="capitalize">
                  {mode}
                </Badge>
                <Badge variant="neutral" size="sm" className="capitalize">
                  {academicLevel}
                </Badge>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>RAG Verified</span>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {isLoadingMessages && (
                <div className="py-8 text-center text-xs text-slate-400">Loading messages...</div>
              )}
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isUser
                          ? 'bg-slate-800 text-white dark:bg-slate-700'
                          : 'bg-indigo-600 text-white shadow-xs'
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`relative group rounded-2xl px-4 py-3 max-w-[85%] ${
                        isUser
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xs'
                      }`}
                    >
                      {isUser ? (
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                      ) : (
                        renderMessageContent(msg)
                      )}

                      {/* Assistant Actions Bar */}
                      {!isUser && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyText(msg.content)}
                              className="hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                            >
                              <Copy className="w-3 h-3" /> Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNoteTitle(`Explanation: ${msg.content.slice(0, 40)}...`);
                                setNoteContent(msg.content);
                                setNewNoteModalOpen(true);
                              }}
                              className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
                            >
                              <Bookmark className="w-3 h-3" /> Save Note
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRegenerate(msg.id)}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" /> Retry
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Generating / Typing Indicator */}
              {isGenerating && (
                <div className="flex gap-3 max-w-2xl">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500">
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 animate-bounce delay-150" />
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 animate-bounce delay-300" />
                    <span className="ml-2 font-medium">Retrieving verified evidence & formulating explanation...</span>
                  </div>
                </div>
              )}

              {messages.length === 0 && !isGenerating && (
                <div className="py-20 text-center max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
                    <Lightbulb className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    Your Socratic Tutor is Ready
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Ask any question based on your uploaded curriculum. The tutor answers with verified citations and adjusts explanations to your preferred pace.
                  </p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Pedagogy Action Chips */}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs bg-slate-50/50 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={() => handleSendMessage('Can you give me a progressive hint on this concept without revealing the final answer?', true)}
                className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 font-medium shrink-0 flex items-center gap-1 transition-colors"
              >
                <Lightbulb className="w-3 h-3" /> Progressive Hint
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Could you explain this using an intuitive real-world analogy?')}
                className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 font-medium shrink-0 flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3 h-3" /> Explain with Analogy
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Please provide a step-by-step breakdown of how this works.')}
                className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-medium shrink-0 flex items-center gap-1 transition-colors"
              >
                <Layers className="w-3 h-3" /> Step-by-Step
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Summarize this into bulleted revision notes for exam preparation.')}
                className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-medium shrink-0 flex items-center gap-1 transition-colors"
              >
                <Bookmark className="w-3 h-3" /> Revision Notes
              </button>
            </div>

            {/* Input Box Area */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900"
            >
              <input
                type="text"
                placeholder={
                  selectedCourseId
                    ? `Ask anything about ${selectedCourse?.title || 'the curriculum'}...`
                    : 'Select a course to ask questions...'
                }
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                disabled={isGenerating || !selectedCourseId}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 disabled:opacity-50"
              />

              {isGenerating ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleStopGeneration}
                  className="px-4 py-2 text-rose-600 border-rose-300 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40"
                >
                  <Square className="w-4 h-4 mr-1 fill-current" /> Stop
                </Button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isGenerating || !selectedCourseId}
                    onClick={() =>
                      handleSendMessage(
                        inputVal.trim()
                          ? `${inputVal.trim()} (Please provide a progressive hint first)`
                          : 'Can you give me a progressive hint on the current concept?',
                        true
                      )
                    }
                    className="px-3 py-2 text-xs gap-1 text-amber-600 border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/40"
                    title="Request a progressive Socratic hint before full solution"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden sm:inline">Ask Hint</span>
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!inputVal.trim() || !selectedCourseId}
                    className="px-4 py-2"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </form>
          </Card>
        </div>

        {/* PANEL 3: Drawer for Saved Concept Notes (3 Cols when open) */}
        {showNotesDrawer && (
          <div className="lg:col-span-3 flex flex-col min-h-0">
            <Card className="flex-1 p-3.5 flex flex-col min-h-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-indigo-500" /> Saved Concept Notes
                </h3>
                <button
                  type="button"
                  onClick={() => setNewNoteModalOpen(true)}
                  className="p-1 rounded-md text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                  title="New Note"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 mt-2.5 pr-1 min-h-0">
                {conceptNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100">
                      <span className="truncate">{note.title}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiClient.deleteConceptNote(note.courseId, note.id);
                          setConceptNotes((prev) => prev.filter((n) => n.id !== note.id));
                        }}
                        className="text-slate-400 hover:text-rose-500 ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400 text-[11px] line-clamp-3 leading-relaxed">
                      {note.content}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {note.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {conceptNotes.length === 0 && (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No notes saved yet. Save any explanation using the "Save Note" button under assistant messages.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Save Note Modal */}
      <Dialog
        open={newNoteModalOpen}
        onClose={() => setNewNoteModalOpen(false)}
        title="Save Concept Note"
      >
        <div className="space-y-3 p-1 text-xs">
          <div>
            <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
              Note Title
            </label>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="e.g. Master Theorem Key Conditions"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="font-semibold block mb-1 text-slate-700 dark:text-slate-300">
              Content / Explanation
            </label>
            <textarea
              rows={5}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setNewNoteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveNote}>
              Save Note
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Material Interactive Viewer Modal */}
      <MaterialViewerModal
        materialId={viewerMaterialId}
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          setViewerMaterialId(null);
        }}
        onOpenStudyTools={(matId, tab) => {
          setViewerMaterialId(matId);
          setStudyToolsTab(tab);
          setStudyToolsOpen(true);
        }}
      />

      {/* Study Tools Modal (Grounded Summaries, Adaptive Flashcards, Notebook) */}
      <StudyToolsModal
        courseId={selectedCourseId}
        materialId={viewerMaterialId || undefined}
        isOpen={studyToolsOpen}
        onClose={() => setStudyToolsOpen(false)}
        initialTab={studyToolsTab}
      />
    </div>
  );
};
