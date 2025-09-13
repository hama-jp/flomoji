/**
 * Node-specific data type definitions
 * 各ノードタイプ固有のデータ構造を定義
 */

// HTTPRequestNode用の型定義
export interface HTTPRequestNodeData {
  method?: string;
  url?: string;
  headers?: Record<string, string> | string;
  body?: any;
  timeout?: number;
  useTemplate?: boolean;
  template?: string;
  contentType?: string;
}

// WebSearchNode用の型定義
export interface WebSearchNodeData {
  provider?: string;
  apiKey?: string;
  query?: string;
  maxResults?: number;
  safeSearch?: boolean;
  language?: string;
  cacheEnabled?: boolean;
}

// WebAPINode用の型定義
export interface WebAPINodeData {
  url?: string;
  method?: string;
  headers?: Record<string, string> | string;
  queryParams?: Record<string, any>;
  pathParams?: Record<string, any>;
  body?: any;
  authentication?: {
    type?: string;
    token?: string;
    apiKey?: string;
    headerName?: string;
    paramName?: string;
    username?: string;
    password?: string;
  };
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  bodyType?: string;
  responseType?: string;
}

// LLMNode用の型定義
export interface LLMNodeData {
  temperature?: number;
  model?: string;
  provider?: string;
  systemPrompt?: string | null;
  maxTokens?: number | null;
}

// TimestampNode用の型定義
export interface TimestampNodeData {
  timezone?: string;
  format?: 'iso' | 'locale' | 'unix' | 'unixms' | 'date-only' | 'time-only';
  label?: string;
}

// UpperCaseNode用の型定義
export interface UpperCaseNodeData {
  addPrefix?: boolean;
  prefix?: string;
  trimSpaces?: boolean;
  defaultText?: string;
}

// InputNode用の型定義
export interface InputNodeData {
  value?: string;
  inputType?: 'text' | 'file';
  fileContent?: string;
}

// OutputNode用の型定義
export interface OutputNodeData {
  format?: 'text' | 'json';
  title?: string;
  result?: string;
}

// IfNode用の型定義
export interface IfNodeData {
  condition?: string;
  operator?: string;
  compareValue?: any;
}

// ScheduleNode用の型定義
export interface ScheduleNodeData {
  cronExpression?: string;
  scheduleName?: string;
  enabled?: boolean;
}

// TextCombinerNode用の型定義
export interface TextCombinerNodeData {
  separator?: string;
}

// VariableSetNode用の型定義
export interface VariableSetNodeData {
  variableName?: string;
  value?: string;
  useInput?: boolean;
}

// CodeExecutionNode用の型定義
export interface CodeExecutionNodeData {
  code?: string;
  timeout?: number;
  enableConsoleLog?: boolean;
}

// WhileNode用の型定義
export interface WhileNodeData {
  condition?: string;
  maxIterations?: number;
}

// 全ノードデータ型のユニオン型
export type NodeData = 
  | HTTPRequestNodeData
  | WebSearchNodeData
  | WebAPINodeData
  | LLMNodeData
  | TimestampNodeData
  | UpperCaseNodeData
  | InputNodeData
  | OutputNodeData
  | IfNodeData
  | ScheduleNodeData
  | TextCombinerNodeData
  | VariableSetNodeData
  | CodeExecutionNodeData
  | WhileNodeData
  | Record<string, any>; // 未定義のノードタイプ用のフォールバック