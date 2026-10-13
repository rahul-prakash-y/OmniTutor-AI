import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { Conversation, TutoringMode, AcademicLevel, ExplanationStyle } from '@omnitutor/shared';

export interface IConversationDocument extends Document {
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  materialId?: mongoose.Types.ObjectId;
  title: string;
  mode: TutoringMode;
  academicLevel: AcademicLevel;
  explanationStyle: ExplanationStyle;
  language?: string;
  isPinned: boolean;
  messageCount: number;
  lastMessagePreview?: string;
  createdAt: Date;
  updatedAt: Date;
  toResponse(): Conversation;
}

const ConversationSchema = new Schema<IConversationDocument>(
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
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: false,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'New Tutoring Session',
      maxlength: 150,
    },
    mode: {
      type: String,
      enum: ['socratic', 'direct', 'quiz', 'code_review'],
      default: 'socratic',
    },
    academicLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'undergraduate', 'graduate'],
      default: 'intermediate',
    },
    explanationStyle: {
      type: String,
      enum: ['step_by_step', 'analogy', 'summary', 'revision_notes'],
      default: 'step_by_step',
    },
    language: {
      type: String,
      default: 'en',
      maxlength: 10,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    lastMessagePreview: {
      type: String,
      maxlength: 300,
    },
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ userId: 1, courseId: 1, updatedAt: -1 });

ConversationSchema.methods.toResponse = function (): Conversation {
  return {
    id: this._id.toString(),
    courseId: this.courseId.toString(),
    userId: this.userId.toString(),
    materialId: this.materialId ? this.materialId.toString() : undefined,
    title: this.title,
    mode: this.mode,
    academicLevel: this.academicLevel,
    explanationStyle: this.explanationStyle,
    language: this.language || 'en',
    isPinned: this.isPinned,
    messageCount: this.messageCount,
    lastMessagePreview: this.lastMessagePreview,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const ConversationModel: Model<IConversationDocument> =
  mongoose.models.Conversation ||
  mongoose.model<IConversationDocument>('Conversation', ConversationSchema);
