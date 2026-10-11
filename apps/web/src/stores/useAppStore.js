import { create } from 'zustand';
export const useAppStore = create((set) => ({
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
