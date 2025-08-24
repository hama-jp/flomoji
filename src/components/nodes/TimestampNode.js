import { createNodeDefinition } from './types.js';

/**
 * タイムスタンプノードの実行処理
 * @param {Object} node - ノードオブジェクト
 * @param {Object} inputs - 入力データ（通常は空）
 * @param {Object} context - 実行コンテキスト
 * @returns {Promise<string>} 現在時刻の文字列
 */
async function executeTimestampNode(node, inputs, context) {
  const { timezone, format } = node.data;
  
  context.addLog('info', 'タイムスタンプノードを実行中', node.id, { 
    timezone, 
    format 
  });

  // 現在時刻を取得
  const now = new Date();
  let formattedTime;

  try {
    // タイムゾーンを適用してフォーマット
    const options = {
      timeZone: timezone || 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };

    switch (format) {
      case 'iso':
        // ISO 8601形式
        formattedTime = now.toISOString();
        break;
      case 'locale':
        // ローカル形式（日本語）
        formattedTime = now.toLocaleString('ja-JP', options);
        break;
      case 'unix':
        // Unix timestamp (秒)
        formattedTime = Math.floor(now.getTime() / 1000).toString();
        break;
      case 'unixms':
        // Unix timestamp (ミリ秒)
        formattedTime = now.getTime().toString();
        break;
      case 'date-only':
        // 日付のみ
        formattedTime = now.toLocaleDateString('ja-JP', {
          timeZone: timezone || 'Asia/Tokyo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        break;
      case 'time-only':
        // 時刻のみ
        formattedTime = now.toLocaleTimeString('ja-JP', {
          timeZone: timezone || 'Asia/Tokyo',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        break;
      default:
        // デフォルト: YYYY-MM-DD HH:mm:ss
        formattedTime = now.toLocaleString('ja-JP', options);
    }

    context.addLog('success', `現在時刻を取得: ${formattedTime}`, node.id, {
      timezone: timezone || 'Asia/Tokyo',
      format,
      timestamp: formattedTime
    });

    // 変数に現在時刻を保存
    context.variables[node.id] = formattedTime;
    
    return formattedTime;
    
  } catch (error) {
    const errorMsg = `タイムゾーン設定エラー: ${error.message}`;
    context.addLog('error', errorMsg, node.id, { timezone, error: error.message });
    
    // エラー時はデフォルトのローカル時刻を返す
    const fallbackTime = now.toLocaleString('ja-JP');
    context.variables[node.id] = fallbackTime;
    return fallbackTime;
  }
}

/**
 * タイムスタンプノードの定義
 * 現在時刻を指定したタイムゾーンとフォーマットで出力
 */
export const TimestampNode = createNodeDefinition(
  'Timestamp',
  '🕒',
  'cyan',
  [], // 入力ポートなし（現在時刻生成のため）
  ['output'], // 出力ポート: output
  {
    timezone: 'Asia/Tokyo',
    format: 'locale', // 'iso', 'locale', 'unix', 'unixms', 'date-only', 'time-only'
    label: 'Current Time'
  },
  executeTimestampNode, // 実行メソッド
  {
    description: 'Outputs the current timestamp in specified timezone and format. No input connections required.',
    category: 'input-output'
  }
);

export default TimestampNode;