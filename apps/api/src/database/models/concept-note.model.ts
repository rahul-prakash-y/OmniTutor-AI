import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { ConceptNote, SourceCitation } from '@omnitutor/shared';

export interface IConceptNoteDocument extends Document {
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  conversationId?: mongoose.Types.ObjectId;
  title: string;
  content: string;
  citations: SourceCitation[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  toResponse(): ConceptNote;
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
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 20000,
    },
    citations: {
      type: Schema.Types.Mixed,
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

ConceptNoteSchema.index({ userId: 1, courseId: 1, createdAt: -1 });

ConceptNoteSchema.methods.toResponse = function (): ConceptNote {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    courseId: this.courseId.toString(),
    conversationId: this.conversationId ? this.conversationId.toString() : undefined,
    title: this.title,
    content: this.content,
    citations: this.citations || [],
    tags: this.tags || [],
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const ConceptNoteModel: Model<IConceptNoteDocument> =
  mongoose.models.ConceptNote ||
  mongoose.model<IConceptNoteDocument>('ConceptNote', ConceptNoteSchema);
