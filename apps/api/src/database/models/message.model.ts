import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type {
  ConversationMessage,
  SourceCitation,
  TutorMessageMetadata,
} from '@omnitutor/shared';

export interface IMessageDocument extends Document {
  conversationId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  citations: SourceCitation[];
  metadata?: TutorMessageMetadata;
  createdAt: Date;
  updatedAt: Date;
  toResponse(): ConversationMessage;
}

const MessageSchema = new Schema<IMessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
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
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 12000,
    },
    citations: {
      type: Schema.Types.Mixed,
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

MessageSchema.methods.toResponse = function (): ConversationMessage {
  return {
    id: this._id.toString(),
    conversationId: this.conversationId.toString(),
    courseId: this.courseId.toString(),
    userId: this.userId.toString(),
    role: this.role,
    content: this.content,
    citations: this.citations || [],
    metadata: this.metadata,
    createdAt: this.createdAt.toISOString(),
  };
};

export const MessageModel: Model<IMessageDocument> =
  mongoose.models.Message ||
  mongoose.model<IMessageDocument>('Message', MessageSchema);
