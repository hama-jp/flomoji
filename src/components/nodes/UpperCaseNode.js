/**
 * UpperCaseNode - 文字列を大文字に変換するサンプルノード
 * テンプレートを使用した実装例
 */

import { createNodeDefinition } from './types.js';

/**
 * 文字列を大文字に変換する
 * @param {Object} data - ノードの設定データ
 * @param {Object} inputs - 入力ポートから受け取ったデータ
 * @returns {Object} 変換結果
 */
export async function executeUpperCaseNode(data, inputs) {
  const {
    addPrefix = false,
    prefix = 'UPPERCASE: ',
    trimSpaces = false
  } = data;

  // 入力データの取得
  const inputText = inputs.input || data.defaultText || '';
  
  if (!inputText) {
    return {
      output: '',
      error: '入力テキストがありません'
    };
  }

  try {
    // 大文字変換処理
    let result = inputText.toUpperCase();
    
    // 空白削除オプション
    if (trimSpaces) {
      result = result.trim();
    }
    
    // プレフィックス追加オプション
    if (addPrefix) {
      result = prefix + result;
    }

    // 処理統計
    const metadata = {
      originalLength: inputText.length,
      resultLength: result.length,
      hasNumbers: /\d/.test(inputText),
      hasSpecialChars: /[^a-zA-Z0-9\s]/.test(inputText)
    };

    return {
      output: result,
      metadata: metadata,
      error: null
    };
    
  } catch (error) {
    console.error('UpperCase Node Error:', error);
    
    return {
      output: null,
      metadata: null,
      error: error.message
    };
  }
}

// ノード定義
export const UpperCaseNode = createNodeDefinition(
  'Upper Case',              // ノードの表示名
  '🔠',                      // ノードのアイコン
  'amber',                   // ノードの色
  ['input'],                 // 入力ポート
  ['output', 'metadata', 'error'], // 出力ポート
  {
    defaultText: '',
    addPrefix: false,
    prefix: 'UPPERCASE: ',
    trimSpaces: false
  },
  executeUpperCaseNode,      // 実行関数
  {
    description: 'Convert text to uppercase with optional formatting',
    category: 'text-processing'
  }
);

export default UpperCaseNode;