import { createNodeDefinition } from './types';
import type { WorkflowNode, NodeInputs, INodeExecutionContext, NodeOutput } from '../../types';

/**
 * テキスト結合ノードの実行処理
 * @param {Object} node - ノードオブジェクト
 * @param {Object} inputs - 入力データ
 * @param {Object} context - 実行コンテキスト
 * @returns {Promise<string>} 結合されたテキスト
 */
async function executeTextCombinerNode(node: WorkflowNode, inputs: NodeInputs, context?: INodeExecutionContext): Promise<NodeOutput> {
  // デバッグ用の詳細ログ
  context?.addLog('debug', '🔗 Text Combiner 実行開始', node.id, { 
    receivedInputs: inputs,
    inputKeys: Object.keys(inputs),
    inputValues: Object.values(inputs)
  });

  const orderedInputNames = ['input1', 'input2', 'input3', 'input4'];
  let combinedText = '';

  // 順番に文字列を結合
  for (const inputName of orderedInputNames) {
    const inputValue = inputs[inputName];
    context?.addLog('debug', `処理中: ${inputName}`, node.id, { 
      inputValue, 
      isDefined: inputValue !== undefined,
      isNull: inputValue === null,
      type: typeof inputValue
    });
    
    if (inputValue !== undefined && inputValue !== null) {
      const stringValue = String(inputValue);
      combinedText += stringValue;
      context?.addLog('debug', `追加: "${stringValue}" → 現在の結果: "${combinedText}"`, node.id);
    }
  }

  context?.addLog('info', `Text combined`, node.id, { 
    result: combinedText,
    finalLength: combinedText.length,
    processedInputs: Object.keys(inputs).length
  });
  return combinedText;
}

/**
 * テキスト結合ノードの定義
 * 複数のテキスト入力を結合する
 */
export const TextCombinerNode = createNodeDefinition(
  'Text Combiner',
  '🔗',
  'teal',
  ['input1', 'input2', 'input3', 'input4'], // 入力ポート: 最大4つ
  ['output'], // 出力ポート: output
  {},
  executeTextCombinerNode, // 実行メソッド
  {
    description: 'Combine up to 4 text inputs into a single text output.',
    category: 'text-processing'
  }
);

export default TextCombinerNode;