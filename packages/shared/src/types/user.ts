export type UserRole = 'student' | 'tutor' | 'admin';

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
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}
