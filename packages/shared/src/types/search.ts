import type { SourceCitation } from './rag.js';

export type SearchResultCategory =
  | 'course'
  | 'material'
  | 'chunk'
  | 'note'
  | 'conversation'
  | 'assessment';

export interface SearchResultItem {
  id: string;
  category: SearchResultCategory;
  title: string;
  snippet: string;
  courseId?: string;
  courseTitle?: string;
  materialId?: string;
  materialTitle?: string;
  location?: {
    pageNumber?: number;
    slideNumber?: number;
    timestamp?: { start: number; end: number };
  };
  relevanceScore: number;
  linkUrl: string;
}

export interface GlobalSearchResponse {
  query: string;
  total: number;
  results: SearchResultItem[];
  categoriesCount: Record<SearchResultCategory, number>;
}

export interface MaterialContentDetails {
  materialId: string;
  courseId: string;
  title: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  totalPages?: number;
  totalSlides?: number;
  durationSeconds?: number;
  pages?: Array<{ pageNumber: number; text: string }>;
  slides?: Array<{ slideNumber: number; title: string; text: string }>;
  transcripts?: Array<{ startSeconds: number; endSeconds: number; text: string }>;
  fullText?: string;
}

export interface RecentMaterial {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  materialId: string;
  materialTitle: string;
  filename: string;
  mimeType: string;
  lastViewedAt: string;
  lastPosition?: { page?: number; timestamp?: number };
}

export type StudyNoteCategory =
  | 'explanation'
  | 'revision'
  | 'summary'
  | 'flashcard';

export interface StudyToolNote {
  id: string;
  userId: string;
  courseId: string;
  category: StudyNoteCategory;
  title: string;
  content: string;
  tags: string[];
  citations?: SourceCitation[];
  flashcardData?: { front: string; back: string };
  createdAt: string;
  updatedAt: string;
}

export interface GroundedSummaryRequest {
  courseId: string;
  materialId?: string;
  topic?: string;
  style?: 'concise' | 'detailed' | 'bullet_points';
}

export interface GroundedSummaryResponse {
  summary: string;
  citations: SourceCitation[];
}

export interface GroundedFlashcardItem {
  id: string;
  front: string;
  back: string;
  topic: string;
  citations: SourceCitation[];
}

export interface GroundedFlashcardsRequest {
  courseId: string;
  materialId?: string;
  topic?: string;
  count?: number;
}

export interface GroundedFlashcardsResponse {
  topic: string;
  flashcards: GroundedFlashcardItem[];
}
