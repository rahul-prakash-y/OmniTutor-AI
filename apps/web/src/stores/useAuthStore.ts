import { create } from 'zustand';
import type {
  UserProfile,
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
} from '@omnitutor/shared';
import { apiClient } from '../services/apiClient';
import { useAppStore } from './useAppStore';

const defaultFallbackUser: UserProfile = {
  id: 'usr-default',
  email: 'rahul.prakash@omnitutor.ai',
  fullName: 'Rahul Prakash',
  role: 'student',
  isEmailVerified: true,
  preferences: {
    theme: 'dark',
    preferredDifficulty: 'intermediate',
    socraticPacing: 'balanced',
    enableSoundEffects: true,
    voiceSpeed: 1.0,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  init: () => Promise<void>;
  login: (credentials: LoginInput) => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterInput) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (payload: UpdateProfileInput) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: defaultFallbackUser,
  isAuthenticated: true,
  isLoading: false,
  isInitialized: true,
  error: null,

  init: async () => {
    try {
      const res = await apiClient.getMe();
      if (res.success && res.data?.user) {
        const user = res.data.user;
        set({ user, isAuthenticated: true, isLoading: false, isInitialized: true, error: null });
        useAppStore.getState().setUserProfile({
          name: user.fullName,
          email: user.email,
          role: user.role,
        });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
      }
    } catch {
      // In offline / degraded client mode, preserve fallback for demo
      set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    const res = await apiClient.login(credentials);

    if (res.success && res.data?.user) {
      const user = res.data.user;
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      useAppStore.getState().setUserProfile({
        name: user.fullName,
        email: user.email,
        role: user.role,
      });
      return { success: true };
    }

    const errorMsg = res.error?.message || 'Login failed. Please check your credentials.';
    set({ isLoading: false, error: errorMsg });
    return { success: false, error: errorMsg };
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    const res = await apiClient.register(payload);

    if (res.success && res.data?.user) {
      const user = res.data.user;
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      useAppStore.getState().setUserProfile({
        name: user.fullName,
        email: user.email,
        role: user.role,
      });
      return { success: true };
    }

    const errorMsg = res.error?.message || 'Registration failed. Please check your details.';
    set({ isLoading: false, error: errorMsg });
    return { success: false, error: errorMsg };
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiClient.logout();
    } catch {
      // Ignore network errors on logout
    }
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  updateProfile: async (payload) => {
    set({ isLoading: true, error: null });
    const res = await apiClient.updateProfile(payload);

    if (res.success && res.data) {
      const user = res.data;
      set({ user, isLoading: false, error: null });
      useAppStore.getState().setUserProfile({
        name: user.fullName,
        email: user.email,
        role: user.role,
      });
      return { success: true };
    }

    const errorMsg = res.error?.message || 'Failed to update profile.';
    set({ isLoading: false, error: errorMsg });
    return { success: false, error: errorMsg };
  },

  deleteAccount: async () => {
    set({ isLoading: true, error: null });
    const res = await apiClient.deleteAccount();

    if (res.success) {
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
      return { success: true };
    }

    const errorMsg = res.error?.message || 'Failed to delete account.';
    set({ isLoading: false, error: errorMsg });
    return { success: false, error: errorMsg };
  },

  clearError: () => set({ error: null }),
}));
