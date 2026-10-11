import type { SubjectCategory } from './learning.js';

export type AcademicLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'undergraduate'
  | 'graduate';

export type CourseStatus = 'active' | 'archived' | 'draft';

export type CourseProcessingStatus = 'idle' | 'processing' | 'indexed' | 'failed';

export interface Course {
  id: string;
  title: string;
  description: string;
  subject: SubjectCategory | string;
  academicLevel: AcademicLevel;
  tags: string[];
  ownerId: string;
  status: CourseStatus;
  processingStatus: CourseProcessingStatus;
  materialCount: number;
  indexedChunkCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SourceType = 'pdf' | 'pptx' | 'docx' | 'txt' | 'md' | 'video' | 'audio';

export type MaterialStatus =
  | 'uploaded'
  | 'queued'
  | 'processing'
  | 'indexed'
  | 'failed';

export interface MaterialMetadata {
  pageCount?: number;
  slideCount?: number;
  durationSeconds?: number;
  wordCount?: number;
  extractedHeadingCount?: number;
  ocrApplied?: boolean;
  hasVisuals?: boolean;
  language?: string;
  audioSampleRate?: number;
  videoResolution?: string;
}

export interface Material {
  id: string;
  courseId: string;
  ownerId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  detectedMimeType: string;
  sizeBytes: number;
  storageKey: string;
  sourceType: SourceType;
  status: MaterialStatus;
  chunkCount: number;
  metadata: MaterialMetadata;
  errorMessage?: string;
  retryCount: number;
  currentJobId?: string;
  createdAt: string;
  updatedAt: string;
}

export type JobStatus = 'queued' | 'processing' | 'indexed' | 'failed' | 'cancelled';

export type JobStage =
  | 'validation'
  | 'extraction'
  | 'chunking'
  | 'embedding'
  | 'vector_upsert'
  | 'completed'
  | 'failed';

export interface IngestionJob {
  id: string;
  courseId: string;
  materialId: string;
  userId: string;
  status: JobStatus;
  stage: JobStage;
  progress: number;
  chunksGenerated: number;
  tokensUsed: number;
  error?: string;
  attempts: number;
  maxAttempts: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChunkProvenance {
  courseId: string;
  materialId: string;
  originalFilename: string;
  sourceType: SourceType;
  page?: number;
  slide?: number;
  timeRange?: {
    start: number;
    end: number;
  };
  heading?: string;
  chunkIndex: number;
  contentHash: string;
  tokenCount: number;
}

export interface MaterialChunk {
  id: string;
  text: string;
  metadata: ChunkProvenance;
}
