export type UserRole = 'student' | 'admin';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  preferredDifficulty: 'beginner' | 'intermediate' | 'advanced';
  socraticPacing: 'gentle' | 'balanced' | 'rigorous';
  enableSoundEffects: boolean;
  voiceSpeed: number;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  isEmailVerified: boolean;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserSessionInfo {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface AuthResponse {
  user: UserProfile;
  csrfToken: string;
  session?: UserSessionInfo;
}
