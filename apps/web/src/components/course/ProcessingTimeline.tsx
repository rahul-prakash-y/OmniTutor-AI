import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { apiClient } from '../../services/apiClient';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import type { IngestionJob, Material } from '@omnitutor/shared';

interface ProcessingTimelineProps {
  courseId: string;
  material: Material;
  onRetrySuccess?: (job: IngestionJob) => void;
}

const STAGES = [
  { key: 'validation', label: 'Validation' },
  { key: 'extraction', label: 'Extraction' },
  { key: 'chunking', label: 'Chunking' },
  { key: 'embedding', label: 'Embedding' },
  { key: 'vector_upsert', label: 'Vector Store' },
  { key: 'completed', label: 'Indexed' },
];

export const ProcessingTimeline: React.FC<ProcessingTimelineProps> = ({
  courseId,
  material,
  onRetrySuccess,
}) => {
  const [job, setJob] = useState<IngestionJob | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const fetchStatus = async () => {
      if (!material.currentJobId) return;

      try {
        const res = await apiClient.getJobStatus(material.currentJobId);
        if (res.success && res.data) {
          setJob(res.data);
          // If still processing or queued, continue polling
          if (['queued', 'processing'].includes(res.data.status)) {
            timer = setTimeout(fetchStatus, 1500);
          }
        }
      } catch {
        // Silent catch for background poll
      }
    };

    if (material.currentJobId) {
      fetchStatus();
    }

    return () => clearTimeout(timer);
  }, [material.currentJobId, material.status]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const res = await apiClient.retryMaterial(courseId, material.id);
      if (res.success && res.data) {
        setJob(res.data);
        onRetrySuccess?.(res.data);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const currentStage = job?.stage || (material.status === 'indexed' ? 'completed' : 'validation');
  const isFailed = material.status === 'failed' || job?.status === 'failed';
  const isIndexed = material.status === 'indexed' || job?.status === 'indexed';
  const progress = isIndexed ? 100 : job?.progress || 0;

  const getStageIndex = (stageKey: string) => {
    return STAGES.findIndex((s) => s.key === stageKey);
  };

  const activeIndex = getStageIndex(currentStage);

  return (
    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
      {/* Header & Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isIndexed ? (
            <Badge variant="success" size="sm">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Indexed ({material.chunkCount} chunks)
            </Badge>
          ) : isFailed ? (
            <Badge variant="danger" size="sm">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Failed
            </Badge>
          ) : (
            <Badge variant="brand" size="sm">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Processing ({progress}%)
            </Badge>
          )}

          {job?.tokensUsed ? (
            <span className="text-[11px] text-slate-400">
              {job.tokensUsed.toLocaleString()} tokens
            </span>
          ) : null}
        </div>

        {isFailed && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            isLoading={isRetrying}
            className="text-xs h-7 px-2.5"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Retry Ingestion
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${
            isFailed
              ? 'bg-rose-500'
              : isIndexed
              ? 'bg-emerald-500'
              : 'bg-indigo-600'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Timeline Steps */}
      <div className="grid grid-cols-6 gap-1 pt-1 text-[10px]">
        {STAGES.map((st, idx) => {
          const isDone = isIndexed || idx < activeIndex;
          const isCurrent = !isIndexed && !isFailed && idx === activeIndex;
          const isStepFailed = isFailed && idx === activeIndex;

          return (
            <div key={st.key} className="flex flex-col items-center text-center">
              <div
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center mb-1 transition-colors ${
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isStepFailed
                    ? 'bg-rose-500 text-white'
                    : isCurrent
                    ? 'bg-indigo-600 text-white animate-pulse'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-2.5 h-2.5" />
                ) : isCurrent ? (
                  <Clock className="w-2.5 h-2.5" />
                ) : null}
              </div>
              <span
                className={`truncate max-w-full font-medium ${
                  isDone
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isCurrent
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : isStepFailed
                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                    : 'text-slate-400'
                }`}
              >
                {st.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error display if failed */}
      {isFailed && (material.errorMessage || job?.error) && (
        <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
          <strong>Pipeline Error: </strong>
          {material.errorMessage || job?.error}
        </div>
      )}
    </div>
  );
};
