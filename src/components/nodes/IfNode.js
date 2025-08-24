import { createNodeDefinition } from './types.js';

/**
 * If条件分岐ノードの実行処理
 * 
 * 注意: このメソッドは新しいノードシステム用のプレースホルダーです。
 * 実際の実行は nodeExecutionService.js の executeIfNode メソッドで行われます。
 * 
 * 実際の動作:
 * - 条件がtrueの場合: trueポートに入力値を出力、falseポートはnull
 * - 条件がfalseの場合: falseポートに入力値を出力、trueポートはnull
 * 
 * @param {Object} node - ノードオブジェクト
 * @param {Object} inputs - 入力データ
 * @returns {Promise<Object>} 条件分岐結果 { true: value|null, false: value|null }
 */
async function executeIfNode(node, inputs) {
  // 注意：If条件分岐は複雑な制御フローのため、
  // nodeExecutionService.js の executeIfNode を使用します
  // この実行メソッドは placeholder として存在します
  
  // プレースホルダーとして基本的な値を返す
  // 実際の実行は nodeExecutionService で行われる
  return inputs.input || '';
}

/**
 * If条件分岐ノードの定義
 * 条件に基づいてワークフローを分岐させる
 * 
 * 動作説明:
 * - 条件がtrueの場合: 入力値をtrueポートに出力
 * - 条件がfalseの場合: 入力値をfalseポートに出力
 * - 使われないポートにはnullが出力される
 */
export const IfNode = createNodeDefinition(
  'If Condition',
  '🔀',
  'pink',
  ['input'], // 入力ポート: input
  ['true', 'false'], // 出力ポート: true (条件満たす場合), false (条件満たさない場合)
  {
    conditionType: 'llm',
    condition: 'Please determine if the input has positive content',
    variable: '',
    operator: '==',
    value: '',
    model: 'gpt-5-nano',
    temperature: 0.7
  },
  executeIfNode, // 実行メソッド（プレースホルダー）
  {
    description: 'Branch the workflow based on conditions. When the condition is true, input flows to the true port; when false, flows to the false port. Supports LLM evaluation or variable comparison conditions.',
    category: 'control-flow'
  }
);

export default IfNode;