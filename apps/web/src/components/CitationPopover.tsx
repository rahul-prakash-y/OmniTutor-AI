import React, { useState, useRef, useEffect } from 'react';
import type { SourceCitation } from '@omnitutor/shared';
import {
  FileText,
  FileSpreadsheet,
  Film,
  ExternalLink,
  Copy,
  Check,
  X,
  Compass,
} from 'lucide-react';

interface CitationPopoverProps {
  citation: SourceCitation;
  index?: number;
  onOpenMaterial?: (materialId: string) => void;
}

export const CitationPopover: React.FC<CitationPopoverProps> = ({
  citation,
  index,
  onOpenMaterial,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleCopyExcerpt = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(citation.excerpt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSourceIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'video':
      case 'audio':
        return <Film className="w-3.5 h-3.5 text-rose-500" />;
      case 'pptx':
        return <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  const getProvenanceLocation = () => {
    if (citation.page !== undefined) {
      return `Page ${citation.page}`;
    }
    if (citation.slide !== undefined) {
      return `Slide ${citation.slide}`;
    }
    if (citation.timeRange) {
      const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
      };
      return `${formatTime(citation.timeRange.start)} - ${formatTime(citation.timeRange.end)}`;
    }
    return 'Section Excerpt';
  };

  const displayLabel = index !== undefined ? `${index + 1}` : citation.id.replace('cite-', '');

  return (
    <span className="relative inline-block align-baseline font-sans mx-0.5" ref={popoverRef}>
      {/* Inline Citation Chip */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors shadow-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
        title={`Verified Citation: ${citation.originalFilename} (${getProvenanceLocation()})`}
      >
        <span>[{displayLabel}]</span>
      </button>

      {/* Floating Popover Card */}
      {isOpen && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 sm:w-96 p-4 rounded-xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-left animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                {getSourceIcon(citation.sourceType)}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100">
                  {citation.originalFilename}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">
                    {getProvenanceLocation()}
                  </span>
                  {citation.heading && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[120px]">{citation.heading}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Excerpt Body */}
          <div className="py-3">
            <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1">
                <Compass className="w-3 h-3 text-indigo-500" /> Grounded Source Excerpt
              </span>
              {citation.score !== undefined && (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {Math.round(citation.score * 100)}% Relevance
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-h-36 overflow-y-auto italic">
              "{citation.excerpt}"
            </div>
          </div>

          {/* Provenance Metadata & Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-[10px] text-slate-400 font-mono">
              Chunk ID: {citation.chunkId.slice(0, 8)}...
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyExcerpt}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {onOpenMaterial && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenMaterial(citation.materialId);
                    setIsOpen(false);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Material</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </span>
  );
};
