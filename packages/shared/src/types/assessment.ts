import type { SourceCitation } from './rag.js';
import type { AcademicLevel } from './course.js';

export type AssessmentMode =
  | 'quiz'
  | 'topic_practice'
  | 'chapter_assessment'
  | 'revision_test'
  | 'adaptive_session'
  | 'missed_practice';

export type QuestionType =
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'short_answer'
  | 'flashcard';

export interface RubricCriterion {
  criterion: string;
  points: number;
  description: string;
}

export interface AssessmentQuestion {
  id: string;
  topic: string;
  learningObjective: string;
  difficulty: AcademicLevel;
  type: QuestionType;
  prompt: string;
  options?: string[]; // for multiple_choice and multiple_select
  correctAnswer?: string | number | number[] | boolean; // server-side only
  explanation: string; // server-side only prior to submit
  rubric?: RubricCriterion[];
  sourceChunkIds: string[];
  citations?: SourceCitation[];
  points: number;
  hints?: string[];
}

export interface ClientAssessmentQuestion {
  id: string;
  topic: string;
  learningObjective: string;
  difficulty: AcademicLevel;
  type: QuestionType;
  prompt: string;
  options?: string[];
  points: number;
  hints?: string[];
}

export interface Assessment {
  id: string;
  courseId: string;
  userId: string;
  title: string;
  mode: AssessmentMode;
  topic?: string;
  difficulty: AcademicLevel;
  version: number;
  questionCount: number;
  questions: AssessmentQuestion[]; // Full server view
  clientQuestions: ClientAssessmentQuestion[]; // Sanitized client view
  passingScorePercentage: number;
  timeLimitMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionSubmission {
  questionId: string;
  userAnswer: unknown;
  hintsUsed?: number;
  timeSpentSeconds?: number;
}

export interface EvaluatedQuestionResponse {
  questionId: string;
  userAnswer: unknown;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  feedback: string;
  explanation: string;
  rubricFeedback?: Array<{ criterion: string; awarded: number; max: number; note: string }>;
  citations?: SourceCitation[];
  correctAnswer?: unknown;
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  courseId: string;
  userId: string;
  mode: AssessmentMode;
  status: 'in_progress' | 'submitted' | 'abandoned';
  responses: EvaluatedQuestionResponse[];
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  topicOutcomes: Record<
    string,
    {
      correct: number;
      total: number;
      masteryChange: number;
      previousMastery: number;
      newMastery: number;
    }
  >;
  startedAt: string;
  submittedAt?: string;
}

export interface TopicMastery {
  id: string;
  courseId: string;
  userId: string;
  topic: string;
  masteryScore: number; // 0 to 100
  attemptCount: number;
  correctCount: number;
  currentDifficulty: AcademicLevel;
  streakCount: number;
  recommendedRevision: boolean;
  revisionReason?: string;
  lastAssessedAt: string;
}

export interface GenerateAssessmentInput {
  courseId: string;
  mode: AssessmentMode;
  topic?: string;
  materialId?: string;
  questionCount?: number;
  difficulty?: AcademicLevel;
  questionTypes?: QuestionType[];
}
