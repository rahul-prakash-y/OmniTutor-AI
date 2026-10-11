import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { IngestionJob, JobStage, JobStatus } from '@omnitutor/shared';

export interface IIngestionJob {
  courseId: Types.ObjectId;
  materialId: Types.ObjectId;
  userId: Types.ObjectId;
  status: JobStatus;
  stage: JobStage;
  progress: number;
  chunksGenerated: number;
  tokensUsed: number;
  error?: string;
  attempts: number;
  maxAttempts: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IIngestionJobMethods {
  toResponse(): IngestionJob;
}

export type IngestionJobDocument = Document<Types.ObjectId, object, IIngestionJob> &
  IIngestionJob &
  IIngestionJobMethods;

const IngestionJobSchema = new Schema<
  IIngestionJob,
  Model<IIngestionJob, object, IIngestionJobMethods>,
  IIngestionJobMethods
>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'indexed', 'failed', 'cancelled'],
      default: 'queued',
      index: true,
    },
    stage: {
      type: String,
      enum: [
        'validation',
        'extraction',
        'chunking',
        'embedding',
        'vector_upsert',
        'completed',
        'failed',
      ],
      default: 'validation',
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    chunksGenerated: {
      type: Number,
      default: 0,
      min: 0,
    },
    tokensUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    error: {
      type: String,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
      min: 1,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

IngestionJobSchema.methods.toResponse = function (): IngestionJob {
  return {
    id: this._id.toString(),
    courseId: this.courseId.toString(),
    materialId: this.materialId.toString(),
    userId: this.userId.toString(),
    status: this.status,
    stage: this.stage,
    progress: this.progress,
    chunksGenerated: this.chunksGenerated,
    tokensUsed: this.tokensUsed,
    error: this.error,
    attempts: this.attempts,
    maxAttempts: this.maxAttempts,
    startedAt: this.startedAt?.toISOString(),
    completedAt: this.completedAt?.toISOString(),
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString(),
  };
};

export const IngestionJobModel = mongoose.model<
  IIngestionJob,
  Model<IIngestionJob, object, IIngestionJobMethods>
>('IngestionJob', IngestionJobSchema);
