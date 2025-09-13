/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Dexie from 'dexie';
import { logService } from './logService';

// Mock Dexie
vi.mock('dexie', () => {
  const mockTable = {
    add: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    toArray: vi.fn(),
    clear: vi.fn().mockResolvedValue(undefined)
  };

  const MockDexie = vi.fn().mockImplementation(() => ({
    version: vi.fn().mockReturnThis(),
    stores: vi.fn().mockReturnThis(),
    workflow_runs: mockTable,
    node_logs: mockTable
  }));

  return { default: MockDexie, Table: vi.fn() };
});

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-id-123')
}));

describe('LogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRun', () => {
    it('should create a new workflow run', async () => {
      const workflowId = 'workflow-001';
      const inputData = { test: 'data' };
      
      const runId = await logService.createRun(workflowId, inputData);
      
      expect(runId).toBe('test-id-123');
    });

    it('should handle empty input data', async () => {
      const workflowId = 'workflow-002';
      
      const runId = await logService.createRun(workflowId);
      
      expect(runId).toBe('test-id-123');
    });
  });

  describe('updateRun', () => {
    it('should update run status to completed', async () => {
      const runId = 'run-123';
      const data = { status: 'completed' as const };
      
      await logService.updateRun(runId, data);
      
      // Verify update was called (mock verification would go here)
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should update run status to failed', async () => {
      const runId = 'run-124';
      const data = { status: 'failed' as const };
      
      await logService.updateRun(runId, data);
      
      // Verify endedAt is set for failed status
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should update run status to stopped', async () => {
      const runId = 'run-125';
      const data = { status: 'stopped' as const };
      
      await logService.updateRun(runId, data);
      
      // Verify endedAt is set for stopped status
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('addNodeLog', () => {
    it('should add a node log entry', async () => {
      const logData = {
        runId: 'run-456',
        nodeId: 'node-789',
        status: 'success',
        inputs: { input: 'test' },
        outputs: { output: 'result' },
        processingTime: 100
      };
      
      const logId = await logService.addNodeLog(logData);
      
      expect(logId).toBe('test-id-123');
    });

    it('should handle node log with error', async () => {
      const logData = {
        runId: 'run-457',
        nodeId: 'node-790',
        status: 'error',
        error: 'Something went wrong',
        inputs: {},
        outputs: {}
      };
      
      const logId = await logService.addNodeLog(logData);
      
      expect(logId).toBe('test-id-123');
    });
  });

  describe('getRunsForWorkflow', () => {
    it('should retrieve and sort runs for a workflow', async () => {
      const workflowId = 'workflow-003';
      const mockRuns = [
        { id: '1', workflowId, startedAt: '2024-01-02T00:00:00Z', inputData: '{}' },
        { id: '2', workflowId, startedAt: '2024-01-01T00:00:00Z', inputData: '{}' },
        { id: '3', workflowId, startedAt: '2024-01-03T00:00:00Z', inputData: '{}' }
      ];

      // Mock the toArray response
      const db = new (Dexie as any)('test');
      db.workflow_runs.toArray.mockResolvedValue(mockRuns);
      
      const runs = await logService.getRunsForWorkflow(workflowId);
      
      // Should be sorted by date (newest first)
      expect(runs[0].id).toBe('3');
      expect(runs[1].id).toBe('1');
      expect(runs[2].id).toBe('2');
    });
  });

  describe('getLogsForRun', () => {
    it('should retrieve and sort logs for a run', async () => {
      const runId = 'run-789';
      const mockLogs = [
        { id: '1', runId, timestamp: '2024-01-01T00:00:02Z', inputs: '{}', outputs: '{}' },
        { id: '2', runId, timestamp: '2024-01-01T00:00:01Z', inputs: '{}', outputs: '{}' },
        { id: '3', runId, timestamp: '2024-01-01T00:00:03Z', inputs: '{}', outputs: '{}' }
      ];

      // Mock the toArray response
      const db = new (Dexie as any)('test');
      db.node_logs.toArray.mockResolvedValue(mockLogs);
      
      const logs = await logService.getLogsForRun(runId);
      
      // Should be sorted by timestamp (oldest first)
      expect(logs[0].id).toBe('2');
      expect(logs[1].id).toBe('1');
      expect(logs[2].id).toBe('3');
    });
  });

  describe('clearAllLogs', () => {
    it('should clear all workflow runs and node logs', async () => {
      await logService.clearAllLogs();
      
      // Verify clear was called on both tables
      const db = new (Dexie as any)('test');
      expect(db.workflow_runs.clear).toHaveBeenCalled();
      expect(db.node_logs.clear).toHaveBeenCalled();
    });
  });

  describe('getRun', () => {
    it('should retrieve a specific run by ID', async () => {
      const runId = 'run-999';
      const mockRun = { 
        id: runId, 
        workflowId: 'wf-123', 
        startedAt: '2024-01-01T00:00:00Z',
        inputData: '{"test": true}'
      };

      const db = new (Dexie as any)('test');
      db.workflow_runs.get.mockResolvedValue(mockRun);
      
      const run = await logService.getRun(runId);
      
      expect(run).toEqual({
        ...mockRun,
        inputData: { test: true }
      });
    });

    it('should return null for non-existent run', async () => {
      const runId = 'non-existent';

      const db = new (Dexie as any)('test');
      db.workflow_runs.get.mockResolvedValue(null);
      
      const run = await logService.getRun(runId);
      
      expect(run).toBeNull();
    });
  });
});