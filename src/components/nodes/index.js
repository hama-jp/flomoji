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
  variable_set: VariableSetNode
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
      output: OutputNode
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
      text_combiner: TextCombinerNode
    }
  },
  'control-flow': {
    name: 'Control Flow',
    nodes: {
      if: IfNode,
      while: WhileNode
    }
  },
  'variables': {
    name: 'Variables',
    nodes: {
      variable_set: VariableSetNode
    }
  }
};

/**
 * ノードタイプの配列（表示順序を制御可能）
 */
export const nodeTypesList = [
  'input',
  'output', 
  'llm',
  'text_combiner',
  'if',
  'while',
  'variable_set'
];

export default nodeTypes;