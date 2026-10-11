import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { TopicMastery, AcademicLevel } from '@omnitutor/shared';

export interface ITopicMasteryDocument extends Document {
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  topic: string;
  masteryScore: number; // 0 to 100
  attemptCount: number;
  correctCount: number;
  currentDifficulty: AcademicLevel;
  streakCount: number;
  recommendedRevision: boolean;
  revisionReason?: string;
  lastAssessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  toResponse(): TopicMastery;
}

const TopicMasterySchema = new Schema<ITopicMasteryDocument>(
  {
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
    topic: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    masteryScore: {
      type: Number,
      required: true,
      default: 50,
      min: 0,
      max: 100,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    currentDifficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'undergraduate', 'graduate'],
      default: 'intermediate',
    },
    streakCount: {
      type: Number,
      default: 0,
    },
    recommendedRevision: {
      type: Boolean,
      default: false,
    },
    revisionReason: {
      type: String,
      maxlength: 300,
    },
    lastAssessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

TopicMasterySchema.index({ userId: 1, courseId: 1, topic: 1 }, { unique: true });

TopicMasterySchema.methods.toResponse = function (): TopicMastery {
  return {
    id: this._id.toString(),
    courseId: this.courseId.toString(),
    userId: this.userId.toString(),
    topic: this.topic,
    masteryScore: this.masteryScore,
    attemptCount: this.attemptCount,
    correctCount: this.correctCount,
    currentDifficulty: this.currentDifficulty,
    streakCount: this.streakCount,
    recommendedRevision: this.recommendedRevision,
    revisionReason: this.revisionReason,
    lastAssessedAt: this.lastAssessedAt.toISOString(),
  };
};

export const TopicMasteryModel: Model<ITopicMasteryDocument> =
  mongoose.models.TopicMastery ||
  mongoose.model<ITopicMasteryDocument>('TopicMastery', TopicMasterySchema);
