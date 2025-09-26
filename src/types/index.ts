/**
 * Core TypeScript type definitions for the Flomoji workflow application
 * 
 * This file contains the essential type definitions used throughout the application.
 * Types are organized by domain: nodes, workflows, execution, storage, and services.
 */

// ============================================================================
// Node Types & Definitions
// ============================================================================

/**
 * Available node types in the workflow system
 */
export type NodeType =
  | 'input'
  | 'output'
  | 'llm'
  | 'if'
  | 'while'
  | 'text'
  | 'text_combiner'
  | 'variable_set'
  | 'schedule'
  | 'http_request'
  | 'web_search'
  | 'code_execution'
  | 'web_api'
  | 'timestamp'
  | 'structured_extraction'
  | 'schema_validator'
  | 'json_transform'
  | 'array_operations'
  | 'data_transform'
  | 'workflow';

/**
 * Execution context interface for node execution
 */
export interface INodeExecutionContext {
  variables: Record<string, any>;
  addLog: (level: 'info' | 'warning' | 'error' | 'debug' | 'success', message: string, nodeId?: string | null, data?: any) => void;
  setVariable: (key: string, value: any) => void;
  getVariable: (key: string) => any;
}

/**
 * Node inputs structure
 */
export interface NodeInputs {
  [key: string]: any;
}

/**
 * Node output structure
 */
export type NodeOutput = any; // This can be refined based on specific node types

/**
 * Node definition for the node registry
 */
export interface NodeDefinition {
  type: string;
  label: string;
  icon: string;
  color: string;
  inputs: string[];
  outputs: string[];
  defaultData: Record<string, any>;
  execute: (
    node: WorkflowNode, 
    inputs: NodeInputs, 
    context?: INodeExecutionContext
  ) => Promise<NodeOutput>;
  metadata?: {
    description?: string;
    category?: string;
  };
}

// ============================================================================
// Workflow Types
// ============================================================================

/**
 * Node instance in a workflow
 */
/**
 * Data structure for node-specific properties
 */
export interface NodeData extends Record<string, any> {
  label?: string;
  // For InputNode
  value?: any;
  inputType?: 'text' | 'file';
  fileContent?: string;
  name?: string;
  // For OutputNode
  format?: 'text' | 'json';
  title?: string;
  // For WorkflowNode
  workflowId?: string;
  workflowName?: string;
  inputs?: { id: string; name: string }[];
  outputs?: { id: string; name: string }[];
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

/**
 * Connection between nodes
 */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * Complete workflow definition
 */
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  flow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    viewport?: {
      x: number;
      y: number;
      zoom: number;
    };
  };
  lastModified?: string | null;
  createdAt?: string | null;
  tags?: string[];
}

// ============================================================================
// Execution & Logging
// ============================================================================

/**
 * Executor interface for node execution
 */
export interface Executor {
  next: () => Promise<{ done: boolean; value: NodeExecutionState }>;
  stop: () => void;
}

/**
 * Execution state
 */
export interface ExecutionState {
  running: boolean;
  currentNodeId: string | null;
  executedNodeIds: Set<string>;
}

/**
 * Result of workflow execution
 */
export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: Error | string;
  logs?: LogEntry[];
  variables?: Record<string, any>;
}

/**
 * WorkflowExecutor interface for managing workflow execution
 */
export interface WorkflowExecutor {
  execute: () => Promise<void>;
  stop: () => void;
  isRunning: () => boolean;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug' | 'success';
  message: string;
  nodeId?: string | null;
  data?: any;
}

export interface ParsedWorkflowRun {
  id: string;
  workflowId: string;
  startedAt: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  inputData: Record<string, any>;
  endedAt?: string;
  updatedAt?: string;
}

export interface ParsedNodeLog {
  id: string;
  runId: string;
  nodeId: string;
  timestamp: string;
  status: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  error?: string | null;
  processingTime?: number | null;
}

// ============================================================================
// Scheduler Types
// ============================================================================

/**
 * Schedule configuration for workflows
 */
export interface ScheduleConfig {
  workflowId: string;
  cronExpression: string;
  name: string;
  enabled: boolean;
  timezone?: string;
  timeoutMinutes?: number;
  createdAt?: string;
  lastExecuted?: string | null;
  executionCount?: number;
  onExecute?: () => void;
}

/**
 * Execution information for running workflows
 */
export interface ExecutionInfo {
  startedAt: Date;
  workflowId: string;
  scheduleConfig: ScheduleConfig;
  timeoutHandle?: NodeJS.Timeout;
}

/**
 * Cron expression preset
 */
export interface CronPreset {
  label: string;
  value: string;
  description: string;
}

// ============================================================================
// Node Execution Types
// ============================================================================

/**
 * Execution context for nodes
 */
export interface ExecutionContext {
  [nodeId: string]: any;
}

/**
 * Debug log entry for execution
 */
export interface DebugLogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug' | 'success';
  message: string;
  nodeId: string | null;
  data?: any;
}

/**
 * Node execution state
 */
export interface NodeExecutionState {
  status: 'idle' | 'running' | 'completed' | 'error' | 'stopped';
  currentNodeId?: string | null;
  error?: Error | null;
  variables?: Record<string, any>;
  nodeId?: string;
}

/**
 * Connection format for node execution
 */
export interface NodeConnection {
  id?: string;
  source?: string;
  target?: string;
  sourceHandle?: string;
  targetHandle?: string;
  from?: {
    nodeId: string;
    portIndex: number;
  };
  to?: {
    nodeId: string;
    portIndex: number;
    name?: string;
  };
}

// ============================================================================
// Service Types
// ============================================================================

/**
 * Generic service response wrapper
 */
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * LLM service configuration
 */
export interface LLMSettings {
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  // Web Search API keys
  googleApiKey?: string;
  googleSearchEngineId?: string;
  braveApiKey?: string;
  bingApiKey?: string;
  // Custom API keys
  customApiKeys?: Record<string, { apiKey: string; baseUrl?: string }>;
}

/**
 * LLM message format
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatHistoryItem {
  id: string;
  message: string;
  timestamp: string;
  role: 'user' | 'assistant' | 'system';
}

export interface Session {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  lastActivity: string;
  messages: ChatHistoryItem[];
}

// ============================================================================
// Storage Types
// ============================================================================

/**
 * Local storage data structure
 */
export interface StorageData {
  apiKeys?: Record<string, string>;
  settings?: Record<string, any>;
  workflows?: Record<string, Workflow>;
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Workflow-level error
 */
export class WorkflowError extends Error {
  constructor(message: string, public nodeId?: string) {
    super(message);
    this.name = 'WorkflowError';
  }
}

/**
 * Node execution error
 */
export class NodeExecutionError extends Error {
  constructor(message: string, public nodeId: string, public cause?: Error) {
    super(message);
    this.name = 'NodeExecutionError';
  }
}
