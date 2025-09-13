// Component prop types for Flomoji project
import React from 'react';

// Common prop types
export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

// Event handler types
export type ChangeEventHandler<T = HTMLInputElement> = React.ChangeEventHandler<T>;
export type MouseEventHandler<T = HTMLButtonElement> = React.MouseEventHandler<T>;
export type FormEventHandler<T = HTMLFormElement> = React.FormEventHandler<T>;

// Input component props
export interface InputProps extends BaseProps {
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';
  placeholder?: string;
  value?: string | number;
  onChange?: ChangeEventHandler;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
}

// Button component props
export interface ButtonProps extends BaseProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onClick?: MouseEventHandler;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  asChild?: boolean;
}

// Card component props
export interface CardProps extends BaseProps {}
export interface CardHeaderProps extends BaseProps {}
export interface CardTitleProps extends BaseProps {}
export interface CardDescriptionProps extends BaseProps {}
export interface CardContentProps extends BaseProps {}
export interface CardFooterProps extends BaseProps {}

// Badge component props
export interface BadgeProps extends BaseProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

// Alert component props
export interface AlertProps extends BaseProps {
  variant?: 'default' | 'destructive';
}
export interface AlertDescriptionProps extends BaseProps {}

// Tabs component props
export interface TabsProps extends BaseProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}
export interface TabsListProps extends BaseProps {}
export interface TabsTriggerProps extends BaseProps {
  value: string;
  disabled?: boolean;
}
export interface TabsContentProps extends BaseProps {
  value: string;
}

// Select component props
export interface SelectProps extends BaseProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
}

// Label component props
export interface LabelProps extends BaseProps {
  htmlFor?: string;
}

// Separator component props
export interface SeparatorProps extends BaseProps {
  orientation?: 'horizontal' | 'vertical';
}

// Switch component props
export interface SwitchProps extends BaseProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
}

// Textarea component props
export interface TextareaProps extends BaseProps {
  placeholder?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  cols?: number;
  name?: string;
}

// Dialog component props
export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

// Toast types
export type ToastActionElement = React.ReactElement;

export interface ToastProps {
  id?: string;
  title?: string;
  description?: string;
  action?: ToastActionElement;
  duration?: number;
  onOpenChange?: (open: boolean) => void;
}

// Node component specific types
export interface NodeData {
  label: string;
  [key: string]: any;
}

export interface NodeProps {
  id: string;
  data: NodeData;
  selected?: boolean;
  isConnectable?: boolean;
}

// Re-export types from other modules
export * from './index';
// Node types are already exported from nodeData, so we don't need to re-export from nodes
export * from './nodeData';