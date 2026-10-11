import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { ...toast, id };

    set((state) => ({ toasts: [...state.toasts, newToast] }));

    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }

    return id;
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}));

export const toast = {
  info: (message: string, title?: string) =>
    useToastStore.getState().addToast({ type: 'info', message, title }),
  success: (message: string, title?: string) =>
    useToastStore.getState().addToast({ type: 'success', message, title }),
  warning: (message: string, title?: string) =>
    useToastStore.getState().addToast({ type: 'warning', message, title }),
  error: (message: string, title?: string) =>
    useToastStore.getState().addToast({ type: 'error', message, title }),
};
