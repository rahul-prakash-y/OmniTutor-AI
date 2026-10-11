import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { Material, MaterialMetadata, MaterialStatus, SourceType } from '@omnitutor/shared';

export interface IMaterial {
  courseId: Types.ObjectId;
  ownerId: Types.ObjectId;
  filename: string;
  originalName: string;
  mimeType: string;
  detectedMimeType: string;
  sizeBytes: number;
  storageKey: string;
  sourceType: SourceType;
  status: MaterialStatus;
  chunkCount: number;
  metadata: MaterialMetadata;
  errorMessage?: string;
  retryCount: number;
  currentJobId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMaterialMethods {
  toResponse(): Material;
}

export type MaterialDocument = Document<Types.ObjectId, object, IMaterial> & IMaterial & IMaterialMethods;

const MaterialMetadataSchema = new Schema<MaterialMetadata>(
  {
    pageCount: { type: Number },
    slideCount: { type: Number },
    durationSeconds: { type: Number },
    wordCount: { type: Number },
    extractedHeadingCount: { type: Number },
    ocrApplied: { type: Boolean, default: false },
    hasVisuals: { type: Boolean, default: false },
    language: { type: String },
    audioSampleRate: { type: Number },
    videoResolution: { type: String },
  },
  { _id: false }
);

const MaterialSchema = new Schema<IMaterial, Model<IMaterial, object, IMaterialMethods>, IMaterialMethods>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    detectedMimeType: {
      type: String,
      required: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 0,
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
    },
    sourceType: {
      type: String,
      enum: ['pdf', 'pptx', 'docx', 'txt', 'md', 'video', 'audio'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['uploaded', 'queued', 'processing', 'indexed', 'failed'],
      default: 'uploaded',
      index: true,
    },
    chunkCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    metadata: {
      type: MaterialMetadataSchema,
      default: () => ({}),
    },
    errorMessage: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentJobId: {
      type: Schema.Types.ObjectId,
      ref: 'IngestionJob',
    },
  },
  {
    timestamps: true,
  }
);

MaterialSchema.methods.toResponse = function (): Material {
  return {
    id: this._id.toString(),
    courseId: this.courseId.toString(),
    ownerId: this.ownerId.toString(),
    filename: this.filename,
    originalName: this.originalName,
    mimeType: this.mimeType,
    detectedMimeType: this.detectedMimeType,
    sizeBytes: this.sizeBytes,
    storageKey: this.storageKey,
    sourceType: this.sourceType,
    status: this.status,
    chunkCount: this.chunkCount,
    metadata: this.metadata || {},
    errorMessage: this.errorMessage,
    retryCount: this.retryCount,
    currentJobId: this.currentJobId ? this.currentJobId.toString() : undefined,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString(),
  };
};

export const MaterialModel = mongoose.model<IMaterial, Model<IMaterial, object, IMaterialMethods>>(
  'Material',
  MaterialSchema
);
