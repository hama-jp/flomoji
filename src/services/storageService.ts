/**
 * 統一されたローカルストレージ管理サービス
 * 
 * 全てのlocalStorageアクセスを一元化し、型安全性とエラーハンドリングを提供します。
 * 新しい開発者が参加しやすくするため、ストレージキーの管理を統一化しています。
 */

import { StorageData, Workflow, LLMSettings } from '../types';

// Storage usage info interface
interface StorageUsageInfo {
  [key: string]: {
    exists: boolean;
    size: number;
    sizeKB: number;
  };
}

// Chat history item type
interface ChatHistoryItem {
  id: string;
  message: string;
  timestamp: string;
  role: 'user' | 'assistant' | 'system';
}

class StorageService {
  // ストレージキーの定数定義
  static readonly KEYS = {
    SETTINGS: 'llm-agent-settings',
    WORKFLOWS: 'llm-agent-workflows', 
    CURRENT_WORKFLOW_ID: 'llm-agent-current-workflow-id',
    CHAT_HISTORY: 'llm-agent-chat-history',
    WORKFLOW_HISTORY: 'llm-agent-workflow-history'
  } as const;

  /**
   * データを取得
   * @param key - ストレージキー
   * @param defaultValue - デフォルト値
   * @returns 取得されたデータまたはデフォルト値
   */
  static get<T = any>(key: string, defaultValue: T | null = null): T | null {
    try {
      // Check if localStorage is available (browser environment)
      if (typeof localStorage === 'undefined') {
        return defaultValue;
      }
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      return JSON.parse(item) as T;
    } catch (error: any) {
      console.warn(`StorageService: Failed to parse data for key "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * データを保存
   * @param key - ストレージキー  
   * @param value - 保存するデータ
   * @returns 保存成功の可否
   */
  static set<T = any>(key: string, value: T): boolean {
    try {
      // Check if localStorage is available (browser environment)
      if (typeof localStorage === 'undefined') {
        return false;
      }
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error: any) {
      console.error(`StorageService: Failed to save data for key "${key}":`, error);
      return false;
    }
  }

  /**
   * データを削除
   * @param key - ストレージキー
   * @returns 削除成功の可否
   */
  static remove(key: string): boolean {
    try {
      // Check if localStorage is available (browser environment)
      if (typeof localStorage === 'undefined') {
        return false;
      }
      localStorage.removeItem(key);
      return true;
    } catch (error: any) {
      console.error(`StorageService: Failed to remove data for key "${key}":`, error);
      return false;
    }
  }

  /**
   * ストレージをクリア
   * @param keysToKeep - 保持するキーの配列
   */
  static clear(keysToKeep: string[] = []): boolean {
    try {
      // Check if localStorage is available (browser environment)
      if (typeof localStorage === 'undefined') {
        return false;
      }
      const allKeys = Object.values(this.KEYS);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error: any) {
      console.error('StorageService: Failed to clear storage:', error);
      return false;
    }
  }

  /**
   * ストレージの使用状況を取得
   * @returns ストレージ使用状況の詳細
   */
  static getUsageInfo(): StorageUsageInfo {
    const info: StorageUsageInfo = {};
    // Check if localStorage is available (browser environment)
    if (typeof localStorage === 'undefined') {
      return info;
    }
    Object.values(this.KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      info[key] = {
        exists: item !== null,
        size: item ? new Blob([item]).size : 0,
        sizeKB: item ? Math.round(new Blob([item]).size / 1024 * 100) / 100 : 0
      };
    });
    return info;
  }

  // 特定のデータタイプ用のヘルパーメソッド

  /**
   * 設定データを取得
   * @param defaultSettings - デフォルト設定
   * @returns 設定データ
   */
  static getSettings(defaultSettings: Partial<LLMSettings> = {}): Partial<LLMSettings> {
    return this.get<Partial<LLMSettings>>(this.KEYS.SETTINGS, defaultSettings) || defaultSettings;
  }

  /**
   * 設定データを保存
   * @param settings - 設定データ
   * @returns 保存成功の可否
   */
  static setSettings(settings: Partial<LLMSettings>): boolean {
    return this.set(this.KEYS.SETTINGS, settings);
  }

  /**
   * ワークフローデータを取得
   * @param defaultWorkflows - デフォルトワークフロー
   * @returns ワークフローデータ
   */
  static getWorkflows(defaultWorkflows: Record<string, Workflow> = {}): Record<string, Workflow> {
    return this.get<Record<string, Workflow>>(this.KEYS.WORKFLOWS, defaultWorkflows) || defaultWorkflows;
  }

  /**
   * ワークフローデータを保存
   * @param workflows - ワークフローデータ
   * @returns 保存成功の可否
   */
  static setWorkflows(workflows: Record<string, Workflow>): boolean {
    return this.set(this.KEYS.WORKFLOWS, workflows);
  }

  /**
   * 現在のワークフローIDを取得
   * @returns 現在のワークフローID
   */
  static getCurrentWorkflowId(): string | null {
    try {
      // Check if localStorage is available (browser environment)
      if (typeof localStorage === 'undefined') {
        return null;
      }
      // 現在のワークフローIDは文字列として保存されている場合があるので、
      // 直接localStorageから取得してJSONパースエラーを避ける
      return localStorage.getItem(this.KEYS.CURRENT_WORKFLOW_ID);
    } catch (error: any) {
      console.warn('StorageService: Failed to get current workflow ID:', error);
      return null;
    }
  }

  /**
   * 現在のワークフローIDを設定
   * @param id - ワークフローID
   * @returns 保存成功の可否
   */
  static setCurrentWorkflowId(id: string): boolean {
    try {
      // Check if localStorage is available (browser environment)
      if (typeof localStorage === 'undefined') {
        return false;
      }
      // ワークフローIDは単純な文字列として保存
      localStorage.setItem(this.KEYS.CURRENT_WORKFLOW_ID, id);
      return true;
    } catch (error: any) {
      console.error('StorageService: Failed to set current workflow ID:', error);
      return false;
    }
  }

  /**
   * チャット履歴を取得
   * @param defaultHistory - デフォルト履歴
   * @returns チャット履歴
   */
  static getChatHistory(defaultHistory: ChatHistoryItem[] = []): ChatHistoryItem[] {
    return this.get<ChatHistoryItem[]>(this.KEYS.CHAT_HISTORY, defaultHistory) || defaultHistory;
  }

  /**
   * チャット履歴を保存
   * @param history - チャット履歴
   * @param maxItems - 保持する最大アイテム数（デフォルト100）
   * @returns 保存成功の可否
   */
  static setChatHistory(history: ChatHistoryItem[], maxItems: number = 100): boolean {
    const trimmedHistory = history.slice(-maxItems);
    return this.set(this.KEYS.CHAT_HISTORY, trimmedHistory);
  }
}

export default StorageService;