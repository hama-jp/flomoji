/**
 * ノード定義の統合インデックス
 * 新しいノードを追加する際は、ここにimportとexportを追加してください
 */

import type { ExtendedNodeDefinition } from './types';

// ノード定義をインポート
import ArrayOperationsNode from './ArrayOperationsNode';
import CodeExecutionNode from './CodeExecutionNode';
import DataTransformNode from './DataTransformNode';
import HTTPRequestNode from './HTTPRequestNode';
import IfNode from './IfNode';
import InputNode from './InputNode';
import JSONTransformNode from './JSONTransformNode';
import LLMNode from './LLMNode';
import OutputNode from './OutputNode';
import ScheduleNode from './ScheduleNode';
import StructuredExtractionNode from './StructuredExtractionNode';
import StructuredExtractionValidatorNode from './StructuredExtractionValidatorNode';
import TextCombinerNode from './TextCombinerNode';
import TimestampNode from './TimestampNode';
import VariableSetNode from './VariableSetNode';
import WebAPINode from './WebAPINode';
import WebSearchNode from './WebSearchNode';
import WhileNode from './WhileNode';

/**
 * 全てのノードタイプの定義を統合
 * キー名はNodeEditor等で使用されるノードタイプ名と一致させること
 */
export const nodeTypes: Record<string, ExtendedNodeDefinition> = {
  input: InputNode,
  output: OutputNode,
  llm: LLMNode,
  text_combiner: TextCombinerNode,
  structured_extraction: StructuredExtractionNode,
  schema_validator: StructuredExtractionValidatorNode,
  json_transform: JSONTransformNode,
  array_operations: ArrayOperationsNode,
  data_transform: DataTransformNode,
  if: IfNode,
  while: WhileNode,
  variable_set: VariableSetNode,
  schedule: ScheduleNode,
  timestamp: TimestampNode,
  http_request: HTTPRequestNode,
  web_search: WebSearchNode,
  code_execution: CodeExecutionNode,
  web_api: WebAPINode
};

/**
 * カテゴリー別にノードを整理
 * UIでのノード選択時などに使用可能
 */
export const nodesByCategory: Record<string, { name: string; nodes: Record<string, ExtendedNodeDefinition> }> = {
  'input-output': {
    name: 'Input/Output',
    nodes: {
      input: InputNode,
      output: OutputNode,
      variable_set: VariableSetNode
    }
  },
  'processing': {
    name: 'Processing',
    nodes: {
      llm: LLMNode,
      text_combiner: TextCombinerNode,
      structured_extraction: StructuredExtractionNode,
      schema_validator: StructuredExtractionValidatorNode,
      json_transform: JSONTransformNode,
      array_operations: ArrayOperationsNode,
      data_transform: DataTransformNode,
      code_execution: CodeExecutionNode
    }
  },
  'control-flow': {
    name: 'Control Flow',
    nodes: {
      if: IfNode,
      while: WhileNode,
      schedule: ScheduleNode
    }
  },
  'external': {
    name: 'External',
    nodes: {
      http_request: HTTPRequestNode,
      web_search: WebSearchNode,
      web_api: WebAPINode
    }
  },
  'utility': {
    name: 'Utility',
    nodes: {
      timestamp: TimestampNode
    }
  }
};

/**
 * ノードタイプが存在するかチェック
 */
export function hasNodeType(type: string): boolean {
  return type in nodeTypes;
}

/**
 * ノード定義を取得
 */
export function getNodeDefinition(type: string): ExtendedNodeDefinition | undefined {
  return nodeTypes[type];
}

export default nodeTypes;