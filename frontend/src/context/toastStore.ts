import { create } from 'zustand';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    const duration = toast.duration ?? (toast.type === 'error' ? 5000 : 3500);
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));

// Convenience helper functions callable from anywhere without React hooks
export const toast = {
  success: (message: string, title = 'Success') =>
    useToastStore.getState().addToast({ type: 'success', message, title }),
  error: (message: string, title = 'Error') =>
    useToastStore.getState().addToast({ type: 'error', message, title }),
  warning: (message: string, title = 'Warning') =>
    useToastStore.getState().addToast({ type: 'warning', message, title }),
  info: (message: string, title = 'Notification') =>
    useToastStore.getState().addToast({ type: 'info', message, title }),
};
