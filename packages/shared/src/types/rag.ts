import type { AcademicLevel } from './course.js';

export interface SourceCitation {
  id: string; // e.g. "cite-1"
  chunkId: string;
  materialId: string;
  originalFilename: string;
  sourceType: string;
  page?: number;
  slide?: number;
  timeRange?: {
    start: number;
    end: number;
  };
  heading?: string;
  excerpt: string;
  contentHash: string;
  score: number;
}

export interface RagQueryInput {
  query: string;
  courseId: string;
  materialId?: string;
  topK?: number;
  minScore?: number;
  rerankEnabled?: boolean;
  academicLevel?: AcademicLevel;
}

export interface RagQueryResult {
  answer: string;
  citations: SourceCitation[];
  isGrounded: boolean;
  hasSufficientEvidence: boolean;
  hasConflict: boolean;
  tokensUsed: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  durationMs: number;
}

export interface RagCandidatePreview {
  chunkId: string;
  score: number;
  rerankScore?: number;
  sourceFilename: string;
  textPreview: string;
  page?: number;
  slide?: number;
  timeRange?: { start: number; end: number };
  heading?: string;
}

export interface RagDiagnosticInfo {
  normalizedQuery: string;
  filter: Record<string, unknown>;
  totalChunksFound: number;
  candidates: RagCandidatePreview[];
  sufficiencyThreshold: number;
  topScore: number;
  hasSufficientEvidence: boolean;
  promptInjectionCheck: {
    detected: boolean;
    warnings?: string[];
  };
  durationMs: number;
}
