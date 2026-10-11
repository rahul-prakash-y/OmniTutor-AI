export type LearningEventType =
  | 'assessment_submission'
  | 'tutor_interaction'
  | 'material_view'
  | 'concept_reviewed'
  | 'active_study_session';

export interface LearningEvent {
  id: string;
  userId: string;
  eventType: LearningEventType;
  courseId?: string;
  materialId?: string;
  topic?: string;
  durationSeconds: number;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  timestamp: string;
}

export interface StudentAnalyticsSummary {
  totalQuestionsAttempted: number;
  totalQuestionsCorrect: number;
  overallAccuracy: number;
  activeStudyTimeMinutes: number;
  weeklyStudyTimeMinutes: number;
  dailyActiveMinutes: Array<{ date: string; minutes: number }>;
  currentStreakDays: number;
  longestStreakDays: number;
  topicsNeedingRevisionCount: number;
  completedCoursesCount: number;
  inProgressCoursesCount: number;
  lastActiveAt?: string;
}

export interface TopicMasteryAnalytics {
  topic: string;
  courseId: string;
  courseTitle?: string;
  estimatedMasteryScore: number;
  attemptCount: number;
  correctCount: number;
  currentDifficulty: string;
  recommendedRevision: boolean;
  revisionReason?: string;
  lastAssessedAt: string;
}

export interface AssessmentTrendPoint {
  attemptId: string;
  assessmentId: string;
  assessmentTitle: string;
  courseId: string;
  score: number;
  totalPossibleScore: number;
  percentage: number;
  difficulty: string;
  completedAt: string;
}

export type StudyRecommendationType =
  | 'weak_topic'
  | 'material_gap'
  | 'follow_up_quiz'
  | 'revision_session'
  | 'next_milestone';

export interface StudyRecommendation {
  id: string;
  type: StudyRecommendationType;
  title: string;
  reason: string;
  courseId: string;
  courseTitle?: string;
  topic?: string;
  materialId?: string;
  actionUrl: string;
  priority: 'high' | 'medium' | 'low';
}

export interface StudyGoal {
  id: string;
  userId: string;
  weeklyHoursTarget: number;
  dailyMinutesTarget: number;
  targetAssessmentsPerWeek: number;
  timezone?: string;
  targetCompletionDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type MilestoneActionType =
  | 'read_material'
  | 'quiz_practice'
  | 'tutor_review'
  | 'revision';

export interface StudyPlanMilestone {
  id: string;
  week: number;
  title: string;
  description: string;
  topics: string[];
  estimatedHours: number;
  completed: boolean;
  completedAt?: string;
  actionType: MilestoneActionType;
}

export interface StudyPlan {
  id: string;
  userId: string;
  courseId: string;
  courseTitle?: string;
  title: string;
  scheduleType: 'weekly' | 'custom' | 'exam_prep';
  weeklyAvailableHours: number;
  targetCompletionDate: string;
  milestones: StudyPlanMilestone[];
  status: 'active' | 'completed' | 'paused' | 'archived';
  createdAt: string;
  updatedAt: string;
}
