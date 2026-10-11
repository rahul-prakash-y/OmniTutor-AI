import type { IEmailService, SentEmailRecord } from './email.interface.js';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';

export class MockEmailService implements IEmailService {
  private sentEmails: SentEmailRecord[] = [];

  constructor(private appUrl: string = env.APP_URL) {}

  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const url = `${this.appUrl}/verify-email?token=${token}`;
    const record: SentEmailRecord = {
      to,
      name,
      type: 'verification',
      token,
      url,
      sentAt: new Date(),
    };
    this.sentEmails.push(record);

    if (env.NODE_ENV === 'development') {
      logger.info(
        { recipient: to, verificationUrl: url },
        `📧 [Local Email Sink] Verification email dispatched for ${name} (${to}).`
      );
    } else if (env.NODE_ENV === 'test') {
      logger.debug({ recipient: to }, 'Mock email verification dispatched');
    } else {
      logger.warn(
        { recipient: to },
        '⚠️ Using MockEmailService in production. No real SMTP/transactional provider is configured!'
      );
    }
  }

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const url = `${this.appUrl}/reset-password?token=${token}`;
    const record: SentEmailRecord = {
      to,
      name,
      type: 'password_reset',
      token,
      url,
      sentAt: new Date(),
    };
    this.sentEmails.push(record);

    if (env.NODE_ENV === 'development') {
      logger.info(
        { recipient: to, resetUrl: url },
        `📧 [Local Email Sink] Password reset email dispatched for ${name} (${to}).`
      );
    } else if (env.NODE_ENV === 'test') {
      logger.debug({ recipient: to }, 'Mock email password reset dispatched');
    } else {
      logger.warn(
        { recipient: to },
        '⚠️ Using MockEmailService in production. No real SMTP/transactional provider is configured!'
      );
    }
  }

  getSentEmails(): ReadonlyArray<SentEmailRecord> {
    return [...this.sentEmails];
  }

  getLastVerificationToken(email: string): string | undefined {
    const found = [...this.sentEmails]
      .reverse()
      .find((e) => e.to.toLowerCase() === email.toLowerCase() && e.type === 'verification');
    return found?.token;
  }

  getLastResetToken(email: string): string | undefined {
    const found = [...this.sentEmails]
      .reverse()
      .find((e) => e.to.toLowerCase() === email.toLowerCase() && e.type === 'password_reset');
    return found?.token;
  }

  clear(): void {
    this.sentEmails = [];
  }
}
