/**
 * Cronトリガー機能を提供するスケジューラーサービス
 * 
 * ワークフローの定期実行を管理し、cronerライブラリを使用してcron式による
 * スケジュール設定をサポートします。
 */

import { Cron } from 'croner';
import StorageService from './storageService.js';

class SchedulerService {
  constructor() {
    this.activeJobs = new Map(); // jobId -> Cron instance
    this.scheduledWorkflows = new Map(); // workflowId -> schedule config
    this.workflowExecutionCallback = null; // ワークフロー実行のコールバック関数
    this.activeExecutions = new Map(); // workflowId -> execution info
    this.loadSchedulesFromStorage();
  }

  /**
   * ストレージからスケジュール設定を読み込み
   */
  loadSchedulesFromStorage() {
    try {
      const schedules = StorageService.get('scheduler-workflows', {});
      this.scheduledWorkflows = new Map(Object.entries(schedules));
      
      // アクティブなジョブを復元
      this.scheduledWorkflows.forEach((config, workflowId) => {
        if (config.enabled) {
          this.startSchedule(workflowId, config);
        }
      });
    } catch (error) {
      // テスト環境やlocalStorageが利用できない場合の対応
      console.warn('SchedulerService: ストレージからの読み込みに失敗:', error.message);
      this.scheduledWorkflows = new Map();
    }
  }

  /**
   * スケジュール設定をストレージに保存
   */
  saveSchedulesToStorage() {
    try {
      const schedules = Object.fromEntries(this.scheduledWorkflows);
      StorageService.set('scheduler-workflows', schedules);
    } catch (error) {
      // テスト環境やlocalStorageが利用できない場合の対応
      console.warn('SchedulerService: ストレージへの保存に失敗:', error.message);
    }
  }

  /**
   * ワークフローのスケジュールを設定
   * @param {string} workflowId - ワークフローID
   * @param {Object} scheduleConfig - スケジュール設定
   * @param {string} scheduleConfig.cronExpression - cron式
   * @param {string} scheduleConfig.name - スケジュール名
   * @param {boolean} scheduleConfig.enabled - 有効/無効
   * @param {Function} scheduleConfig.onExecute - 実行時のコールバック
   * @returns {boolean} 設定成功の可否
   */
  setSchedule(workflowId, scheduleConfig) {
    try {
      // cron式の検証
      if (!this.validateCronExpression(scheduleConfig.cronExpression)) {
        throw new Error('無効なcron式です');
      }

      const config = {
        ...scheduleConfig,
        workflowId,
        createdAt: new Date().toISOString(),
        lastExecuted: null,
        executionCount: 0
      };

      this.scheduledWorkflows.set(workflowId, config);
      this.saveSchedulesToStorage();

      // 有効な場合はすぐにスケジュール開始
      if (config.enabled) {
        this.startSchedule(workflowId, config);
      }

      return true;
    } catch (error) {
      console.error('SchedulerService: スケジュール設定に失敗:', error);
      return false;
    }
  }

  /**
   * ワークフローのスケジュールを開始
   * @param {string} workflowId - ワークフローID
   * @param {Object} config - スケジュール設定
   */
  startSchedule(workflowId, config) {
    try {
      // 既存のジョブがあれば停止
      this.stopSchedule(workflowId);

      const job = new Cron(config.cronExpression, {
        name: `workflow-${workflowId}`,
        timezone: 'Asia/Tokyo'
      }, async () => {
        await this.executeScheduledWorkflow(workflowId);
      });

      this.activeJobs.set(workflowId, job);
      console.log(`SchedulerService: スケジュール開始 - ${config.name} (${config.cronExpression})`);
    } catch (error) {
      console.error('SchedulerService: スケジュール開始に失敗:', error);
    }
  }

  /**
   * ワークフローのスケジュールを停止
   * @param {string} workflowId - ワークフローID
   */
  stopSchedule(workflowId) {
    const job = this.activeJobs.get(workflowId);
    if (job) {
      job.stop();
      this.activeJobs.delete(workflowId);
      console.log(`SchedulerService: スケジュール停止 - ${workflowId}`);
    }
  }

  /**
   * ワークフロー実行コールバックを設定
   * @param {Function} callback - ワークフロー実行関数
   */
  setWorkflowExecutionCallback(callback) {
    this.workflowExecutionCallback = callback;
    console.log('SchedulerService: ワークフロー実行コールバック設定完了');
  }

