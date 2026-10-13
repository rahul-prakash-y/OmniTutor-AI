import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { RevisionScheduleItem } from '@omnitutor/shared';

export interface IRevisionScheduleDocument extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  topic: string;
  currentMasteryScore: number;
  estimatedRetentionRate: number;
  lastAssessedAt: Date;
  optimalReviewDate: Date;
  status: 'pending' | 'completed';
  disclaimer: string;
  createdAt: Date;
  updatedAt: Date;
  toResponse(courseTitle?: string): RevisionScheduleItem;
}

const RevisionScheduleSchema = new Schema<IRevisionScheduleDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    currentMasteryScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 50,
    },
    estimatedRetentionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 70,
    },
    lastAssessedAt: {
      type: Date,
      default: Date.now,
    },
    optimalReviewDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
      index: true,
    },
    disclaimer: {
      type: String,
      default:
        'Estimated retention calculated using spaced-repetition forgetting-curve heuristics. Individual recall varies.',
    },
  },
  {
    timestamps: true,
  }
);

RevisionScheduleSchema.index({ userId: 1, courseId: 1, topic: 1 });
RevisionScheduleSchema.index({ userId: 1, status: 1, optimalReviewDate: 1 });

RevisionScheduleSchema.methods.toResponse = function (courseTitle?: string): RevisionScheduleItem {
  const now = Date.now();
  const reviewTime = this.optimalReviewDate.getTime();
  const diffHours = (reviewTime - now) / (1000 * 60 * 60);

  let urgency: 'overdue' | 'due_today' | 'due_soon' | 'upcoming' = 'upcoming';
  if (this.status === 'completed') {
    urgency = 'upcoming';
  } else if (diffHours < 0) {
    urgency = 'overdue';
  } else if (diffHours <= 24) {
    urgency = 'due_today';
  } else if (diffHours <= 72) {
    urgency = 'due_soon';
  }

  return {
    id: this._id.toString(),
    courseId: this.courseId.toString(),
    courseTitle,
    topic: this.topic,
    currentMasteryScore: this.currentMasteryScore,
    estimatedRetentionRate: this.estimatedRetentionRate,
    lastAssessedAt: this.lastAssessedAt.toISOString(),
    optimalReviewDate: this.optimalReviewDate.toISOString(),
    urgency,
    status: this.status,
    disclaimer: this.disclaimer,
  };
};

export const RevisionScheduleModel: Model<IRevisionScheduleDocument> =
  mongoose.models.RevisionSchedule ||
  mongoose.model<IRevisionScheduleDocument>('RevisionSchedule', RevisionScheduleSchema);
