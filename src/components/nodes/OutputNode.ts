import { createNodeDefinitionNew } from './types';
import type { WorkflowNode, NodeInputs, INodeExecutionContext, NodeOutput } from '../../types';

/**
 * 出力ノードの実行処理
 * @param node - ノードオブジェクト
 * @param inputs - 入力データ
 * @param context - 実行コンテキスト
 * @returns フォーマットされた出力値
 */
async function executeOutputNode(
  node: WorkflowNode,
  inputs: NodeInputs,
  context?: INodeExecutionContext
): Promise<NodeOutput> {
  const format = node.data.format || 'text';
  // Get the first available input value, or fallback to empty string
  const inputValue = Object.values(inputs)[0] || '';
  
  switch (format) {
    case 'json':
      try {
        return JSON.stringify({ output: inputValue }, null, 2);
      } catch {
        return inputValue;
      }
    default:
      return inputValue;
  }
}

/**
 * 出力ノードの定義
 * ワークフローの結果を表示する
 */
export const OutputNode = createNodeDefinitionNew(
  'output',
  'Output',
  '📤',
  'green',
  ['input'], // 入力ポート: input
  [], // 出力ポートなし
  {
    format: 'text',
    title: 'Result',
    result: ''
  },
  executeOutputNode,
  {
    description: 'Display workflow results. Supports text or structured data output.',
    category: 'input-output'
  }
);

export default OutputNode;