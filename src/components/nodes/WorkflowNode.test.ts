import { describe, it, expect, beforeEach } from 'vitest';
import { NodeExecutionService } from '../../services/nodeExecutionService';
import workflowManagerService from '../../services/workflowManagerService';
import { Workflow, WorkflowNode as WorkflowNodeType, NodeConnection } from '../../types';

describe('WorkflowNode Integration Test', () => {
  beforeEach(() => {
    // Reset services to ensure a clean slate for each test.
    workflowManagerService.reset();
    localStorage.clear();
    workflowManagerService.initialize();
  });

  it('should execute a sub-workflow and correctly pass data through it', async () => {
    // 1. Define a simple pass-through sub-workflow.
    const subWorkflow: Workflow = {
      id: 'sub-workflow-passthrough',
      name: 'Pass-Through',
      flow: {
        nodes: [
          { id: 'sub-input', type: 'input', data: { name: 'input' }, position: { x: 0, y: 0 } },
          { id: 'sub-output', type: 'output', data: { name: 'output' }, position: { x: 200, y: 0 } },
        ],
        edges: [
          { id: 'e1', source: 'sub-input', sourceHandle: 'output', target: 'sub-output', targetHandle: 'input' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      lastModified: new Date().toISOString(),
    };
    workflowManagerService.saveWorkflow(subWorkflow);

    // 2. Define the parent workflow using the WorkflowNode.
    const parentNodes: WorkflowNodeType[] = [
      { id: 'parent-input', type: 'input', data: { name: 'input' }, position: { x: 0, y: 0 } },
      {
        id: 'workflow-node',
        type: 'workflow',
        data: { workflowId: 'sub-workflow-passthrough' },
        position: { x: 200, y: 0 },
      },
      { id: 'parent-output', type: 'output', data: { name: 'final_output' }, position: { x: 400, y: 0 } },
    ];
    const parentEdges: NodeConnection[] = [
      { id: 'pe1', source: 'parent-input', sourceHandle: 'output', target: 'workflow-node', targetHandle: 'input' },
      { id: 'pe2', source: 'workflow-node', sourceHandle: 'output', target: 'parent-output', targetHandle: 'input' },
    ];

    // 3. Execute the parent workflow with a simple string input.
    const executionService = new NodeExecutionService();
    const initialInput = { input: 'hello from parent' };
    const executionGenerator = await executionService.startExecution(parentNodes, parentEdges, initialInput);

    let finalResult: any;
    while (true) {
      const { done, value } = await executionGenerator.next();
      if (done) {
        finalResult = value;
        break;
      }
    }

    // 4. Assert the final output.
    expect(finalResult.status).toBe('completed');
    expect(finalResult.variables.final_output).toBe('hello from parent');
  });
});