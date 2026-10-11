import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { ConceptNote, SourceCitation } from '@omnitutor/shared';

export interface IConceptNoteDocument extends Document {
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  conversationId?: mongoose.Types.ObjectId;
  category: 'explanation' | 'revision' | 'summary' | 'flashcard';
  title: string;
  content: string;
  citations: SourceCitation[];
  tags: string[];
  flashcardData?: { front: string; back: string };
  createdAt: Date;
  updatedAt: Date;
  toResponse(): ConceptNote & { category?: string; flashcardData?: { front: string; back: string } };
}

const ConceptNoteSchema = new Schema<IConceptNoteDocument>(
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
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: false,
    },
    category: {
      type: String,
      enum: ['explanation', 'revision', 'summary', 'flashcard'],
      default: 'explanation',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 30000,
    },
    citations: {
      type: Schema.Types.Mixed,
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    flashcardData: {
      front: { type: String, maxlength: 1000 },
      back: { type: String, maxlength: 2000 },
    },
  },
  {
    timestamps: true,
  }
);

ConceptNoteSchema.index({ userId: 1, courseId: 1, createdAt: -1 });
ConceptNoteSchema.index({ userId: 1, category: 1, createdAt: -1 });

ConceptNoteSchema.methods.toResponse = function (): ConceptNote & { category?: string; flashcardData?: { front: string; back: string } } {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    courseId: this.courseId.toString(),
    conversationId: this.conversationId ? this.conversationId.toString() : undefined,
    category: this.category || 'explanation',
    title: this.title,
    content: this.content,
    citations: this.citations || [],
    tags: this.tags || [],
    flashcardData: this.flashcardData,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const ConceptNoteModel: Model<IConceptNoteDocument> =
  mongoose.models.ConceptNote ||
  mongoose.model<IConceptNoteDocument>('ConceptNote', ConceptNoteSchema);
