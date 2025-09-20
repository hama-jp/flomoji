import { Node, Edge } from '@xyflow/react';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
  tags?: string[];
  category?: string;
  author?: string;
  version?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkflowMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  isTemplate?: boolean;
  isFavorite?: boolean;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  logs: ExecutionLog[];
  results?: any;
  error?: string;
}

export interface ExecutionLog {
  id: string;
  nodeId: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  data?: any;
}

export interface WorkflowValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  nodeId?: string;
  edgeId?: string;
  type: 'missing_connection' | 'invalid_connection' | 'missing_config' | 'circular_dependency' | 'other';
  message: string;
}

export interface ValidationWarning {
  nodeId?: string;
  edgeId?: string;
  type: 'unused_node' | 'performance' | 'deprecated' | 'other';
  message: string;
}