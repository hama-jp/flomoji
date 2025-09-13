import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import StorageService from './storageService'
import { Workflow, ChatHistoryItem } from '../types'

// localStorage のモック
const mockLocalStorage = {
  store: new Map(),
  getItem: vi.fn((key) => mockLocalStorage.store.get(key) || null),
  setItem: vi.fn((key, value) => {
    mockLocalStorage.store.set(key, value);
  }),
  removeItem: vi.fn((key) => {
    mockLocalStorage.store.delete(key);
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store.clear();
  })
};

// テスト環境でのlocalStorage設定
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('StorageService', () => {
  beforeEach(() => {
    // 各テスト前にストレージとモックをクリア
    mockLocalStorage.store.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    mockLocalStorage.store.clear();
  });

  describe('Basic operations', () => {
    it('should store and retrieve data correctly', () => {
      const testData = { name: 'test', value: 123 };
      
      const success = StorageService.set('test-key', testData);
      expect(success).toBe(true);
      
      const retrieved = StorageService.get('test-key');
      expect(retrieved).toEqual(testData);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(testData));
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
    });

    it('should return default value when key does not exist', () => {
      const defaultValue = { default: true };
      
      const result = StorageService.get('non-existent-key', defaultValue);
      expect(result as any).toEqual(defaultValue);
    });

    it('should remove data correctly', () => {
      StorageService.set('test-key', 'test-value');
      
      const success = StorageService.remove('test-key');
      expect(success).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
      
      const result = StorageService.get('test-key', 'default');
      expect(result as any).toBe('default');
    });
  });

  describe('Error handling', () => {
    it('should handle JSON parse errors gracefully', () => {
      // 不正なJSONをsetup
      mockLocalStorage.store.set('invalid-json', '{invalid json}');
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = StorageService.get('invalid-json', 'fallback');
      expect(result as any).toBe('fallback');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse data for key "invalid-json"'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle localStorage setItem errors', () => {
      // localStorage.setItem をエラーを投げるようにmock
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const success = StorageService.set('test-key', 'value');
      expect(success).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save data for key "test-key"'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Helper methods', () => {
    it('should handle settings operations', () => {
      const settings = { provider: 'openai', apiKey: 'test-key' };
      
      const success = StorageService.setSettings(settings);
      expect(success).toBe(true);
      
      const retrieved = StorageService.getSettings();
      expect(retrieved).toEqual(settings);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        StorageService.KEYS.SETTINGS, 
        JSON.stringify(settings)
      );
    });

    it('should handle workflows operations', () => {
      const workflows = { // 型を明示しない
        'wf-1': {
          id: 'wf-1',
          name: 'Test Workflow',
          description: 'A test workflow',
          flow: { nodes: [], edges: [] },
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          tags: ['test']
        }
      } as Record<string, Workflow>; // ここで型アサーション
      
      const success = StorageService.setWorkflows(workflows);
      expect(success).toBe(true);
      
      const retrieved = StorageService.getWorkflows();
      expect(retrieved).toEqual(workflows);
    });

    it('should handle current workflow ID operations', () => {
      const workflowId = 'workflow-123';
      
      const success = StorageService.setCurrentWorkflowId(workflowId);
      expect(success).toBe(true);
      
      const retrieved = StorageService.getCurrentWorkflowId();
      expect(retrieved).toBe(workflowId);
    });

    it('should handle chat history with trimming', () => {
      const longHistory: ChatHistoryItem[] = Array.from({ length: 150 }, (_, i) => ({
        id: `msg-${i}`,
        message: `Message ${i}`,
        timestamp: new Date().toISOString(),
        role: i % 2 === 0 ? 'user' : 'assistant',
      }));
      
      const success = StorageService.setChatHistory(longHistory, 100);
      expect(success).toBe(true);
      
      const retrieved = StorageService.getChatHistory();
      expect(retrieved).toHaveLength(100);
      expect(retrieved[0].id).toBe('msg-50'); // 最初の50件が削除され、50から開始
      expect(retrieved[99].id).toBe('msg-149'); // 最後の要素
    });
  });

  describe('Storage management', () => {
    it('should clear storage except specified keys', () => {
      // データをセットアップ
      StorageService.set(StorageService.KEYS.SETTINGS, { test: true });
      StorageService.set(StorageService.KEYS.WORKFLOWS, { wf: true });
      StorageService.set(StorageService.KEYS.CHAT_HISTORY, []);
      
      // SETTINGS以外をクリア
      const success = StorageService.clear([StorageService.KEYS.SETTINGS]);
      expect(success).toBe(true);
      
      // SETTINGSは残り、他は削除されることを確認
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(StorageService.KEYS.WORKFLOWS);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(StorageService.KEYS.CHAT_HISTORY);
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith(StorageService.KEYS.SETTINGS);
    });

    it('should provide usage information', () => {
      StorageService.set(StorageService.KEYS.SETTINGS, { large: 'data'.repeat(1000) });
      StorageService.set(StorageService.KEYS.WORKFLOWS, {});
      
      const usage = StorageService.getUsageInfo();
      
      expect(usage[StorageService.KEYS.SETTINGS].exists).toBe(true);
      expect(usage[StorageService.KEYS.SETTINGS].size).toBeGreaterThan(0);
      expect(usage[StorageService.KEYS.WORKFLOWS].exists).toBe(true);
      expect(usage[StorageService.KEYS.CHAT_HISTORY].exists).toBe(false);
      expect(usage[StorageService.KEYS.CHAT_HISTORY].size).toBe(0);
    });
  });

  describe('Constants', () => {
    it('should have correct storage keys defined', () => {
      expect(StorageService.KEYS.SETTINGS).toBe('llm-agent-settings');
      expect(StorageService.KEYS.WORKFLOWS).toBe('llm-agent-workflows');
      expect(StorageService.KEYS.CURRENT_WORKFLOW_ID).toBe('llm-agent-current-workflow-id');
      expect(StorageService.KEYS.CHAT_HISTORY).toBe('llm-agent-chat-history');
      expect(StorageService.KEYS.WORKFLOW_HISTORY).toBe('llm-agent-workflow-history');
    });
  });
});