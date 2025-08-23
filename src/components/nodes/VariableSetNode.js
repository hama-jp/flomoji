import { createNodeDefinition } from './types.js';

/**
 * 変数設定ノードの実行処理
 * @param {Object} node - ノードオブジェクト
 * @param {Object} inputs - 入力データ
 * @param {Object} context - 実行コンテキスト
 * @returns {Promise<string>} 設定された変数の値
 */
async function executeVariableSetNode(node, inputs, context) {
  const variableName = node.data.variableName || '';
  if (!variableName) {
    throw new Error('変数名が設定されていません');
  }

  let value;
  if (node.data.useInput) {
    // 接続からの入力を使用
    const inputValues = Object.values(inputs).filter(v => v !== undefined && v !== null);
    if (inputValues.length === 0) {
      throw new Error('変数設定ノードに入力がありません');
    }
    value = String(inputValues[0]);
  } else {
    // 直接入力された値を使用
    value = node.data.value || '';
  }

  context.variables[variableName] = value;
  context.addLog('info', `変数 '${variableName}' に値を設定: ${value}`, node.id, { variableName, value });
  
  // パススルー: 入力値または設定値をそのまま出力
  return node.data.useInput ? value : value;
}

/**
 * 変数設定ノードの定義
 * ワークフロー内で使用する変数を設定する
 */
export const VariableSetNode = createNodeDefinition(
  '変数設定',
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
    description: 'ワークフロー内で使用する変数を設定します。固定値または入力値を変数として保存可能。',
    category: 'variables'
  }
);

export default VariableSetNode;