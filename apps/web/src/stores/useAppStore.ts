import { create } from 'zustand';
import type { TutoringMode, UserRole } from '@omnitutor/shared';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'alert';
}

interface AppState {
  // Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Navigation & Shell
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  searchModalOpen: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setSearchModalOpen: (open: boolean) => void;

  // User Profile
  userName: string;
  userEmail: string;
  userRole: UserRole;
  userAvatarUrl?: string;
  setUserProfile: (profile: { name?: string; email?: string; role?: UserRole }) => void;

  // Tutoring state (preserved from Module 1)
  activeMode: TutoringMode;
  activeSubject: string;
  setActiveMode: (mode: TutoringMode) => void;
  setActiveSubject: (subject: string) => void;

  // Notifications
  notifications: NotificationItem[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
}

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = localStorage.getItem('omnitutor-theme') as ThemeMode | null;
    if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
      return saved;
    }
    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  } catch {
    // fallback
  }
  return 'dark';
};

const applyThemeToDOM = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export const useAppStore = create<AppState>((set) => {
  const initialTheme = getInitialTheme();
  applyThemeToDOM(initialTheme);

  return {
    theme: initialTheme,
    setTheme: (theme) => {
      localStorage.setItem('omnitutor-theme', theme);
      applyThemeToDOM(theme);
      set({ theme });
    },

    sidebarCollapsed: false,
    mobileMenuOpen: false,
    searchModalOpen: false,
    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
    setSearchModalOpen: (open) => set({ searchModalOpen: open }),

    userName: 'Rahul Prakash',
    userEmail: 'rahul.prakash@omnitutor.ai',
    userRole: 'student',
    userAvatarUrl: '',
    setUserProfile: (profile) =>
      set((state) => ({
        userName: profile.name ?? state.userName,
        userEmail: profile.email ?? state.userEmail,
        userRole: profile.role ?? state.userRole,
      })),

    activeMode: 'socratic',
    activeSubject: 'Computer Science',
    setActiveMode: (mode) => set({ activeMode: mode }),
    setActiveSubject: (subject) => set({ activeSubject: subject }),

    notifications: [
      {
        id: 'n1',
        title: 'Mastery Milestone Reached',
        description: 'You completed 8 modules in Dynamic Programming with 92% retention.',
        timestamp: '15m ago',
        read: false,
        type: 'success',
      },
      {
        id: 'n2',
        title: 'Diagnostic Assessment Ready',
        description: 'AI Tutor generated your weekly adaptive quiz for Algorithms.',
        timestamp: '2h ago',
        read: false,
        type: 'info',
      },
      {
        id: 'n3',
        title: 'Streak Alert',
        description: 'You are on a 5-day learning streak! Keep it going today.',
        timestamp: '1d ago',
        read: true,
        type: 'alert',
      },
    ],
    markNotificationAsRead: (id) =>
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      })),
    markAllNotificationsAsRead: () =>
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      })),
  };
});
