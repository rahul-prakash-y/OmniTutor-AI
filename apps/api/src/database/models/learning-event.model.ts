import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { LearningEvent, LearningEventType } from '@omnitutor/shared';

export interface ILearningEventDocument extends Document {
  userId: mongoose.Types.ObjectId;
  eventType: LearningEventType;
  courseId?: mongoose.Types.ObjectId;
  materialId?: mongoose.Types.ObjectId;
  topic?: string;
  durationSeconds: number;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  timestamp: Date;
  toResponse(): LearningEvent;
}

const LearningEventSchema = new Schema<ILearningEventDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        'assessment_submission',
        'tutor_interaction',
        'material_view',
        'concept_reviewed',
        'active_study_session',
      ],
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: false,
      index: true,
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: false,
    },
    topic: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    durationSeconds: {
      type: Number,
      required: true,
      default: 60,
      min: 1,
      max: 7200, // Capped to avoid idle open tabs being treated as active study time
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true,
      maxlength: 100,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

LearningEventSchema.index({ userId: 1, timestamp: -1 });
LearningEventSchema.index({ userId: 1, courseId: 1, timestamp: -1 });

LearningEventSchema.methods.toResponse = function (): LearningEvent {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    eventType: this.eventType,
    courseId: this.courseId ? this.courseId.toString() : undefined,
    materialId: this.materialId ? this.materialId.toString() : undefined,
    topic: this.topic,
    durationSeconds: this.durationSeconds,
    metadata: this.metadata,
    idempotencyKey: this.idempotencyKey,
    timestamp: this.timestamp.toISOString(),
  };
};

export const LearningEventModel: Model<ILearningEventDocument> =
  mongoose.models.LearningEvent ||
  mongoose.model<ILearningEventDocument>('LearningEvent', LearningEventSchema);
