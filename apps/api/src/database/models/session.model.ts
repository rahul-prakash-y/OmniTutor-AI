import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface ISession {
  userId: Types.ObjectId;
  sessionTokenHash: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionMethods {
  isValid(): boolean;
}

export type SessionDocument = Document<unknown, object, ISession> & ISession & ISessionMethods;

const SessionSchema = new Schema<ISession, Model<ISession, object, ISessionMethods>, ISessionMethods>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userAgent: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

SessionSchema.methods.isValid = function (): boolean {
  return !this.revokedAt && this.expiresAt.getTime() > Date.now();
};

export const Session = mongoose.model<ISession, Model<ISession, object, ISessionMethods>>('Session', SessionSchema);
