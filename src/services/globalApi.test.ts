import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runFlomojiWorkflow } from './globalApi';
import StorageService from './storageService';
import { NodeExecutionService } from './nodeExecutionService'; // Import the (to be) mocked class
import { Workflow } from '../types';

// Auto-mock the modules. The calls are hoisted.
vi.mock('./storageService');
vi.mock('./nodeExecutionService');

const sampleWorkflows: Record<string, Workflow> = {
  'hello-world': {
    id: 'hello-world', name: 'Hello World', nodes: [], connections: [], schedule: null, lastRun: null,
  },
};

describe('runFlomojiWorkflow', () => {
  // Declare variables to hold the mock functions
  let mockStartExecution: vi.Mock;
  const mockExecutor = { next: vi.fn(), stop: vi.fn() };

  beforeEach(() => {
    // Reset all mocks to ensure a clean state for each test
    vi.resetAllMocks();

    // Define the mock implementation for NodeExecutionService for this test run
    mockStartExecution = vi.fn().mockResolvedValue(mockExecutor);
    (NodeExecutionService as vi.Mock).mockImplementation(() => {
      return { startExecution: mockStartExecution };
    });

    // Define the mock implementation for StorageService for this test run
    (StorageService.getWorkflows as vi.Mock).mockReturnValue(sampleWorkflows);
  });

  it('should reject if workflowId is not found', async () => {
    await expect(runFlomojiWorkflow('non-existent-id')).rejects.toThrow(
      'Workflow with ID "non-existent-id" not found.'
    );
    expect(mockStartExecution).not.toHaveBeenCalled();
  });

  it('should execute a workflow and resolve with final variables on completion', async () => {
    const workflowId = 'hello-world';
    const inputData = { name: 'Jules' };
    const finalVariables = { greeting: 'Hello, Jules!' };

    mockExecutor.next
      .mockReset() // Reset from previous tests
      .mockResolvedValueOnce({ done: false, value: { status: 'running' } })
      .mockResolvedValueOnce({ done: true, value: { status: 'completed', variables: finalVariables } });

    const result = await runFlomojiWorkflow(workflowId, inputData);

    expect(mockStartExecution).toHaveBeenCalledWith(
      sampleWorkflows[workflowId].nodes,
      sampleWorkflows[workflowId].connections,
      inputData
    );
    expect(result).toEqual(finalVariables);
  });

  it('should reject if the workflow execution fails', async () => {
    const executionError = new Error('Execution failed');
    mockExecutor.next.mockReset().mockResolvedValueOnce({ done: true, value: { status: 'error', error: executionError } });

    await expect(runFlomojiWorkflow('hello-world')).rejects.toThrow('Execution failed');
  });

  it('should reject if the workflow finishes with an unexpected status', async () => {
    mockExecutor.next.mockReset().mockResolvedValueOnce({ done: true, value: { status: 'stopped' } });

    await expect(runFlomojiWorkflow('hello-world')).rejects.toThrow(
      'Workflow execution finished with unexpected status: stopped'
    );
  });

  it('should handle workflows with no final variables and return an empty object', async () => {
    mockExecutor.next.mockReset().mockResolvedValueOnce({ done: true, value: { status: 'completed', variables: undefined } });

    const result = await runFlomojiWorkflow('hello-world');
    expect(result).toEqual({});
  });

  it('should reject if startExecution itself throws an error', async () => {
    const setupError = new Error('Graph validation failed');
    mockStartExecution.mockRejectedValue(setupError);

    await expect(runFlomojiWorkflow('hello-world')).rejects.toThrow('Graph validation failed');
  });
});