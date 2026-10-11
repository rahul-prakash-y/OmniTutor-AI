import type {
  RegisterInput,
  LoginInput,
  UserProfile,
} from '@omnitutor/shared';
import { User, Session, type UserDocument } from '../../database/models/index.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { generateRandomToken, hashToken, generateCsrfToken } from '../../utils/crypto.js';
import {
  UnauthorizedError,
  ConflictError,
  BadRequestError,
} from '../../utils/errors.js';
import type { IEmailService } from '../../services/email/email.interface.js';
import { env } from '../../config/env.js';

export interface SessionResult {
  user: UserProfile;
  sessionToken: string;
  csrfToken: string;
}

export class AuthService {
  constructor(private emailService: IEmailService) {}

  /**
   * Register a new student account.
   */
  async register(
    input: RegisterInput,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<SessionResult> {
    const email = input.email.toLowerCase().trim();

    // Check duplicate account
    const existing = await User.findOne({ email, isDeleted: false });
    if (existing) {
      throw new ConflictError('An account with this email address already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const verificationToken = generateRandomToken(32);
    const verificationHash = hashToken(verificationToken);
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = new User({
      fullName: input.fullName.trim(),
      email,
      passwordHash,
      role: 'student', // Least-privilege default
      isEmailVerified: false,
      emailVerificationTokenHash: verificationHash,
      emailVerificationExpiresAt: verificationExpiresAt,
      preferences: {
        theme: input.preferences?.theme || 'dark',
        preferredDifficulty: input.preferences?.preferredDifficulty || 'intermediate',
        socraticPacing: input.preferences?.socraticPacing || 'balanced',
        enableSoundEffects: input.preferences?.enableSoundEffects ?? true,
        voiceSpeed: input.preferences?.voiceSpeed ?? 1.0,
      },
    });

    await user.save();

    // Dispatch verification email
    await this.emailService.sendVerificationEmail(user.email, user.fullName, verificationToken);

    // Create session
    return this.createSessionForUser(user, meta);
  }

  /**
   * Authenticate user with credentials.
   */
  async login(
    input: LoginInput,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<SessionResult> {
    const email = input.email.toLowerCase().trim();

    const user = await User.findOne({ email, isDeleted: false });
    if (!user) {
      // Generic error prevents email enumeration
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await verifyPassword(user.passwordHash, input.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return this.createSessionForUser(user, meta);
  }

  /**
   * Revoke session on logout.
   */
  async logout(sessionToken: string, allSessions = false): Promise<void> {
    const tokenHash = hashToken(sessionToken);

    if (allSessions) {
      const current = await Session.findOne({ sessionTokenHash: tokenHash });
      if (current) {
        await Session.updateMany(
          { userId: current.userId, revokedAt: null },
          { $set: { revokedAt: new Date() } }
        );
      }
    } else {
      await Session.updateOne(
        { sessionTokenHash: tokenHash, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }
  }

  /**
   * Request password reset token. Always returns without exposing account existence.
   */
  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, isDeleted: false });

    if (!user) {
      // Return cleanly to avoid account enumeration
      return;
    }

    const resetToken = generateRandomToken(32);
    const resetHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    user.passwordResetTokenHash = resetHash;
    user.passwordResetExpiresAt = expiresAt;
    await user.save();

    await this.emailService.sendPasswordResetEmail(user.email, user.fullName, resetToken);
  }

  /**
   * Complete password reset using single-use token.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetHash = hashToken(token);

    const user = await User.findOne({
      passwordResetTokenHash: resetHash,
      passwordResetExpiresAt: { $gt: new Date() },
      isDeleted: false,
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired password reset token');
    }

    const newHash = await hashPassword(newPassword);

    user.passwordHash = newHash;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    // Invalidate all existing sessions on password reset for security
    await Session.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }

  /**
   * Verify email address using single-use token.
   */
  async verifyEmail(token: string): Promise<UserProfile> {
    const verificationHash = hashToken(token);

    const user = await User.findOne({
      emailVerificationTokenHash: verificationHash,
      emailVerificationExpiresAt: { $gt: new Date() },
      isDeleted: false,
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired email verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    return user.toProfile();
  }

  /**
   * Helper: create a session for a user.
   */
  private async createSessionForUser(
    user: UserDocument,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<SessionResult> {
    const sessionToken = generateRandomToken(32);
    const sessionTokenHash = hashToken(sessionToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = new Session({
      userId: user._id,
      sessionTokenHash,
      userAgent: meta?.userAgent || null,
      ipAddress: meta?.ip || null,
      expiresAt,
    });

    await session.save();

    const csrfToken = generateCsrfToken(sessionToken, env.SESSION_SECRET);

    return {
      user: user.toProfile(),
      sessionToken,
      csrfToken,
    };
  }
}
