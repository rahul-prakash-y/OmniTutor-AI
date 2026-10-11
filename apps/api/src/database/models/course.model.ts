import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import type { AcademicLevel, Course, CourseProcessingStatus, CourseStatus } from '@omnitutor/shared';

export interface ICourse {
  title: string;
  description: string;
  subject: string;
  academicLevel: AcademicLevel;
  tags: string[];
  owner: Types.ObjectId;
  status: CourseStatus;
  processingStatus: CourseProcessingStatus;
  materialCount: number;
  indexedChunkCount: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICourseMethods {
  toResponse(): Course;
}

export type CourseDocument = Document<Types.ObjectId, object, ICourse> & ICourse & ICourseMethods;

const CourseSchema = new Schema<ICourse, Model<ICourse, object, ICourseMethods>, ICourseMethods>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    academicLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'undergraduate', 'graduate'],
      default: 'intermediate',
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'draft'],
      default: 'active',
      index: true,
    },
    processingStatus: {
      type: String,
      enum: ['idle', 'processing', 'indexed', 'failed'],
      default: 'idle',
      index: true,
    },
    materialCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    indexedChunkCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CourseSchema.methods.toResponse = function (): Course {
  return {
    id: this._id.toString(),
    title: this.title,
    description: this.description,
    subject: this.subject,
    academicLevel: this.academicLevel,
    tags: this.tags || [],
    ownerId: this.owner.toString(),
    status: this.status,
    processingStatus: this.processingStatus,
    materialCount: this.materialCount,
    indexedChunkCount: this.indexedChunkCount,
    isArchived: this.isArchived,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString(),
  };
};

export const CourseModel = mongoose.model<ICourse, Model<ICourse, object, ICourseMethods>>(
  'Course',
  CourseSchema
);