  /**
   * スケジュールされたワークフローを実行
   * @param {string} workflowId - ワークフローID
   */
  async executeScheduledWorkflow(workflowId) {
    try {
      const config = this.scheduledWorkflows.get(workflowId);
      if (!config) {
        console.error('SchedulerService: スケジュール設定が見つかりません:', workflowId);
        return;
      }

      // 既に実行中の場合はスキップ
      if (this.activeExecutions.has(workflowId)) {
        console.warn(`SchedulerService: ワークフロー ${config.name} は既に実行中です。スキップします。`);
        return;
      }

      console.log(`SchedulerService: スケジュール実行開始 - ${config.name}`);

      // 実行情報を記録
      const executionInfo = {
        startTime: new Date(),
        workflowId,
        scheduleName: config.name,
        timeoutMinutes: config.timeoutMinutes || 30
      };
      this.activeExecutions.set(workflowId, executionInfo);

      // 実行回数と最終実行時刻を更新
      config.executionCount += 1;
      config.lastExecuted = new Date().toISOString();
      this.scheduledWorkflows.set(workflowId, config);
      this.saveSchedulesToStorage();

      // タイムアウトタイマーを設定
      const timeoutMs = (config.timeoutMinutes || 30) * 60 * 1000;
      const timeoutId = setTimeout(() => {
        this.handleExecutionTimeout(workflowId);
      }, timeoutMs);
      executionInfo.timeoutId = timeoutId;

      // ワークフロー実行コールバックを呼び出し
      if (this.workflowExecutionCallback) {
        await this.workflowExecutionCallback(workflowId, config);
        console.log(`SchedulerService: スケジュール実行完了 - ${config.name}`);
      } else {
        console.warn('SchedulerService: ワークフロー実行コールバックが設定されていません');
      }

      // 実行完了後のクリーンアップ
      this.cleanupExecution(workflowId);

    } catch (executeError) {
      console.error('SchedulerService: スケジュール実行に失敗:', executeError);
      
      // エラー時もクリーンアップ
      this.cleanupExecution(workflowId);
      
      // 実行ログにエラーを記録
      const config = this.scheduledWorkflows.get(workflowId);
      if (config) {
        config.lastError = {
          message: executeError.message,
          timestamp: new Date().toISOString()
        };
        this.scheduledWorkflows.set(workflowId, config);
        this.saveSchedulesToStorage();
      }
    }
  }

  /**
   * 実行タイムアウトを処理
   * @param {string} workflowId - ワークフローID
   */
  handleExecutionTimeout(workflowId) {
    const executionInfo = this.activeExecutions.get(workflowId);
    if (!executionInfo) return;

    console.warn(`SchedulerService: ワークフロー ${executionInfo.scheduleName} がタイムアウトしました (${executionInfo.timeoutMinutes}分)`);
    
    // タイムアウト時はワークフロー実行停止コールバックを呼び出し
    if (this.workflowStopCallback) {
      this.workflowStopCallback(workflowId, 'timeout');
    }

    // 実行情報をクリーンアップ
    this.cleanupExecution(workflowId);

    // エラー情報を記録
    const config = this.scheduledWorkflows.get(workflowId);
    if (config) {
      config.lastError = {
        message: `Execution timeout after ${executionInfo.timeoutMinutes} minutes`,
        timestamp: new Date().toISOString()
      };
      this.scheduledWorkflows.set(workflowId, config);
      this.saveSchedulesToStorage();
    }
  }

  /**
   * 実行のクリーンアップ
   * @param {string} workflowId - ワークフローID
   */
  cleanupExecution(workflowId) {
    const executionInfo = this.activeExecutions.get(workflowId);
    if (executionInfo && executionInfo.timeoutId) {
      clearTimeout(executionInfo.timeoutId);
    }
    this.activeExecutions.delete(workflowId);
  }

  /**
   * ワークフロー停止コールバックを設定
   * @param {Function} callback - ワークフロー停止関数
   */
  setWorkflowStopCallback(callback) {
    this.workflowStopCallback = callback;
    console.log('SchedulerService: ワークフロー停止コールバック設定完了');
  }

  /**
   * スケジュールを削除
   * @param {string} workflowId - ワークフローID
   * @returns {boolean} 削除成功の可否
   */
  removeSchedule(workflowId) {
    try {
      this.stopSchedule(workflowId);
      this.scheduledWorkflows.delete(workflowId);
      this.saveSchedulesToStorage();
      return true;
    } catch (error) {
      console.error('SchedulerService: スケジュール削除に失敗:', error);
      return false;
    }
  }

  /**
   * スケジュールを有効/無効にする
   * @param {string} workflowId - ワークフローID
   * @param {boolean} enabled - 有効/無効
   * @returns {boolean} 設定成功の可否
   */
  toggleSchedule(workflowId, enabled) {
    try {
      const config = this.scheduledWorkflows.get(workflowId);
      if (!config) {
        return false;
      }

      config.enabled = enabled;
      this.scheduledWorkflows.set(workflowId, config);
      this.saveSchedulesToStorage();

      if (enabled) {
        this.startSchedule(workflowId, config);
      } else {
        this.stopSchedule(workflowId);
      }

      return true;
    } catch (error) {
      console.error('SchedulerService: スケジュール切り替えに失敗:', error);
      return false;
    }
  }

