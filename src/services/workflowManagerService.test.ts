/* eslint-disable @typescript-eslint/no-explicit-any */
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import workflowManagerService from './workflowManagerService';
import StorageService from './storageService';
import { Workflow } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('workflowManagerService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    
    // fetchをモック化
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'Sample Workflow',
        nodes: [],
        edges: []
      })
    });
    vi.stubGlobal('fetch', mockFetch);
    
    // StorageServiceをモック化し、getWorkflowsが空を返すように設定
    vi.spyOn(StorageService, 'getWorkflows').mockReturnValue({});
    vi.spyOn(StorageService, 'setWorkflows').mockImplementation(() => true);
    vi.spyOn(StorageService, 'get').mockReturnValue(null);
    vi.spyOn(StorageService, 'set').mockImplementation(() => true);
    vi.spyOn(StorageService, 'remove').mockImplementation(() => true);
    vi.spyOn(StorageService, 'getCurrentWorkflowId').mockReturnValue(null);
    vi.spyOn(StorageService, 'setCurrentWorkflowId').mockImplementation(() => true);

    // workflowManagerServiceの内部状態をリセット
    // resetメソッドを使用して_initializedフラグをリセット
    (workflowManagerService as any).reset();
  });

  it('should initialize with sample workflows when none exist', async () => {
    // Mock the StorageService to track workflow saves
    const savedWorkflows: Record<string, Workflow> = {};
    let currentId: string | null = null;
    
    vi.spyOn(StorageService, 'getWorkflows').mockImplementation(() => savedWorkflows);
    vi.spyOn(StorageService, 'setWorkflows').mockImplementation((workflows) => {
      Object.assign(savedWorkflows, workflows);
      return true;
    });
    vi.spyOn(StorageService, 'setCurrentWorkflowId').mockImplementation((id) => {
      currentId = id;
      return true;
    });
    vi.spyOn(StorageService, 'getCurrentWorkflowId').mockImplementation(() => currentId);
    
    // initialize() を呼び出す
    await workflowManagerService.initialize();
    
    const workflows = workflowManagerService.getWorkflows();
    expect(Object.keys(workflows).length).toBeGreaterThan(0);
    const currentWorkflowId = workflowManagerService.getCurrentWorkflowId();
    expect(currentWorkflowId).not.toBeNull();
  });

  it('should save and retrieve a workflow', () => {
    const savedWorkflows: Record<string, Workflow> = {};
    
    vi.spyOn(StorageService, 'getWorkflows').mockImplementation(() => savedWorkflows);
    vi.spyOn(StorageService, 'setWorkflows').mockImplementation((workflows) => {
      Object.assign(savedWorkflows, workflows);
      return true;
    });
    
    const newWorkflow = workflowManagerService.createNewWorkflow('Test Flow');
    workflowManagerService.saveWorkflow(newWorkflow);

    const retrieved = workflowManagerService.getWorkflow(newWorkflow.id);
    expect(retrieved).toBeDefined();
    if (retrieved) {
      expect(retrieved.name).toBe('Test Flow');
      expect(retrieved.id).toBe(newWorkflow.id);
      expect(retrieved.lastModified).toBeDefined();
    }
  });

  it('should get all workflows', () => {
    const savedWorkflows: Record<string, Workflow> = {};
    
    vi.spyOn(StorageService, 'getWorkflows').mockImplementation(() => savedWorkflows);
    vi.spyOn(StorageService, 'setWorkflows').mockImplementation((workflows) => {
      Object.assign(savedWorkflows, workflows);
      return true;
    });
    
    const wf1 = workflowManagerService.createNewWorkflow('Flow 1');
    const wf2 = workflowManagerService.createNewWorkflow('Flow 2');
    workflowManagerService.saveWorkflow(wf1);
    workflowManagerService.saveWorkflow(wf2);

    const allWorkflows = workflowManagerService.getWorkflows();
    expect(Object.keys(allWorkflows).length).toBe(2);
    expect(allWorkflows[wf1.id]).toBeDefined();
    expect(allWorkflows[wf2.id]).toBeDefined();
    if (allWorkflows[wf1.id]) {
      expect(allWorkflows[wf1.id].name).toBe('Flow 1');
    }
  });

  it('should delete a workflow', () => {
    const savedWorkflows: Record<string, Workflow> = {};
    let currentId: string | null = null;
    
    vi.spyOn(StorageService, 'getWorkflows').mockImplementation(() => {
      // Return a copy to allow delete operations
      return { ...savedWorkflows };
    });
    vi.spyOn(StorageService, 'setWorkflows').mockImplementation((workflows) => {
      // Clear and reassign to simulate deletion
      Object.keys(savedWorkflows).forEach(key => delete savedWorkflows[key]);
      Object.assign(savedWorkflows, workflows);
      return true;
    });
    vi.spyOn(StorageService, 'setCurrentWorkflowId').mockImplementation((id) => {
      currentId = id;
      return true;
    });
    vi.spyOn(StorageService, 'getCurrentWorkflowId').mockImplementation(() => currentId);
    
    const wf1 = workflowManagerService.createNewWorkflow('Flow 1');
    workflowManagerService.saveWorkflow(wf1);

    let allWorkflows = workflowManagerService.getWorkflows();
    expect(Object.keys(allWorkflows).length).toBe(1);

    workflowManagerService.setCurrentWorkflowId(wf1.id);
    workflowManagerService.deleteWorkflow(wf1.id);
    allWorkflows = workflowManagerService.getWorkflows();
    
    // 削除後、新しいワークフローが作成されるため、数が1のままであることを確認
    expect(Object.keys(allWorkflows).length).toBe(1);
    // 削除されたワークフローがundefinedであることを確認
    expect(allWorkflows[wf1.id]).toBeUndefined();
  });

  it('should manage current workflow ID', () => {
    let currentId: string | null = null;
    
    vi.spyOn(StorageService, 'setCurrentWorkflowId').mockImplementation((id) => {
      currentId = id;
      return true;
    });
    vi.spyOn(StorageService, 'getCurrentWorkflowId').mockImplementation(() => currentId);
    
    workflowManagerService.setCurrentWorkflowId('test-id');
    expect(workflowManagerService.getCurrentWorkflowId()).toBe('test-id');
  });
});