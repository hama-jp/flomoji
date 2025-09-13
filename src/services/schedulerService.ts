/**
 * Cronトリガー機能を提供するスケジューラーサービス
 * 
 * ワークフローの定期実行を管理し、cronerライブラリを使用してcron式による
 * スケジュール設定をサポートします。
 */

import { Cron } from 'croner';

import type { CronPreset, ExecutionInfo, ScheduleConfig } from '../types';

import StorageService from './storageService';

type WorkflowExecutionCallback = (workflowId: string, config: ScheduleConfig) => Promise<void>;
type WorkflowStopCallback = (workflowId: string, reason: 'timeout' | 'manual') => void;

export class SchedulerService {
  private activeJobs: Map<string, Cron>;
  private scheduledWorkflows: Map<string, ScheduleConfig>;
  private workflowExecutionCallback: WorkflowExecutionCallback | null;
  private workflowStopCallback: WorkflowStopCallback | null;
  private activeExecutions: Map<string, ExecutionInfo>;

  constructor() {
    this.activeJobs = new Map();
    this.scheduledWorkflows = new Map();
    this.workflowExecutionCallback = null;
    this.workflowStopCallback = null;
    this.activeExecutions = new Map();
    this.loadSchedulesFromStorage();
  }

  /**
   * ストレージからスケジュール設定を読み込み
   */
  private loadSchedulesFromStorage(): void {
    try {
      const schedules = StorageService.get<Record<string, ScheduleConfig>>('scheduler-workflows', {});
      if (schedules) {
        this.scheduledWorkflows = new Map(Object.entries(schedules));
        
        // アクティブなジョブを復元
        this.scheduledWorkflows.forEach((config, workflowId: any) => {
          if (config.enabled) {
            this.startSchedule(workflowId, config);
          }
        });
      }
    } catch (error: any) {
      // テスト環境やlocalStorageが利用できない場合の対応
      console.warn('SchedulerService: ストレージからの読み込みに失敗:', (error as Error).message);
      this.scheduledWorkflows = new Map();
    }
  }

  /**
   * スケジュール設定をストレージに保存
   */
  private saveSchedulesToStorage(): void {
    try {
      const schedules = Object.fromEntries(this.scheduledWorkflows);
      StorageService.set('scheduler-workflows', schedules);
    } catch (error: any) {
      // テスト環境やlocalStorageが利用できない場合の対応
      console.warn('SchedulerService: ストレージへの保存に失敗:', (error as Error).message);
    }
  }

  /**
   * ワークフローのスケジュールを設定
   */
  setSchedule(workflowId: string, scheduleConfig: Partial<ScheduleConfig>): boolean {
    try {
      // cron式の検証
      if (!scheduleConfig.cronExpression || !this.validateCronExpression(scheduleConfig.cronExpression)) {
        throw new Error('無効なcron式です');
      }

      const config: ScheduleConfig = {
        workflowId,
        cronExpression: scheduleConfig.cronExpression,
        name: scheduleConfig.name || 'Unnamed Schedule',
        enabled: scheduleConfig.enabled ?? false,
        timezone: scheduleConfig.timezone || 'Asia/Tokyo',
        timeoutMinutes: scheduleConfig.timeoutMinutes || 30,
        createdAt: new Date().toISOString(),
        lastExecuted: null,
        executionCount: 0,
        ...scheduleConfig
      };

      this.scheduledWorkflows.set(workflowId, config);
      this.saveSchedulesToStorage();

      // 有効な場合はすぐにスケジュール開始
      if (config.enabled) {
        this.startSchedule(workflowId, config);
      }

      return true;
    } catch (error: any) {
      console.error('SchedulerService: スケジュール設定に失敗:', error);
      return false;
    }
  }

