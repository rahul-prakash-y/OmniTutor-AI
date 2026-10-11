export type TutoringMode = 'socratic' | 'direct' | 'quiz' | 'code_review';

export type SubjectCategory =
  | 'computer_science'
  | 'mathematics'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'languages'
  | 'humanities';

export interface SubjectInfo {
  id: string;
  name: string;
  category: SubjectCategory;
  description: string;
  icon: string;
  topicsCount: number;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageMetadata {
  citations?: Array<{ title: string; source: string; relevanceScore?: number }>;
  codeSnippets?: Array<{ language: string; code: string }>;
  suggestedFollowUps?: string[];
  tokensUsed?: number;
  providerModel?: string;
  durationMs?: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  metadata?: MessageMetadata;
  createdAt: string;
}

export interface TutoringSessionSummary {
  id: string;
  userId: string;
  title: string;
  subject: string;
  mode: TutoringMode;
  messageCount: number;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
}
