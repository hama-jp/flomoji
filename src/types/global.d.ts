// Global type declarations for Flomoji project

// Extend Window interface
declare global {
  interface Window {
    [key: string]: any;
  }
}

// Common function types
type AnyFunction = (...args: any[]) => any;
type VoidFunction = () => void;

// React types shortcuts
type ReactNode = import('react').ReactNode;
type ReactElement = import('react').ReactElement;
type FC<P = {}> = import('react').FC<P>;

// Utility types
type Nullable<T> = T | null;
type Optional<T> = T | undefined;
type Maybe<T> = T | null | undefined;

// Component prop helpers
type PropsWithClassName<P = {}> = P & { className?: string };
type PropsWithChildren<P = {}> = P & { children?: ReactNode };

export {};