  /**
   * ワークフローのスケジュールを開始
   */
  private startSchedule(workflowId: string, config: ScheduleConfig): void {
    try {
      // 既存のジョブがあれば停止
      this.stopSchedule(workflowId);

      const job = new Cron(config.cronExpression, {
        name: `workflow-${workflowId}`,
        timezone: config.timezone || 'Asia/Tokyo'
      }, async () => {
        await this.executeScheduledWorkflow(workflowId);
      });

      this.activeJobs.set(workflowId, job);
      console.log(`SchedulerService: スケジュール開始 - ${config.name} (${config.cronExpression})`);
    } catch (error: any) {
      console.error('SchedulerService: スケジュール開始に失敗:', error);
    }
  }

  /**
   * ワークフローのスケジュールを停止
   */
  stopSchedule(workflowId: string): void {
    const job = this.activeJobs.get(workflowId);
    if (job) {
      job.stop();
      this.activeJobs.delete(workflowId);
      console.log(`SchedulerService: スケジュール停止 - ${workflowId}`);
    }
  }

  /**
   * ワークフロー実行コールバックを設定
   */
  setWorkflowExecutionCallback(callback: WorkflowExecutionCallback): void {
    this.workflowExecutionCallback = callback;
    console.log('SchedulerService: ワークフロー実行コールバック設定完了');
  }

