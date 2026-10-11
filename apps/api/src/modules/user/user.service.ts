import type { UpdateProfileInput, UserProfile } from '@omnitutor/shared';
import { User, Session } from '../../database/models/index.js';
import { NotFoundError } from '../../utils/errors.js';

export class UserService {
  /**
   * Get user profile by ID.
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    return user.toProfile();
  }

  /**
   * Update profile details and/or learning preferences.
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    if (input.fullName !== undefined) {
      user.fullName = input.fullName.trim();
    }

    if (input.preferences) {
      user.preferences = {
        theme: input.preferences.theme ?? user.preferences.theme,
        preferredDifficulty: input.preferences.preferredDifficulty ?? user.preferences.preferredDifficulty,
        socraticPacing: input.preferences.socraticPacing ?? user.preferences.socraticPacing,
        enableSoundEffects: input.preferences.enableSoundEffects ?? user.preferences.enableSoundEffects,
        voiceSpeed: input.preferences.voiceSpeed ?? user.preferences.voiceSpeed,
      };
    }

    await user.save();
    return user.toProfile();
  }

  /**
   * Delete account and revoke all associated sessions.
   */
  async deleteAccount(userId: string): Promise<void> {
    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // Revoke all sessions immediately
    await Session.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });

    // Mark user as deleted
    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();
  }

  /**
   * Admin: list all users.
   */
  async listUsers(): Promise<UserProfile[]> {
    const users = await User.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(50);
    return users.map((u) => u.toProfile());
  }
}
