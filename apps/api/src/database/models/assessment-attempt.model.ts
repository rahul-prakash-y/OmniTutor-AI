import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type {
  AssessmentAttempt,
  AssessmentMode,
  EvaluatedQuestionResponse,
} from '@omnitutor/shared';

export interface IAssessmentAttemptDocument extends Document {
  assessmentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
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
  startedAt: Date;
  submittedAt?: Date;
  toResponse(): AssessmentAttempt;
}

const AssessmentAttemptSchema = new Schema<IAssessmentAttemptDocument>(
  {
    assessmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assessment',
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mode: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'abandoned'],
      default: 'in_progress',
    },
    responses: {
      type: Schema.Types.Mixed,
      default: [],
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    topicOutcomes: {
      type: Schema.Types.Mixed,
      default: {},
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

AssessmentAttemptSchema.index({ userId: 1, assessmentId: 1, createdAt: -1 });

AssessmentAttemptSchema.methods.toResponse = function (): AssessmentAttempt {
  return {
    id: this._id.toString(),
    assessmentId: this.assessmentId.toString(),
    courseId: this.courseId.toString(),
    userId: this.userId.toString(),
    mode: this.mode,
    status: this.status,
    responses: this.responses || [],
    totalScore: this.totalScore,
    maxScore: this.maxScore,
    percentage: this.percentage,
    passed: this.passed,
    topicOutcomes: this.topicOutcomes || {},
    startedAt: this.startedAt.toISOString(),
    submittedAt: this.submittedAt ? this.submittedAt.toISOString() : undefined,
  };
};

export const AssessmentAttemptModel: Model<IAssessmentAttemptDocument> =
  mongoose.models.AssessmentAttempt ||
  mongoose.model<IAssessmentAttemptDocument>(
    'AssessmentAttempt',
    AssessmentAttemptSchema
  );
