import { create } from 'zustand';
import type { TutoringMode, UserRole } from '@omnitutor/shared';

interface AppState {
  sidebarOpen: boolean;
  activeMode: TutoringMode;
  activeSubject: string;
  userRole: UserRole;
  userName: string;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveMode: (mode: TutoringMode) => void;
  setActiveSubject: (subject: string) => void;
  setUserRole: (role: UserRole) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  activeMode: 'socratic',
  activeSubject: 'Computer Science',
  userRole: 'student',
  userName: 'Rahul Prakash',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveMode: (mode) => set({ activeMode: mode }),
  setActiveSubject: (subject) => set({ activeSubject: subject }),
  setUserRole: (role) => set({ userRole: role }),
}));