  /**
   * 全てのスケジュール設定を取得
   * @returns {Array} スケジュール設定の配列
   */
  getAllSchedules() {
    return Array.from(this.scheduledWorkflows.entries()).map(([workflowId, config]) => ({
      workflowId,
      ...config,
      isActive: this.activeJobs.has(workflowId)
    }));
  }

  /**
   * 特定のワークフローのスケジュール設定を取得
   * @param {string} workflowId - ワークフローID
   * @returns {Object|null} スケジュール設定
   */
  getSchedule(workflowId) {
    const config = this.scheduledWorkflows.get(workflowId);
    if (!config) {
      return null;
    }

    return {
      workflowId,
      ...config,
      isActive: this.activeJobs.has(workflowId)
    };
  }

  /**
   * 次回実行時刻を取得
   * @param {string} workflowId - ワークフローID
   * @returns {Date|null} 次回実行時刻
   */
  getNextExecution(workflowId) {
    const job = this.activeJobs.get(workflowId);
    if (!job) {
      return null;
    }

    try {
      return job.nextRun();
    } catch (error) {
      console.error('SchedulerService: 次回実行時刻の取得に失敗:', error);
      return null;
    }
  }

  /**
   * cron式の検証
   * @param {string} cronExpression - cron式
   * @returns {boolean} 有効性
   */
  validateCronExpression(cronExpression) {
    try {
      // cronerライブラリでcron式を検証
      const testJob = new Cron(cronExpression, { paused: true });
      testJob.stop();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * よく使われるcron式のプリセット
   */
  static get PRESETS() {
    return {
      '毎分': '* * * * *',
      '毎時間': '0 * * * *',
      '毎日 9:00': '0 9 * * *',
      '毎週月曜日 9:00': '0 9 * * 1',
      '毎月1日 9:00': '0 9 1 * *',
      '平日 9:00': '0 9 * * 1-5',
      '週末 10:00': '0 10 * * 0,6'
    };
  }

  /**
   * cron式を人間が読める形式に変換
   * @param {string} cronExpression - cron式
   * @returns {string} 人間が読める形式
   */
  static humanReadableCron(cronExpression) {
    const presets = this.PRESETS;
    const preset = Object.entries(presets).find(([, expr]) => expr === cronExpression);
    
    if (preset) {
      return preset[0];
    }

    // 簡単なcron式の解釈（基本的なケースのみ）
    const parts = cronExpression.split(' ');
    if (parts.length !== 5) {
      return cronExpression; // 標準的でない形式はそのまま返す
    }

    const [minute, hour, day, month, dayOfWeek] = parts;
    
    if (minute === '*' && hour === '*' && day === '*' && month === '*' && dayOfWeek === '*') {
      return '毎分';
    }
    
    if (minute !== '*' && hour === '*' && day === '*' && month === '*' && dayOfWeek === '*') {
      return `毎時間 ${minute}分`;
    }
    
    if (minute !== '*' && hour !== '*' && day === '*' && month === '*' && dayOfWeek === '*') {
      return `毎日 ${hour}:${minute.padStart(2, '0')}`;
    }

    return cronExpression; // 複雑なパターンはcron式をそのまま表示
  }

  /**
   * 全てのスケジュールを停止
   */
  stopAllSchedules() {
    this.activeJobs.forEach((job, workflowId) => {
      job.stop();
      console.log(`SchedulerService: スケジュール停止 - ${workflowId}`);
    });
    this.activeJobs.clear();
  }

  /**
   * 実行中のワークフロー一覧を取得
   * @returns {Array} 実行中のワークフロー情報
   */
  getActiveExecutions() {
    return Array.from(this.activeExecutions.entries()).map(([workflowId, info]) => ({
      workflowId,
      ...info,
      runningTime: new Date().getTime() - info.startTime.getTime()
    }));
  }

  /**
   * 特定のワークフローの実行を強制停止
   * @param {string} workflowId - ワークフローID
   * @returns {boolean} 停止成功の可否
   */
  forceStopExecution(workflowId) {
    if (!this.activeExecutions.has(workflowId)) {
      return false;
    }

    console.log(`SchedulerService: ワークフロー実行を強制停止 - ${workflowId}`);
    
    if (this.workflowStopCallback) {
      this.workflowStopCallback(workflowId, 'manual');
    }

    this.cleanupExecution(workflowId);
    return true;
  }

  /**
   * サービス終了時のクリーンアップ
   */
  destroy() {
    // 全てのスケジュールを停止
    this.stopAllSchedules();
    
    // 実行中のワークフローを停止
    const activeWorkflows = Array.from(this.activeExecutions.keys());
    activeWorkflows.forEach(workflowId => {
      this.forceStopExecution(workflowId);
    });
    
    // データをクリア
    this.scheduledWorkflows.clear();
    this.activeExecutions.clear();
    this.workflowExecutionCallback = null;
    this.workflowStopCallback = null;
    
    console.log('SchedulerService: クリーンアップ完了');
  }
}

// シングルトンインスタンス
const schedulerService = new SchedulerService();

export default schedulerService;