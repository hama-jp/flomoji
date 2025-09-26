import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';
export type ErrorCategory = 'network' | 'validation' | 'execution' | 'system' | 'user' | 'unknown';

export interface ErrorDetails {
  id: string;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: number;
  context?: Record<string, any>;
  stack?: string;
  userMessage?: string;
  recoverable?: boolean;
  retryable?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export interface ErrorRecoveryStrategy {
  type: 'retry' | 'fallback' | 'reset' | 'ignore';
  action: () => Promise<void>;
}

interface ErrorStore {
  errors: ErrorDetails[];
  maxErrors: number;

  addError: (error: ErrorDetails) => void;
  clearErrors: () => void;
  clearError: (id: string) => void;
  getRecentErrors: (count?: number) => ErrorDetails[];
  getErrorsByCategory: (category: ErrorCategory) => ErrorDetails[];
  getErrorsBySeverity: (severity: ErrorSeverity) => ErrorDetails[];
}

export const useErrorStore = create<ErrorStore>()(
  persist(
    (set, get) => ({
      errors: [],
      maxErrors: 100,

      addError: (error) => set((state) => {
        const errors = [error, ...state.errors].slice(0, state.maxErrors);
        return { errors };
      }),

      clearErrors: () => set({ errors: [] }),

      clearError: (id) => set((state) => ({
        errors: state.errors.filter(e => e.id !== id)
      })),

      getRecentErrors: (count = 10) => {
        return get().errors.slice(0, count);
      },

      getErrorsByCategory: (category) => {
        return get().errors.filter(e => e.category === category);
      },

      getErrorsBySeverity: (severity) => {
        return get().errors.filter(e => e.severity === severity);
      }
    }),
    {
      name: 'error-store',
      partialize: (state) => ({ errors: state.errors.slice(0, 50) }) // Persist only recent 50 errors
    }
  )
);