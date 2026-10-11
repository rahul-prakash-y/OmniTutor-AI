import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { StudyPlan, StudyPlanMilestone } from '@omnitutor/shared';

export interface IStudyPlanDocument extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  title: string;
  scheduleType: 'weekly' | 'custom' | 'exam_prep';
  weeklyAvailableHours: number;
  targetCompletionDate: Date;
  milestones: Array<{
    id: string;
    week: number;
    title: string;
    description: string;
    topics: string[];
    estimatedHours: number;
    completed: boolean;
    completedAt?: Date;
    actionType: 'read_material' | 'quiz_practice' | 'tutor_review' | 'revision';
  }>;
  status: 'active' | 'completed' | 'paused' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  toResponse(courseTitle?: string): StudyPlan;
}

const MilestoneSchema = new Schema(
  {
    id: { type: String, required: true },
    week: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 1000 },
    topics: { type: [String], default: [] },
    estimatedHours: { type: Number, required: true, min: 0.25 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    actionType: {
      type: String,
      required: true,
      enum: ['read_material', 'quiz_practice', 'tutor_review', 'revision'],
      default: 'read_material',
    },
  },
  { _id: false }
);

const StudyPlanSchema = new Schema<IStudyPlanDocument>(
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
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    scheduleType: {
      type: String,
      enum: ['weekly', 'custom', 'exam_prep'],
      default: 'weekly',
    },
    weeklyAvailableHours: {
      type: Number,
      required: true,
      default: 6,
      min: 1,
      max: 50,
    },
    targetCompletionDate: {
      type: Date,
      required: true,
    },
    milestones: {
      type: [MilestoneSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

StudyPlanSchema.index({ userId: 1, courseId: 1, status: 1 });

StudyPlanSchema.methods.toResponse = function (courseTitle?: string): StudyPlan {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    courseId: this.courseId.toString(),
    courseTitle,
    title: this.title,
    scheduleType: this.scheduleType,
    weeklyAvailableHours: this.weeklyAvailableHours,
    targetCompletionDate: this.targetCompletionDate.toISOString(),
    milestones: this.milestones.map((m: any): StudyPlanMilestone => ({
      id: m.id,
      week: m.week,
      title: m.title,
      description: m.description,
      topics: m.topics,
      estimatedHours: m.estimatedHours,
      completed: m.completed,
      completedAt: m.completedAt ? m.completedAt.toISOString() : undefined,
      actionType: m.actionType,
    })),
    status: this.status,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const StudyPlanModel: Model<IStudyPlanDocument> =
  mongoose.models.StudyPlan ||
  mongoose.model<IStudyPlanDocument>('StudyPlan', StudyPlanSchema);
