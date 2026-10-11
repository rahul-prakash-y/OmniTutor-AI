import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  BookOpen,
  Bookmark,
  Copy,
  Check,
  Plus,
  Trash2,
  X,
  Compass,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Loader2,
  Tag,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import type {
  StudyToolNote,
  StudyNoteCategory,
  GroundedFlashcardItem,
  SourceCitation,
} from '@omnitutor/shared';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { toast } from '../stores/useToastStore';

interface StudyToolsModalProps {
  courseId: string;
  materialId?: string;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'summary' | 'flashcards' | 'notes';
}

export const StudyToolsModal: React.FC<StudyToolsModalProps> = ({
  courseId,
  materialId,
  isOpen,
  onClose,
  initialTab = 'summary',
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'flashcards' | 'notes'>(initialTab);

  // Summary State
  const [summaryStyle, setSummaryStyle] = useState<'concise' | 'detailed' | 'bullet_points'>('concise');
  const [summaryTopic, setSummaryTopic] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  const [summaryCitations, setSummaryCitations] = useState<SourceCitation[]>([]);

  // Flashcards State
  const [flashcardTopic, setFlashcardTopic] = useState('');
  const [flashcardCount, setFlashcardCount] = useState<number>(5);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcards, setFlashcards] = useState<GroundedFlashcardItem[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Notes State
  const [notes, setNotes] = useState<StudyToolNote[]>([]);
  const [notesFilter, setNotesFilter] = useState<string>('all');
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<StudyNoteCategory>('revision');
  const [newNoteTags, setNewNoteTags] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Load user's notes on mount or tab change
  const loadNotes = async () => {
    if (!courseId) return;
    setIsLoadingNotes(true);
    try {
      const res = await apiClient.getStudyNotes({
        courseId,
        category: notesFilter === 'all' ? undefined : notesFilter,
      });
      if (res.success && res.data) {
        setNotes(res.data);
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingNotes(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'notes') {
      loadNotes();
    }
  }, [isOpen, activeTab, notesFilter, courseId]);

  // Handle Summary Generation
  const handleGenerateSummary = async () => {
    if (!courseId) return;
    setIsGeneratingSummary(true);
    try {
      const res = await apiClient.generateGroundedSummary({
        courseId,
        materialId: materialId || undefined,
        style: summaryStyle,
        topic: summaryTopic.trim() || undefined,
      });

      if (res.success && res.data) {
        setGeneratedSummary(res.data.summary);
        setSummaryCitations(res.data.citations || []);
        toast.success('Grounded summary generated with curriculum citations.', 'Summary Ready');
      } else {
        toast.error(res.error?.message || 'Failed to generate summary', 'Error');
      }
    } catch (err: any) {
      toast.error(err.message || 'Generation failed', 'Network Error');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Handle Flashcards Generation
  const handleGenerateFlashcards = async () => {
    if (!courseId) return;
    setIsGeneratingFlashcards(true);
    try {
      const res = await apiClient.generateGroundedFlashcards({
        courseId,
        materialId: materialId || undefined,
        topic: flashcardTopic.trim() || undefined,
        count: flashcardCount,
      });

      if (res.success && res.data && res.data.flashcards?.length > 0) {
        setFlashcards(res.data.flashcards);
        setCurrentCardIndex(0);
        setIsCardFlipped(false);
        toast.success(`Generated ${res.data.flashcards.length} grounded flashcards.`, 'Flashcards Ready');
      } else {
        toast.error(res.error?.message || 'No flashcards generated from content', 'Notice');
      }
    } catch (err: any) {
      toast.error(err.message || 'Flashcards generation failed', 'Error');
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  // Save current summary as a note
  const handleSaveSummaryToNotebook = async () => {
    if (!generatedSummary) return;
    try {
      const res = await apiClient.createStudyNote({
        courseId,
        category: 'summary',
        title: summaryTopic.trim() ? `Summary: ${summaryTopic}` : 'AI Material Summary',
        content: generatedSummary,
        tags: ['ai-summary', 'grounded'],
        citations: summaryCitations,
      });
      if (res.success) {
        toast.success('Summary saved to your study notebook.', 'Saved Note');
      }
    } catch {
      toast.error('Unable to save summary note.', 'Error');
    }
  };

  // Save active flashcard as a note
  const handleSaveFlashcardToNotebook = async () => {
    const card = flashcards[currentCardIndex];
    if (!card) return;
    try {
      const res = await apiClient.createStudyNote({
        courseId,
        category: 'flashcard',
        title: `Flashcard: ${card.front.slice(0, 45)}...`,
        content: `Q: ${card.front}\n\nA: ${card.back}`,
        tags: ['flashcard', card.topic || 'curriculum'],
        flashcardData: { front: card.front, back: card.back },
        citations: card.citations,
      });
      if (res.success) {
        toast.success('Flashcard saved to your notebook.', 'Saved Flashcard');
      }
    } catch {
      toast.error('Unable to save flashcard.', 'Error');
    }
  };

  // Handle Note Creation
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    try {
      const tags = newNoteTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await apiClient.createStudyNote({
        courseId,
        title: newNoteTitle.trim(),
        content: newNoteContent.trim(),
        category: newNoteCategory,
        tags,
      });

      if (res.success) {
        toast.success('Revision note added to notebook.', 'Note Created');
        setNewNoteTitle('');
        setNewNoteContent('');
        setNewNoteTags('');
        setIsCreatingNote(false);
        loadNotes();
      }
    } catch {
      toast.error('Failed to create note.', 'Error');
    }
  };

  // Handle Note Delete
  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await apiClient.deleteStudyNote(noteId);
      if (res.success) {
        toast.success('Note removed from notebook.', 'Deleted');
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
    } catch {
      toast.error('Failed to delete note.', 'Error');
    }
  };

  // Copy with citation excerpt
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  const currentFlashcard = flashcards[currentCardIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="OmniTutor Study Tools"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/75 dark:bg-black/85 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Study Tools Dialog */}
      <div className="relative w-full max-w-4xl h-[86vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Curriculum Study Tools
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-800">
                  RAG-Grounded
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI summaries, adaptive flashcard drills, and revision notebook with verifiable citations.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex items-center gap-2 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'summary'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Grounded Summaries
          </button>

          <button
            onClick={() => setActiveTab('flashcards')}
            className={`py-3.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'flashcards'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Adaptive Flashcards
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'notes'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            Revision Notebook
          </button>
        </div>

        {/* Tab Body Contents */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/40">
          {/* TAB 1: GROUNDED SUMMARIES */}
          {activeTab === 'summary' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Generation Controls */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Focus Concept or Topic (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. State Transitions, Time Complexity"
                      value={summaryTopic}
                      onChange={(e) => setSummaryTopic(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Summary Format
                    </label>
                    <div className="flex items-center gap-1.5">
                      {(['concise', 'detailed', 'bullet_points'] as const).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setSummaryStyle(style)}
                          className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                            summaryStyle === style
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {style.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isGeneratingSummary}
                    onClick={handleGenerateSummary}
                    className="text-xs flex items-center gap-2 shadow-sm"
                  >
                    {isGeneratingSummary ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Synthesizing Grounded Evidence...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate Grounded Summary
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Rendered Summary Result */}
              {generatedSummary && (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-elevated space-y-6 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      Grounded AI Summary
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveSummaryToNotebook}
                        className="text-xs flex items-center gap-1"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        Save to Notebook
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy('summary-text', generatedSummary)}
                        className="text-xs flex items-center gap-1"
                      >
                        {copiedId === 'summary-text' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === 'summary-text' ? 'Copied' : 'Copy'}</span>
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {generatedSummary}
                  </div>

                  {/* Verifiable Source Citations */}
                  {summaryCitations.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Compass className="w-3 h-3 text-indigo-500" /> Grounded Source Evidence:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {summaryCitations.map((cite, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {cite.originalFilename}
                              </span>
                              {cite.page && (
                                <Badge variant="neutral" size="sm">
                                  Page {cite.page}
                                </Badge>
                              )}
                              {cite.slide && (
                                <Badge variant="neutral" size="sm">
                                  Slide {cite.slide}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2">
                              "{cite.excerpt}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADAPTIVE FLASHCARDS */}
          {activeTab === 'flashcards' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Generation Controls */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center gap-3 justify-between">
                <div className="w-full sm:w-auto flex-1">
                  <input
                    type="text"
                    placeholder="Focus Topic (e.g. Memoization, Knapsack)"
                    value={flashcardTopic}
                    onChange={(e) => setFlashcardTopic(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {[5, 10, 15].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setFlashcardCount(cnt)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                        flashcardCount === cnt
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {cnt} Cards
                    </button>
                  ))}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={isGeneratingFlashcards}
                  onClick={handleGenerateFlashcards}
                  className="w-full sm:w-auto text-xs flex items-center gap-2 shadow-sm shrink-0"
                >
                  {isGeneratingFlashcards ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Generating Flashcards...
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5" />
                      Generate Flashcards
                    </>
                  )}
                </Button>
              </div>

              {/* Interactive Flashcard Deck */}
              {flashcards.length > 0 && currentFlashcard ? (
                <div className="space-y-4">
                  {/* Card Deck Counter & Actions */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Card {currentCardIndex + 1} of {flashcards.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveFlashcardToNotebook}
                        className="text-xs flex items-center gap-1"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        Save Card
                      </Button>
                    </div>
                  </div>

                  {/* 3D Flip Flashcard */}
                  <div
                    onClick={() => setIsCardFlipped(!isCardFlipped)}
                    className="w-full min-h-[300px] p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-elevated cursor-pointer flex flex-col justify-between transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-700 select-none group"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant={isCardFlipped ? 'success' : 'brand'} size="sm">
                        {isCardFlipped ? 'Answer & Evidence' : 'Prompt Question'}
                      </Badge>
                      <span className="text-[11px] text-slate-400 group-hover:text-indigo-600 flex items-center gap-1">
                        <RotateCw className="w-3 h-3" /> Click to flip
                      </span>
                    </div>

                    <div className="py-6 text-center space-y-4">
                      <h3 className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-slate-100 leading-snug">
                        {isCardFlipped ? currentFlashcard.back : currentFlashcard.front}
                      </h3>
                      {isCardFlipped && currentFlashcard.citations?.[0] && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 border border-slate-200 dark:border-slate-700">
                          <Compass className="w-3 h-3 text-indigo-500" />
                          <span>Source: {currentFlashcard.citations[0].originalFilename}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-center text-[11px] text-slate-400">
                      Topic: {currentFlashcard.topic || 'Curriculum Concept'}
                    </div>
                  </div>

                  {/* Next / Prev Controls */}
                  <div className="flex items-center justify-between gap-4 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentCardIndex <= 0}
                      onClick={() => {
                        setCurrentCardIndex((prev) => Math.max(0, prev - 1));
                        setIsCardFlipped(false);
                      }}
                      className="text-xs flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Previous Card
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentCardIndex >= flashcards.length - 1}
                      onClick={() => {
                        setCurrentCardIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
                        setIsCardFlipped(false);
                      }}
                      className="text-xs flex items-center gap-1.5"
                    >
                      Next Card
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                  <Layers className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p>Generate grounded flashcards to test your retrieval retention.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REVISION NOTEBOOK */}
          {activeTab === 'notes' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Header with New Note Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
                  {['all', 'explanation', 'revision', 'summary', 'flashcard'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setNotesFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-colors ${
                        notesFilter === cat
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreatingNote(!isCreatingNote)}
                  className="text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isCreatingNote ? 'Cancel' : 'New Note'}
                </Button>
              </div>

              {/* Create Note Inline Form */}
              {isCreatingNote && (
                <form
                  onSubmit={handleCreateNote}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 animate-in fade-in duration-150"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Recurrence relation formulation"
                        value={newNoteTitle}
                        onChange={(e) => setNewNoteTitle(e.target.value)}
                        required
                        className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Category
                      </label>
                      <select
                        value={newNoteCategory}
                        onChange={(e) => setNewNoteCategory(e.target.value as StudyNoteCategory)}
                        className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="revision">Revision Note</option>
                        <option value="explanation">Saved Explanation</option>
                        <option value="summary">Summary</option>
                        <option value="flashcard">Flashcard</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Note Content
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Write your personal notes, insights, or formulas here..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      required
                      className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. algorithms, dynamic-programming, exam-prep"
                      value={newNoteTags}
                      onChange={(e) => setNewNoteTags(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCreatingNote(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" className="text-xs">
                      Save Note
                    </Button>
                  </div>
                </form>
              )}

              {/* Notes List */}
              {isLoadingNotes ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading notebook entries...</div>
              ) : notes.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                  <Bookmark className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p>Your revision notebook is empty for this course.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {note.title}
                            </h4>
                            <Badge variant="neutral" size="sm" className="capitalize">
                              {note.category}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopy(note.id, note.content)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                            title="Copy note text"
                          >
                            {copiedId === note.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {note.content}
                      </p>

                      {note.tags && note.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1">
                          {note.tags.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
