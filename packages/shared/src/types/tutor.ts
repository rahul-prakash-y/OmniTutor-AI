import type { SourceCitation } from './rag.js';
import type { TutoringMode } from './learning.js';
import type { AcademicLevel } from './course.js';

export type ExplanationStyle =
  | 'step_by_step'
  | 'analogy'
  | 'summary'
  | 'revision_notes';

export interface Conversation {
  id: string;
  courseId: string;
  userId: string;
  materialId?: string;
  title: string;
  mode: TutoringMode;
  academicLevel: AcademicLevel;
  explanationStyle: ExplanationStyle;
  language?: string;
  isPinned: boolean;
  messageCount: number;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
}

export type SocraticStep = 'probe' | 'hint' | 'synthesize' | 'explain' | 'auto';

export interface TutorMessageMetadata {
  academicLevel?: AcademicLevel;
  explanationStyle?: ExplanationStyle;
  sufficientEvidence?: boolean;
  conflictDetected?: boolean;
  tokensUsed?: number;
  durationMs?: number;
  isClarification?: boolean;
  isHint?: boolean;
  socraticStep?: SocraticStep;
  language?: string;
  speechAudioUrl?: string;
  model?: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  courseId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  citations: SourceCitation[];
  metadata?: TutorMessageMetadata;
  createdAt: string;
}

export interface SendMessagePayload {
  content: string;
  academicLevel?: AcademicLevel;
  explanationStyle?: ExplanationStyle;
  requestHint?: boolean;
  socraticStep?: SocraticStep;
  language?: string;
  materialId?: string;
}

export interface SpeechSynthesisPayload {
  text: string;
  language?: string;
  speed?: number;
}

export interface SpeechSynthesisResult {
  text: string;
  language: string;
  speed: number;
  status: 'synthesized';
  durationEstimateMs: number;
  webSpeechUtterance: {
    lang: string;
    rate: number;
    pitch: number;
  };
}

export interface ConceptNote {
  id: string;
  userId: string;
  courseId: string;
  conversationId?: string;
  title: string;
  content: string;
  citations?: SourceCitation[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
