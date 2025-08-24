import { createNodeDefinition } from './types.js';
import schedulerService from '../../services/schedulerService.js';

/**
 * スケジュールノードの実行処理
 * このノードは手動実行時には情報表示のみを行い、
 * 実際のトリガー機能はschedulerServiceで管理される
 * @param {Object} node - ノードオブジェクト
 * @param {Object} inputs - 入力データ（通常は空）
 * @param {Object} context - 実行コンテキスト
 * @returns {Promise<string>} スケジュール情報
 */
async function executeScheduleNode(node, inputs, context) {
  const { cronExpression, scheduleName, enabled } = node.data;
  
  context.addLog('info', 'スケジュールトリガーノード情報を確認中', node.id, { 
    cronExpression, 
    scheduleName, 
    enabled 
  });

  // このノードは情報表示用（実際のトリガーは別途管理）
  const currentTime = new Date().toISOString();
  const nextExecution = enabled ? schedulerService.getNextExecution(node.id) : null;
  
  const scheduleInfo = {
    triggerType: 'Schedule Trigger Node',
    currentTime,
    cronExpression,
    scheduleName,
    enabled,
    nextExecution: nextExecution?.toISOString() || null,
    note: 'This node triggers the entire workflow at scheduled times'
  };

  // 変数にスケジュール情報を保存
  context.variables[node.id] = scheduleInfo;
  
  context.addLog('success', `スケジュールトリガー: ${enabled ? '有効' : '無効'} - ${scheduleName}`, node.id, scheduleInfo);
  
  return JSON.stringify(scheduleInfo, null, 2);
}

/**
 * スケジュールノードの定義
 * Pure Trigger Node - ワークフロー全体をcronスケジュールで自動実行する
 */
export const ScheduleNode = createNodeDefinition(
  'Schedule',
  '⏰',
  'purple',
  [], // 入力ポートなし（トリガーノードのため）
  [], // 出力ポートなし（Pure Trigger Node）
  {
    cronExpression: '0 9 * * *', // デフォルト: 毎日9時
    scheduleName: 'Daily Schedule',
    enabled: false,
    timezone: 'Asia/Tokyo',
    timeoutMinutes: 30 // デフォルト30分でタイムアウト
  },
  executeScheduleNode, // 実行メソッド
  {
    description: 'Pure trigger node: Automatically executes the entire workflow at scheduled cron times. No connections required.',
    category: 'control-flow'
  }
);

export default ScheduleNode;