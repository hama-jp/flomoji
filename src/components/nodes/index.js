/**
 * ノード定義の統合インデックス
 * 新しいノードを追加する際は、ここにimportとexportを追加してください
 */

// ノード定義をインポート
import InputNode from './InputNode.js';
import OutputNode from './OutputNode.js';
import LLMNode from './LLMNode.js';
import TextCombinerNode from './TextCombinerNode.js';
import IfNode from './IfNode.js';
import WhileNode from './WhileNode.js';
import VariableSetNode from './VariableSetNode.js';
import ScheduleNode from './ScheduleNode.js';
import TimestampNode from './TimestampNode.js';
import HTTPRequestNode from './HTTPRequestNode.js';
import WebSearchNode from './WebSearchNode.js';
import CodeExecutionNode from './CodeExecutionNode.js';
import WebAPINode from './WebAPINode.js';

/**
 * 全てのノードタイプの定義を統合
 * キー名はNodeEditor等で使用されるノードタイプ名と一致させること
 */
export const nodeTypes = {
  input: InputNode,
  output: OutputNode, 
  llm: LLMNode,
  text_combiner: TextCombinerNode,
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
export const nodesByCategory = {
  'input-output': {
    name: 'Input/Output',
    nodes: {
      input: InputNode,
      output: OutputNode,
      timestamp: TimestampNode
    }
  },
  'ai': {
    name: 'AI Generation',
    nodes: {
      llm: LLMNode
    }
  },
  'text-processing': {
    name: 'Text Processing', 
    nodes: {
      text_combiner: TextCombinerNode,
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
  'variables': {
    name: 'Variables',
    nodes: {
      variable_set: VariableSetNode
    }
  },
  'web-integration': {
    name: 'Web Integration',
    nodes: {
      http_request: HTTPRequestNode,
      web_search: WebSearchNode,
      web_api: WebAPINode
    }
  }
};;

/**
 * ノードタイプの配列（表示順序を制御可能）
 */
export const nodeTypesList = [
  'input',
  'output', 
  'timestamp',
  'llm',
  'text_combiner',
  'if',
  'while',
  'variable_set',
  'schedule',
  'http_request',
  'web_search',
  'web_api'
];

export default nodeTypes;