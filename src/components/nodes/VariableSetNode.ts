import { createNodeDefinition } from './types';
import type { WorkflowNode, NodeInputs, INodeExecutionContext, NodeOutput } from '../../types';

/**
 * 変数設定ノードの実行処理
 * @param {Object} node - ノードオブジェクト
 * @param {Object} inputs - 入力データ
 * @param {Object} context - 実行コンテキスト
 * @returns {Promise<string>} 設定された変数の値
 */
async function executeVariableSetNode(node: WorkflowNode, inputs: NodeInputs, context?: INodeExecutionContext): Promise<NodeOutput> {
  const variableName = node.data.variableName || '';
  if (!variableName) {
    throw new Error('Variable name is not set');
  }

  let value;
  if (node.data.useInput) {
    // 接続からの入力を使用
    const inputValues = Object.values(inputs).filter(v => v !== undefined && v !== null);
    if (inputValues.length === 0) {
      throw new Error('No input provided to variable set node');
    }
    value = String(inputValues[0]);
  } else {
    // 直接入力された値を使用
    value = node.data.value || '';
  }

  if (context) {
    context.variables[variableName] = value;
  }
  context?.addLog('info', `Set variable '${variableName}' to value: ${value}`, node.id, { variableName, value });
  
  // パススルー: 入力値または設定値をそのまま出力
  return node.data.useInput ? value : value;
}

/**
 * 変数設定ノードの定義
 * ワークフロー内で使用する変数を設定する
 */
export const VariableSetNode = createNodeDefinition(
  'Variable Set',
  '📝',
  'amber',
  ['input'], // 入力ポート: input
  ['output'], // 出力ポート: output
  {
    variableName: '',
    value: '',
    useInput: false
  },
  executeVariableSetNode, // 実行メソッド
  {
    description: 'Set variables for use within the workflow. Can save fixed values or input values as variables.',
    category: 'variables'
  }
);

export default VariableSetNode;