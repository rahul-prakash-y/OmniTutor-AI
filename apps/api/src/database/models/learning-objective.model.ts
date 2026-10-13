import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { LearningObjective } from '@omnitutor/shared';

export interface ILearningObjectiveDocument extends Document {
  courseId: mongoose.Types.ObjectId;
  code: string;
  title: string;
  description: string;
  topic: string;
  materialIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  toResponse(): LearningObjective;
}

const LearningObjectiveSchema = new Schema<ILearningObjectiveDocument>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    materialIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Material',
      },
    ],
  },
  {
    timestamps: true,
  }
);

LearningObjectiveSchema.index({ courseId: 1, code: 1 }, { unique: true });
LearningObjectiveSchema.index({ courseId: 1, topic: 1 });

LearningObjectiveSchema.methods.toResponse = function (): LearningObjective {
  return {
    id: this._id.toString(),
    courseId: this.courseId.toString(),
    code: this.code,
    title: this.title,
    description: this.description,
    topic: this.topic,
    materialIds: (this.materialIds || []).map((m: mongoose.Types.ObjectId) => m.toString()),
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const LearningObjectiveModel: Model<ILearningObjectiveDocument> =
  mongoose.models.LearningObjective ||
  mongoose.model<ILearningObjectiveDocument>('LearningObjective', LearningObjectiveSchema);
