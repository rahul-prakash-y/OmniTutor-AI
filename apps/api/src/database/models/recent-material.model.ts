import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { RecentMaterial } from '@omnitutor/shared';

export interface IRecentMaterialDocument extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  lastViewedAt: Date;
  lastPosition?: {
    page?: number;
    timestamp?: number;
  };
  toResponse(courseTitle?: string, materialTitle?: string, filename?: string, mimeType?: string): RecentMaterial;
}

const RecentMaterialSchema = new Schema<IRecentMaterialDocument>(
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
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: true,
      index: true,
    },
    lastViewedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastPosition: {
      page: { type: Number, min: 1 },
      timestamp: { type: Number, min: 0 },
    },
  },
  {
    timestamps: false,
  }
);

RecentMaterialSchema.index({ userId: 1, materialId: 1 }, { unique: true });
RecentMaterialSchema.index({ userId: 1, lastViewedAt: -1 });

RecentMaterialSchema.methods.toResponse = function (
  courseTitle = 'Course',
  materialTitle = 'Material',
  filename = 'material',
  mimeType = 'application/pdf'
): RecentMaterial {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    courseId: this.courseId.toString(),
    courseTitle,
    materialId: this.materialId.toString(),
    materialTitle,
    filename,
    mimeType,
    lastViewedAt: this.lastViewedAt.toISOString(),
    lastPosition: this.lastPosition,
  };
};

export const RecentMaterialModel: Model<IRecentMaterialDocument> =
  mongoose.models.RecentMaterial ||
  mongoose.model<IRecentMaterialDocument>('RecentMaterial', RecentMaterialSchema);
