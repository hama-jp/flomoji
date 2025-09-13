import { createNodeDefinition } from './types';

/**
 * While繰り返しノードの実行処理 (プレースホルダー)
 * 実際の処理は nodeExecutionService.js で実装されています
 * @returns {Promise<string>} 処理結果
 */
async function executeWhileNode() {
  // 注意：While ループは複雑な制御フローのため、
  // nodeExecutionService.js の executeWhileNode を使用します
  // この実行メソッドは placeholder として存在します
  throw new Error('While ノードは現在、従来の実行システムを使用します');
}

/**
 * While繰り返しノードの定義
 * 条件が満たされる間、処理を繰り返す
 */
export const WhileNode = createNodeDefinition(
  'While Loop',
  '🔄',
  'purple',
  ['input', 'loop'], // 入力ポート: input, loop
  ['output', 'loop'], // 出力ポート: output, loop
  {
    conditionType: 'variable',
    condition: '',
    variable: 'counter',
    operator: '<',
    value: '10',
    maxIterations: 100
  },
  executeWhileNode, // 実行メソッド（placeholder）
  {
    description: 'Repeat processing while the condition is met. Supports variable condition control and loop count limit.',
    category: 'control-flow'
  }
);

export default WhileNode;