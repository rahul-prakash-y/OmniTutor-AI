import React, { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { apiClient } from '../../services/apiClient';
import { toast } from '../../stores/useToastStore';
import {
  UploadCloud,
  FileText,
  FileCode,
  FileSpreadsheet,
  FileAudio,
  FileVideo,
  AlertCircle,
} from 'lucide-react';
import type { IngestionJob, Material } from '@omnitutor/shared';

interface MaterialUploaderProps {
  courseId: string;
  onUploaded: (material: Material, job: IngestionJob) => void;
}

export const MaterialUploader: React.FC<MaterialUploaderProps> = ({
  courseId,
  onUploaded,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedExtensions = ['.pdf', '.pptx', '.docx', '.txt', '.md', '.mp3', '.wav', '.mp4'];

  const validateAndUpload = async (file: File) => {
    setErrorMessage(null);

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      const err = `Unsupported file type "${file.name}". Please upload PDF, PPTX, DOCX, TXT, MD, MP3, WAV, or MP4.`;
      setErrorMessage(err);
      toast.error(err, 'Invalid Format');
      return;
    }

    // Size limit check on client side
    const maxBytes = 100 * 1024 * 1024; // 100MB
    if (file.size > maxBytes) {
      const err = `File "${file.name}" exceeds the maximum limit of 100MB.`;
      setErrorMessage(err);
      toast.error(err, 'File Too Large');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    // Simulated progress ticks for upload feedback
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 85) return prev;
        return prev + 15;
      });
    }, 200);

    try {
      const res = await apiClient.uploadMaterial(courseId, file);
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.success || !res.data) {
        const err = res.error?.message || 'Upload failed';
        setErrorMessage(err);
        toast.error(err, 'Upload Error');
        return;
      }

      toast.success(`"${file.name}" uploaded! Processing queued.`, 'Material Uploaded');
      onUploaded(res.data.material, res.data.job);
    } catch (err) {
      clearInterval(progressInterval);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setErrorMessage(msg);
      toast.error(msg, 'Upload Error');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]!;
      validateAndUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]!;
      validateAndUpload(file);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        id="dropzone-material-upload"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[0.99]'
            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-white dark:bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={allowedExtensions.join(',')}
          onChange={handleFileChange}
          disabled={isUploading}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 font-display">
              Upload Learning Material
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Drag & drop documents, textbooks, lecture slides, or multimedia
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Browse Local Files
          </Button>
        </div>

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="mt-4 space-y-1.5 max-w-sm mx-auto">
            <div className="flex justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span>Streaming to secure storage...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Supported Formats Guide */}
      <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">
          Supported Material Formats & Ingestion Pipeline:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>PDF (≤25MB)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>PPTX (≤30MB)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>DOCX (≤20MB)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <FileCode className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>TXT / MD (≤5MB)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <FileAudio className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span>MP3/WAV (≤50MB)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <FileVideo className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>MP4 (≤100MB)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