  /**
   * スケジュールされたワークフローを実行
   */
  private async executeScheduledWorkflow(workflowId: string): Promise<void> {
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
      const executionInfo: ExecutionInfo = {
        startedAt: new Date(),
        workflowId,
        scheduleConfig: config,
      };
      this.activeExecutions.set(workflowId, executionInfo);

      // 実行回数と最終実行時刻を更新
      config.executionCount = (config.executionCount || 0) + 1;
      config.lastExecuted = new Date().toISOString();
      this.scheduledWorkflows.set(workflowId, config);
      this.saveSchedulesToStorage();

      // タイムアウトタイマーを設定
      const timeoutMs = (config.timeoutMinutes || 30) * 60 * 1000;
      const timeoutId = setTimeout(() => {
        this.handleExecutionTimeout(workflowId);
      }, timeoutMs);
      executionInfo.timeoutHandle = timeoutId;

      // ワークフロー実行コールバックを呼び出し
      if (this.workflowExecutionCallback) {
        await this.workflowExecutionCallback(workflowId, config);
        console.log(`SchedulerService: スケジュール実行完了 - ${config.name}`);
      } else {
        console.warn('SchedulerService: ワークフロー実行コールバックが設定されていません');
      }

      // 実行完了後のクリーンアップ
      this.cleanupExecution(workflowId);

    } catch (executeError: any) {
      console.error('SchedulerService: スケジュール実行に失敗:', executeError);
      
      // エラー時もクリーンアップ
      this.cleanupExecution(workflowId);
      
      // 実行ログにエラーを記録
      const config = this.scheduledWorkflows.get(workflowId);
      if (config) {
        (config as any).lastError = {
          message: (executeError as Error).message,
          timestamp: new Date().toISOString()
        };
        this.scheduledWorkflows.set(workflowId, config);
        this.saveSchedulesToStorage();
      }
    }
  }

  /**
   * 実行タイムアウトを処理
   */
  private handleExecutionTimeout(workflowId: string): void {
    const executionInfo = this.activeExecutions.get(workflowId);
    if (!executionInfo) return;

    const timeoutMinutes = executionInfo.scheduleConfig.timeoutMinutes || 30;
    console.warn(`SchedulerService: ワークフロー ${executionInfo.scheduleConfig.name} がタイムアウトしました (${timeoutMinutes}分)`);
    
    // タイムアウト時はワークフロー実行停止コールバックを呼び出し
    if (this.workflowStopCallback) {
      this.workflowStopCallback(workflowId, 'timeout');
    }

    this.cleanupExecution(workflowId);

    // エラー情報を記録
    const config = this.scheduledWorkflows.get(workflowId);
    if (config) {
      (config as any).lastError = {
        message: `Execution timeout after ${timeoutMinutes} minutes`,
        timestamp: new Date().toISOString()
      };
      this.scheduledWorkflows.set(workflowId, config);
      this.saveSchedulesToStorage();
    }
  }

  /**
   * 実行のクリーンアップ
   */
  private cleanupExecution(workflowId: string): void {
    const executionInfo = this.activeExecutions.get(workflowId);
    if (executionInfo?.timeoutHandle) {
      clearTimeout(executionInfo.timeoutHandle);
    }
    this.activeExecutions.delete(workflowId);
  }

  /**
   * ワークフロー停止コールバックを設定
   */
  setWorkflowStopCallback(callback: WorkflowStopCallback): void {
    this.workflowStopCallback = callback;
    console.log('SchedulerService: ワークフロー停止コールバック設定完了');
  }

  /**
   * スケジュールを削除
   */
  removeSchedule(workflowId: string): boolean {
    try {
      this.stopSchedule(workflowId);
      this.scheduledWorkflows.delete(workflowId);
      this.saveSchedulesToStorage();
      return true;
    } catch (error: any) {
      console.error('SchedulerService: スケジュール削除に失敗:', error);
      return false;
    }
  }

  /**
   * スケジュールを有効/無効にする
   */
  toggleSchedule(workflowId: string, enabled: boolean): boolean {
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
    } catch (error: any) {
      console.error('SchedulerService: スケジュール切り替えに失敗:', error);
      return false;
    }
  }

  /**
   * 全てのスケジュール設定を取得
   */
  getAllSchedules(): Array<ScheduleConfig & { isActive: boolean }> {
    return Array.from(this.scheduledWorkflows.entries()).map(([workflowId, config]: any) => ({
      ...config,
      workflowId,
      isActive: this.activeJobs.has(workflowId)
    }));
  }

  /**
   * 特定のワークフローのスケジュール設定を取得
   */
  getSchedule(workflowId: string): (ScheduleConfig & { isActive: boolean }) | null {
    const config = this.scheduledWorkflows.get(workflowId);
    if (!config) {
      return null;
    }

    return {
      ...config,
      workflowId,
      isActive: this.activeJobs.has(workflowId)
    };
  }

  /**
   * 次回実行時刻を取得
   */
  getNextExecution(workflowId: string): Date | null {
    const job = this.activeJobs.get(workflowId);
    if (!job) {
      return null;
    }

    try {
      return job.nextRun();
    } catch (error: any) {
      console.error('SchedulerService: 次回実行時刻の取得に失敗:', error);
      return null;
    }
  }

  /**
   * cron式の検証
   */
  validateCronExpression(cronExpression: string): boolean {
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
  static get PRESETS(): Record<string, string> {
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
   * cron式のプリセットを配列で取得
   */
  static getCronPresets(): CronPreset[] {
    return Object.entries(this.PRESETS).map(([label, value]: any) => ({
      label,
      value,
      description: label
    }));
  }

  /**
   * cron式を人間が読める形式に変換
   */
  static humanReadableCron(cronExpression: string): string {
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
  stopAllSchedules(): void {
    this.activeJobs.forEach((job, workflowId: any) => {
      job.stop();
      console.log(`SchedulerService: スケジュール停止 - ${workflowId}`);
    });
    this.activeJobs.clear();
  }

  /**
   * 実行中のワークフロー一覧を取得
   */
  getActiveExecutions(): Array<{
    workflowId: string;
    startedAt: Date;
    scheduleConfig: ScheduleConfig;
    runningTime: number;
  }> {
    return Array.from(this.activeExecutions.entries()).map(([workflowId, info]: any) => ({
      ...info,
      workflowId,
      isActive: this.activeJobs.has(workflowId)
    }));
  }

  /**
   * 特定のワークフローの実行を強制停止
   */
  forceStopExecution(workflowId: string): boolean {
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
  destroy(): void {
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

const schedulerService = new SchedulerService();

export default schedulerService;