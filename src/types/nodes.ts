/**
 * Discriminated Union types for node data
 * Each node type has its specific data structure
 */

import { NodeType } from './index';

// Base node data structure
interface BaseNodeData {
  label?: string;
}

// Input node data
export interface InputNodeData extends BaseNodeData {
  type: 'input';
  prompt?: string;
  defaultValue?: string;
}

// Output node data
export interface OutputNodeData extends BaseNodeData {
  type: 'output';
  format?: 'text' | 'json' | 'markdown';
}

// LLM node data
export interface LLMNodeData extends BaseNodeData {
  type: 'llm';
  model?: string;
  apiKey?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: 'openai' | 'anthropic' | 'custom';
  apiEndpoint?: string;
}

// If node data
export interface IfNodeData extends BaseNodeData {
  type: 'if';
  condition?: string;
  operator?: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater' | 'less' | 'regex';
  value?: string;
}

// While node data
export interface WhileNodeData extends BaseNodeData {
  type: 'while';
  condition?: string;
  maxIterations?: number;
}

// Text node data
export interface TextNodeData extends BaseNodeData {
  type: 'text';
  text?: string;
}

// Text combiner node data
export interface TextCombinerNodeData extends BaseNodeData {
  type: 'text_combiner';
  separator?: string;
  template?: string;
}

// Variable set node data
export interface VariableSetNodeData extends BaseNodeData {
  type: 'variable_set';
  variableName?: string;
  variableValue?: string;
}

// Schedule node data
export interface ScheduleNodeData extends BaseNodeData {
  type: 'schedule';
  interval?: number;
  intervalUnit?: 'seconds' | 'minutes' | 'hours' | 'days';
  startTime?: string;
  endTime?: string;
  cronExpression?: string;
}

// HTTP Request node data
export interface HTTPRequestNodeData extends BaseNodeData {
  type: 'http_request';
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

// Web Search node data
export interface WebSearchNodeData extends BaseNodeData {
  type: 'web_search';
  query?: string;
  searchEngine?: 'google' | 'bing' | 'duckduckgo';
  maxResults?: number;
  apiKey?: string;
}

// Code Execution node data
export interface CodeExecutionNodeData extends BaseNodeData {
  type: 'code_execution';
  code?: string;
  language?: 'javascript' | 'python';
  timeout?: number;
}

// Web API node data
export interface WebAPINodeData extends BaseNodeData {
  type: 'web_api';
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  responseType?: 'json' | 'text' | 'blob';
  timeout?: number;
}

// Timestamp node data
export interface TimestampNodeData extends BaseNodeData {
  type: 'timestamp';
  format?: string;
  timezone?: string;
}

// Discriminated union of all node data types
export type NodeData = 
  | InputNodeData
  | OutputNodeData
  | LLMNodeData
  | IfNodeData
  | WhileNodeData
  | TextNodeData
  | TextCombinerNodeData
  | VariableSetNodeData
  | ScheduleNodeData
  | HTTPRequestNodeData
  | WebSearchNodeData
  | CodeExecutionNodeData
  | WebAPINodeData
  | TimestampNodeData;

// Type guard functions
export function isInputNode(data: NodeData): data is InputNodeData {
  return data.type === 'input';
}

export function isOutputNode(data: NodeData): data is OutputNodeData {
  return data.type === 'output';
}

export function isLLMNode(data: NodeData): data is LLMNodeData {
  return data.type === 'llm';
}

export function isIfNode(data: NodeData): data is IfNodeData {
  return data.type === 'if';
}

export function isWhileNode(data: NodeData): data is WhileNodeData {
  return data.type === 'while';
}

export function isTextNode(data: NodeData): data is TextNodeData {
  return data.type === 'text';
}

export function isTextCombinerNode(data: NodeData): data is TextCombinerNodeData {
  return data.type === 'text_combiner';
}

export function isVariableSetNode(data: NodeData): data is VariableSetNodeData {
  return data.type === 'variable_set';
}

export function isScheduleNode(data: NodeData): data is ScheduleNodeData {
  return data.type === 'schedule';
}

export function isHTTPRequestNode(data: NodeData): data is HTTPRequestNodeData {
  return data.type === 'http_request';
}

export function isWebSearchNode(data: NodeData): data is WebSearchNodeData {
  return data.type === 'web_search';
}

export function isCodeExecutionNode(data: NodeData): data is CodeExecutionNodeData {
  return data.type === 'code_execution';
}

export function isWebAPINode(data: NodeData): data is WebAPINodeData {
  return data.type === 'web_api';
}

export function isTimestampNode(data: NodeData): data is TimestampNodeData {
  return data.type === 'timestamp';
}

// Helper function to get node data with proper type
export function getTypedNodeData<T extends NodeData>(node: { data: unknown }): T | null {
  if (!node.data || typeof node.data !== 'object') {
    return null;
  }
  
  const data = node.data as NodeData;
  if (!('type' in data)) {
    return null;
  }
  
  return data as T;
}