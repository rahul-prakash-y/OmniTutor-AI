import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { StudyGoal } from '@omnitutor/shared';

export interface IStudyGoalDocument extends Document {
  userId: mongoose.Types.ObjectId;
  weeklyHoursTarget: number;
  dailyMinutesTarget: number;
  targetAssessmentsPerWeek: number;
  timezone: string;
  targetCompletionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  toResponse(): StudyGoal;
}

const StudyGoalSchema = new Schema<IStudyGoalDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    weeklyHoursTarget: {
      type: Number,
      required: true,
      default: 5,
      min: 0.5,
      max: 80,
    },
    dailyMinutesTarget: {
      type: Number,
      required: true,
      default: 45,
      min: 5,
      max: 720,
    },
    targetAssessmentsPerWeek: {
      type: Number,
      required: true,
      default: 3,
      min: 1,
      max: 50,
    },
    timezone: {
      type: String,
      default: 'UTC',
      maxlength: 60,
    },
    targetCompletionDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

StudyGoalSchema.methods.toResponse = function (): StudyGoal {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    weeklyHoursTarget: this.weeklyHoursTarget,
    dailyMinutesTarget: this.dailyMinutesTarget,
    targetAssessmentsPerWeek: this.targetAssessmentsPerWeek,
    timezone: this.timezone,
    targetCompletionDate: this.targetCompletionDate
      ? this.targetCompletionDate.toISOString()
      : undefined,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const StudyGoalModel: Model<IStudyGoalDocument> =
  mongoose.models.StudyGoal ||
  mongoose.model<IStudyGoalDocument>('StudyGoal', StudyGoalSchema);
