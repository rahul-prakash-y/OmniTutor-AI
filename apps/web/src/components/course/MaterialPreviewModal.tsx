import React, { useEffect, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { apiClient } from '../../services/apiClient';
import { Copy, Check, Hash, Layers } from 'lucide-react';
import type { Material } from '@omnitutor/shared';

interface MaterialPreviewModalProps {
  courseId: string;
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
}

interface PreviewChunk {
  id: string;
  heading?: string;
  page?: number;
  slide?: number;
  timeRange?: { start: number; end: number };
  text: string;
  chunkIndex: number;
}

export const MaterialPreviewModal: React.FC<MaterialPreviewModalProps> = ({
  courseId,
  material,
  isOpen,
  onClose,
}) => {
  const [chunks, setChunks] = useState<PreviewChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !material) {
      setChunks([]);
      return;
    }

    const fetchPreview = async () => {
      setLoading(true);
      try {
        const res = await apiClient.getMaterialPreview(courseId, material.id);
        if (res.success && res.data) {
          setChunks(res.data.chunks || []);
        }
      } catch {
        setChunks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [isOpen, courseId, material]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!material) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      size="lg"
      title={material.originalName}
      description={`Semantic chunks and traceable vector embeddings for ${material.sourceType.toUpperCase()} file.`}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close Preview
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Material Meta Summary */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100 block">
              {material.originalName}
            </span>
            <span className="text-slate-500 dark:text-slate-400 capitalize">
              Type: {material.sourceType} · Size: {(material.sizeBytes / 1024).toFixed(1)} KB
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="brand" size="sm">
              <Layers className="w-3 h-3 mr-1" />
              {chunks.length || material.chunkCount} Chunks
            </Badge>
            <Badge variant="neutral" size="sm" className="capitalize">
              {material.status}
            </Badge>
          </div>
        </div>

        {/* Chunks List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Fetching extracted chunks from vector store...
          </div>
        ) : chunks.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No chunks found. If this material is still processing or failed, chunks will appear once indexed.
          </div>
        ) : (
          <div className="space-y-3">
            {chunks.map((chunk, idx) => (
              <div
                key={chunk.id || idx}
                className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
              >
                {/* Chunk Provenance Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="neutral" size="sm">
                      <Hash className="w-2.5 h-2.5 mr-0.5" />
                      Chunk #{chunk.chunkIndex + 1}
                    </Badge>

                    {chunk.page && (
                      <Badge variant="brand" size="sm">
                        Page {chunk.page}
                      </Badge>
                    )}

                    {chunk.slide && (
                      <Badge variant="brand" size="sm">
                        Slide {chunk.slide}
                      </Badge>
                    )}

                    {chunk.timeRange && (
                      <Badge variant="brand" size="sm">
                        {Math.floor(chunk.timeRange.start / 60)}:
                        {(chunk.timeRange.start % 60).toString().padStart(2, '0')} -{' '}
                        {Math.floor(chunk.timeRange.end / 60)}:
                        {(chunk.timeRange.end % 60).toString().padStart(2, '0')}
                      </Badge>
                    )}

                    {chunk.heading && (
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-xs">
                        {chunk.heading}
                      </span>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopy(chunk.id, chunk.text)}
                    className="h-7 px-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    {copiedId === chunk.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>

                {/* Content snippet */}
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-mono text-[11px] bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60">
                  {chunk.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
};
