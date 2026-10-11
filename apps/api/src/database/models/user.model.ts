import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { UserProfile, UserRole } from '@omnitutor/shared';

export interface IUserPreferences {
  theme: 'light' | 'dark' | 'system';
  preferredDifficulty: 'beginner' | 'intermediate' | 'advanced';
  socraticPacing: 'gentle' | 'balanced' | 'rigorous';
  enableSoundEffects: boolean;
  voiceSpeed: number;
}

export interface IUser {
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  avatarUrl?: string;
  isEmailVerified: boolean;
  emailVerificationTokenHash?: string | null;
  emailVerificationExpiresAt?: Date | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;
  preferences: IUserPreferences;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  toProfile(): UserProfile;
}

export type UserDocument = Document<unknown, object, IUser> & IUser & IUserMethods;

const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'dark',
    },
    preferredDifficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate',
    },
    socraticPacing: {
      type: String,
      enum: ['gentle', 'balanced', 'rigorous'],
      default: 'balanced',
    },
    enableSoundEffects: {
      type: Boolean,
      default: true,
    },
    voiceSpeed: {
      type: Number,
      min: 0.5,
      max: 2.0,
      default: 1.0,
    },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser, Model<IUser, object, IUserMethods>, IUserMethods>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
      index: true,
    },
    avatarUrl: {
      type: String,
      default: undefined,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationTokenHash: {
      type: String,
      default: null,
      index: true,
    },
    emailVerificationExpiresAt: {
      type: Date,
      default: null,
    },
    passwordResetTokenHash: {
      type: String,
      default: null,
      index: true,
    },
    passwordResetExpiresAt: {
      type: Date,
      default: null,
    },
    preferences: {
      type: UserPreferencesSchema,
      default: () => ({}),
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as Record<string, unknown>).passwordHash;
        delete (ret as Record<string, unknown>).emailVerificationTokenHash;
        delete (ret as Record<string, unknown>).passwordResetTokenHash;
        return ret;
      },
    },
  }
);

UserSchema.methods.toProfile = function (): UserProfile {
  return {
    id: this._id.toString(),
    email: this.email,
    fullName: this.fullName,
    role: this.role as UserRole,
    avatarUrl: this.avatarUrl,
    isEmailVerified: this.isEmailVerified,
    preferences: {
      theme: this.preferences?.theme || 'dark',
      preferredDifficulty: this.preferences?.preferredDifficulty || 'intermediate',
      socraticPacing: this.preferences?.socraticPacing || 'balanced',
      enableSoundEffects: this.preferences?.enableSoundEffects ?? true,
      voiceSpeed: this.preferences?.voiceSpeed ?? 1.0,
    },
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: this.updatedAt ? this.updatedAt.toISOString() : new Date().toISOString(),
  };
};

export const User = mongoose.model<IUser, Model<IUser, object, IUserMethods>>('User', UserSchema);
