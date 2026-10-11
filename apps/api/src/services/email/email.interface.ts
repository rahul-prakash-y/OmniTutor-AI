export interface SentEmailRecord {
  to: string;
  name: string;
  type: 'verification' | 'password_reset';
  token: string;
  url: string;
  sentAt: Date;
}

export interface IEmailService {
  sendVerificationEmail(to: string, name: string, token: string): Promise<void>;
  sendPasswordResetEmail(to: string, name: string, token: string): Promise<void>;
}
