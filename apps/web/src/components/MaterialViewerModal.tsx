import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Film,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Copy,
  Check,
  Sparkles,
  Clock,
  Layers,
  Sliders,
  Bookmark,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import type { MaterialContentDetails } from '@omnitutor/shared';
import { Button } from './ui/Button';

interface MaterialViewerModalProps {
  materialId: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialPage?: number;
  initialSlide?: number;
  initialTimestamp?: number;
  onOpenStudyTools?: (materialId: string, initialTab: 'summary' | 'flashcards' | 'notes') => void;
}

export const MaterialViewerModal: React.FC<MaterialViewerModalProps> = ({
  materialId,
  isOpen,
  onClose,
  initialPage,
  initialSlide,
  initialTimestamp,
  onOpenStudyTools,
}) => {
  const [content, setContent] = useState<MaterialContentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Viewer Navigation States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [currentTimestampSeconds, setCurrentTimestampSeconds] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // In-Viewer Search State
  const [viewerSearchQuery, setViewerSearchQuery] = useState('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const playerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load Material Content
  useEffect(() => {
    if (!isOpen || !materialId) {
      setContent(null);
      return;
    }

    const loadContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.getMaterialViewerContent(materialId);
        if (res.success && res.data) {
          setContent(res.data);
          const startPage = initialPage || 1;
          const startSlide = initialSlide || 1;
          const startTime = initialTimestamp || 0;

          setCurrentPage(startPage);
          setCurrentSlide(startSlide);
          setCurrentTimestampSeconds(startTime);

          // Record recent material view tracking
          await apiClient.recordRecentMaterialView(materialId, {
            page: startPage,
            timestamp: startTime,
          });
        } else {
          setError(res.error?.message || 'Failed to load material viewer content');
        }
      } catch (err: any) {
        setError(err.message || 'Error communicating with viewer service');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [isOpen, materialId, initialPage, initialSlide, initialTimestamp]);

  // Video playback simulator for transcript navigation
  useEffect(() => {
    if (isPlaying) {
      playerTimerRef.current = setInterval(() => {
        setCurrentTimestampSeconds((prev) => {
          const maxSec = content?.durationSeconds || 600;
          if (prev >= maxSec) {
            setIsPlaying(false);
            return maxSec;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (playerTimerRef.current) {
      clearInterval(playerTimerRef.current);
    }

    return () => {
      if (playerTimerRef.current) clearInterval(playerTimerRef.current);
    };
  }, [isPlaying, content?.durationSeconds]);

  // Sync reading position periodically
  const handlePageChange = (newPage: number) => {
    const total = content?.totalPages || 1;
    const clamped = Math.max(1, Math.min(newPage, total));
    setCurrentPage(clamped);
    if (materialId) {
      apiClient.recordRecentMaterialView(materialId, { page: clamped });
    }
  };

  const handleSlideChange = (newSlide: number) => {
    const total = content?.totalSlides || 1;
    const clamped = Math.max(1, Math.min(newSlide, total));
    setCurrentSlide(clamped);
    if (materialId) {
      apiClient.recordRecentMaterialView(materialId, { page: clamped });
    }
  };

  const handleSeek = (seconds: number) => {
    setCurrentTimestampSeconds(seconds);
    if (materialId) {
      apiClient.recordRecentMaterialView(materialId, { timestamp: seconds });
    }
  };

  // Determine source kind
  const isVideoOrAudio = useMemo(() => {
    const mime = content?.mimeType?.toLowerCase() || '';
    return mime.includes('video') || mime.includes('audio') || Boolean(content?.transcripts?.length);
  }, [content]);

  const isSlide = useMemo(() => {
    const mime = content?.mimeType?.toLowerCase() || '';
    return mime.includes('presentation') || mime.includes('powerpoint') || Boolean(content?.slides?.length);
  }, [content]);

  // Text content of active view
  const currentText = useMemo(() => {
    if (!content) return '';
    if (isSlide) {
      const activeSlideData = content.slides?.find((s) => s.slideNumber === currentSlide);
      return activeSlideData ? `${activeSlideData.title}\n\n${activeSlideData.text}` : '';
    }
    if (isVideoOrAudio) {
      const activeSeg = content.transcripts?.find(
        (t) => currentTimestampSeconds >= t.startSeconds && currentTimestampSeconds <= t.endSeconds
      );
      return activeSeg?.text || 'Video Transcript stream';
    }
    const activePageData = content.pages?.find((p) => p.pageNumber === currentPage);
    return activePageData?.text || content.fullText || '';
  }, [content, isSlide, isVideoOrAudio, currentPage, currentSlide, currentTimestampSeconds]);

  // Search match counts
  const searchMatches = useMemo(() => {
    if (!viewerSearchQuery.trim() || !currentText) return 0;
    const regex = new RegExp(viewerSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = currentText.match(regex);
    return matches ? matches.length : 0;
  }, [viewerSearchQuery, currentText]);

  // Excerpt Copy with provenance citation
  const handleCopyCitationExcerpt = () => {
    if (!content) return;
    let locationStr = '';
    if (isSlide) locationStr = `Slide ${currentSlide}`;
    else if (isVideoOrAudio) {
      const m = Math.floor(currentTimestampSeconds / 60);
      const s = currentTimestampSeconds % 60;
      locationStr = `Timestamp ${m}:${s.toString().padStart(2, '0')}`;
    } else {
      locationStr = `Page ${currentPage}`;
    }

    const snippet = currentText.length > 300 ? `${currentText.slice(0, 300)}...` : currentText;
    const formatted = `"${snippet}"\n\n— Source: ${content.title} (${locationStr}), OmniTutor AI Verified Curriculum`;
    navigator.clipboard.writeText(formatted);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="OmniTutor Material Viewer"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/75 dark:bg-black/85 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Viewer Card */}
      <div className="relative w-full max-w-6xl h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Top App Header & Controls */}
        <div className="h-14 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shrink-0">
              {isVideoOrAudio ? (
                <Film className="w-4 h-4" />
              ) : isSlide ? (
                <FileSpreadsheet className="w-4 h-4 text-amber-500" />
              ) : (
                <FileText className="w-4 h-4 text-indigo-500" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {content?.title || 'Course Material'}
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="font-mono">{(content?.fileSize ? content.fileSize / 1024 : 0).toFixed(1)} KB</span>
                <span>•</span>
                <span className="capitalize">{content?.mimeType || 'Document'}</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Protected Viewer (No Public S3 URLs)</span>
              </div>
            </div>
          </div>

          {/* Quick Study Action Shortcuts */}
          <div className="flex items-center gap-2">
            {onOpenStudyTools && materialId && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenStudyTools(materialId, 'summary')}
                  className="text-xs hidden md:flex items-center gap-1.5 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Summarize
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenStudyTools(materialId, 'flashcards')}
                  className="text-xs hidden md:flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Flashcards
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCitationExcerpt}
              className="text-xs flex items-center gap-1.5"
              title="Copy excerpt with verifiable provenance citation"
            >
              {copiedSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{copiedSuccess ? 'Copied' : 'Copy Excerpt'}</span>
            </Button>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Toggle source-location sidebar"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close Material Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* In-Viewer Secondary Navigation Toolbar */}
        <div className="h-12 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 shrink-0 text-xs">
          {/* Left: Position & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isSlide ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentSlide <= 1}
                  onClick={() => handleSlideChange(currentSlide - 1)}
                  className="p-1.5 h-8 w-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Slide {currentSlide} of {content?.totalSlides || 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentSlide >= (content?.totalSlides || 1)}
                  onClick={() => handleSlideChange(currentSlide + 1)}
                  className="p-1.5 h-8 w-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            ) : isVideoOrAudio ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 h-8 w-8 text-indigo-600"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSeek(0)}
                  className="p-1.5 h-8 w-8 text-slate-400"
                  title="Restart video"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {Math.floor(currentTimestampSeconds / 60)}:
                  {(currentTimestampSeconds % 60).toString().padStart(2, '0')}{' '}
                  / {Math.floor((content?.durationSeconds || 600) / 60)}:
                  {((content?.durationSeconds || 600) % 60).toString().padStart(2, '0')}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="p-1.5 h-8 w-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Page {currentPage} of {content?.totalPages || 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage >= (content?.totalPages || 1)}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="p-1.5 h-8 w-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Right: In-Viewer Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative w-44 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Find in material..."
                value={viewerSearchQuery}
                onChange={(e) => setViewerSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            {viewerSearchQuery.trim() && (
              <span className="text-[11px] text-slate-400 whitespace-nowrap">
                {searchMatches} {searchMatches === 1 ? 'match' : 'matches'}
              </span>
            )}
          </div>
        </div>

        {/* Content Body & Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Document / Slide / Video Canvas */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 dark:bg-slate-950/70 flex flex-col items-center">
            {loading ? (
              <div className="my-auto text-center space-y-3">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Loading verified curriculum content...</p>
              </div>
            ) : error ? (
              <div className="my-auto max-w-md p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-center space-y-2">
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">{error}</p>
                <p className="text-xs text-slate-500">
                  Ensure you are enrolled in the course that contains this document.
                </p>
              </div>
            ) : isVideoOrAudio ? (
              // Video / Audio Player & Interactive Transcript Interface
              <div className="w-full max-w-3xl space-y-6">
                {/* Simulated Media Player Display */}
                <div className="w-full aspect-video bg-black rounded-2xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden group">
                  <Film className="w-16 h-16 text-indigo-400 opacity-60 mb-2" />
                  <span className="text-sm font-semibold text-white/90">{content?.title}</span>
                  <span className="text-xs text-slate-400 font-mono mt-1">
                    Seeking: {Math.floor(currentTimestampSeconds / 60)}:
                    {(currentTimestampSeconds % 60).toString().padStart(2, '0')}
                  </span>

                  {/* Playhead slider */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-center gap-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-500"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={content?.durationSeconds || 600}
                      value={currentTimestampSeconds}
                      onChange={(e) => handleSeek(Number(e.target.value))}
                      className="flex-1 accent-indigo-500 cursor-pointer h-1.5"
                    />
                  </div>
                </div>

                {/* Interactive Transcript Segments with Seek Click */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Synchronized Video Transcript
                  </h3>
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2 max-h-72 overflow-y-auto">
                    {(content?.transcripts || []).length > 0 ? (
                      content?.transcripts?.map((seg, idx) => {
                        const isCurrent =
                          currentTimestampSeconds >= seg.startSeconds &&
                          currentTimestampSeconds <= seg.endSeconds;
                        return (
                          <div
                            key={idx}
                            onClick={() => handleSeek(seg.startSeconds)}
                            className={`p-3 rounded-lg text-xs cursor-pointer transition-colors flex items-start gap-3 ${
                              isCurrent
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <span className="font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
                              {Math.floor(seg.startSeconds / 60)}:
                              {(seg.startSeconds % 60).toString().padStart(2, '0')}
                            </span>
                            <p className="text-slate-700 dark:text-slate-300 flex-1 leading-relaxed">
                              {seg.text}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        {currentText || 'Transcript audio segments rendered upon playback'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : isSlide ? (
              // Slide Deck Presentation Card
              <div className="w-full max-w-3xl space-y-4">
                <div className="aspect-16/10 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-elevated border border-slate-200 dark:border-slate-800 p-8 sm:p-12 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Slide {currentSlide} of {content?.totalSlides || 1}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{content?.title}</span>
                    </div>

                    <h3 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
                      {content?.slides?.find((s) => s.slideNumber === currentSlide)?.title ||
                        `Slide ${currentSlide}: Overview`}
                    </h3>

                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {content?.slides?.find((s) => s.slideNumber === currentSlide)?.text || currentText}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Verified Lecture Slide Content</span>
                    <span>OmniTutor AI Grounded Engine</span>
                  </div>
                </div>

                {/* Slide Thumbnail Navigation Strip */}
                <div className="flex items-center gap-2 overflow-x-auto py-2 px-1">
                  {Array.from({ length: content?.totalSlides || 1 }).map((_, idx) => {
                    const sNum = idx + 1;
                    const isSelected = sNum === currentSlide;
                    return (
                      <button
                        key={sNum}
                        onClick={() => handleSlideChange(sNum)}
                        className={`h-14 w-20 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 mb-1 opacity-70" />
                        <span>Slide {sNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Document / PDF Page Reader Canvas
              <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-elevated border border-slate-200 dark:border-slate-800 p-8 sm:p-14 min-h-[75vh] flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Page {currentPage} of {content?.totalPages || 1}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                      {content?.title}
                    </span>
                  </div>

                  {/* Document Text Body */}
                  <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-serif">
                    {currentText}
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-sans">
                  <span>Page {currentPage}</span>
                  <span>OmniTutor AI Ingested Corpus</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Source-Location Navigation Sidebar */}
          {sidebarOpen && (
            <div className="w-72 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
                  Source Navigation
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Jump to specific pages, slides, or chapters
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {isSlide ? (
                  Array.from({ length: content?.totalSlides || 1 }).map((_, idx) => {
                    const sNum = idx + 1;
                    const isSelected = sNum === currentSlide;
                    return (
                      <button
                        key={sNum}
                        onClick={() => handleSlideChange(sNum)}
                        className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 font-semibold text-indigo-600 dark:text-indigo-400'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="truncate">Slide {sNum}: Overview</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
                      </button>
                    );
                  })
                ) : isVideoOrAudio ? (
                  (content?.transcripts || []).map((seg, idx) => {
                    const isSelected =
                      currentTimestampSeconds >= seg.startSeconds &&
                      currentTimestampSeconds <= seg.endSeconds;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSeek(seg.startSeconds)}
                        className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 font-semibold text-indigo-600 dark:text-indigo-400'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="font-mono text-[11px] text-indigo-500">
                          {Math.floor(seg.startSeconds / 60)}:
                          {(seg.startSeconds % 60).toString().padStart(2, '0')}
                        </span>
                        <span className="truncate max-w-[140px] text-[11px] ml-2">{seg.text}</span>
                      </button>
                    );
                  })
                ) : (
                  Array.from({ length: content?.totalPages || 1 }).map((_, idx) => {
                    const pNum = idx + 1;
                    const isSelected = pNum === currentPage;
                    return (
                      <button
                        key={pNum}
                        onClick={() => handlePageChange(pNum)}
                        className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 font-semibold text-indigo-600 dark:text-indigo-400'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>Page {pNum}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
