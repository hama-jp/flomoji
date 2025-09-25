import { describe, it, expect, vi } from 'vitest';
import { NodeExecutor } from '../NodeExecutor';
import { WorkflowNode } from '../../../types';

describe('NodeExecutor Output Routing', () => {
  it('should route structured_extraction outputs correctly by handle', () => {
    const context = {
      getNodeResult: vi.fn().mockReturnValue({
        __multiOutput: true,
        data: { extracted: 'value' },
        prompt: 'Generated prompt text',
        needsLLM: true,
        originalText: 'Original input',
        schema: '{"type": "object"}'
      }),
      variables: {},
      addLog: vi.fn(),
      setVariable: vi.fn(),
      getVariable: vi.fn(),
      setNodeResult: vi.fn(),
      checkAbort: vi.fn()
    };

    const nodeTypes = {
      structured_extraction: { inputs: ['text', 'schema'] },
      llm: { inputs: ['prompt'] }
    };
    const executor = new NodeExecutor(context as any, nodeTypes);

    const nodes: WorkflowNode[] = [
      { id: 'extraction', type: 'structured_extraction', position: { x: 0, y: 0 }, data: {} },
      { id: 'llm', type: 'llm', position: { x: 200, y: 0 }, data: {} }
    ];

    const connections = [
      {
        id: 'conn1',
        source: 'extraction',
        target: 'llm',
        sourceHandle: '1', // prompt output (index 1)
        targetHandle: '0'  // prompt input
      }
    ];

    const targetNode = nodes[1];
    const inputs = (executor as any).getNodeInputs(targetNode, connections, nodes);

    // The LLM node should receive just the prompt text, not the entire object
    expect(inputs.prompt).toBe('Generated prompt text');
    expect(inputs.prompt).not.toBe('[object Object]');
  });

  it('should route schema_validator outputs correctly by handle', () => {
    const context = {
      getNodeResult: vi.fn().mockReturnValue({
        __multiOutput: true,
        data: { validated: 'data' },
        isValid: true,
        error: null,
        validationErrors: null,
        repairedData: null
      }),
      variables: {},
      addLog: vi.fn(),
      setVariable: vi.fn(),
      getVariable: vi.fn(),
      setNodeResult: vi.fn(),
      checkAbort: vi.fn()
    };

    const nodeTypes = {
      schema_validator: { inputs: ['llmResponse', 'schema', 'originalText'] },
      output: { inputs: ['data'] }
    };
    const executor = new NodeExecutor(context as any, nodeTypes);

    const nodes: WorkflowNode[] = [
      { id: 'validator', type: 'schema_validator', position: { x: 0, y: 0 }, data: {} },
      { id: 'output', type: 'output', position: { x: 200, y: 0 }, data: {} }
    ];

    const connections = [
      {
        id: 'conn1',
        source: 'validator',
        target: 'output',
        sourceHandle: '0', // data output (index 0)
        targetHandle: '0'
      }
    ];

    const targetNode = nodes[1];
    const inputs = (executor as any).getNodeInputs(targetNode, connections, nodes);

    // The output node should receive just the validated data
    expect(inputs['data']).toEqual({ validated: 'data' });
  });

  it('should handle named sourceHandles', () => {
    const context = {
      getNodeResult: vi.fn().mockReturnValue({
        __multiOutput: true,
        data: null,
        prompt: 'Test prompt',
        needsLLM: true,
        originalText: 'Test text',
        schema: '{}'
      }),
      variables: {},
      addLog: vi.fn(),
      setVariable: vi.fn(),
      getVariable: vi.fn(),
      setNodeResult: vi.fn(),
      checkAbort: vi.fn()
    };

    const nodeTypes = {
      structured_extraction: { inputs: ['text', 'schema'] },
      llm: { inputs: ['prompt'] }
    };
    const executor = new NodeExecutor(context as any, nodeTypes);

    const nodes: WorkflowNode[] = [
      { id: 'extraction', type: 'structured_extraction', position: { x: 0, y: 0 }, data: {} },
      { id: 'llm', type: 'llm', position: { x: 200, y: 0 }, data: {} }
    ];

    const connections = [
      {
        id: 'conn1',
        source: 'extraction',
        target: 'llm',
        sourceHandle: 'prompt', // Named handle instead of index
        targetHandle: '0'
      }
    ];

    const targetNode = nodes[1];
    const inputs = (executor as any).getNodeInputs(targetNode, connections, nodes);

    expect(inputs.prompt).toBe('Test prompt');
  });

  it('should fallback to entire object for unknown nodes', () => {
    const context = {
      getNodeResult: vi.fn().mockReturnValue({
        someField: 'value',
        anotherField: 123
      }),
      variables: {},
      addLog: vi.fn(),
      setVariable: vi.fn(),
      getVariable: vi.fn(),
      setNodeResult: vi.fn(),
      checkAbort: vi.fn()
    };

    const nodeTypes = {
      text: { inputs: ['input'] },
      output: { inputs: ['data'] }
    };
    const executor = new NodeExecutor(context as any, nodeTypes);

    const nodes: WorkflowNode[] = [
      { id: 'custom', type: 'text' as any, position: { x: 0, y: 0 }, data: {} },
      { id: 'output', type: 'output', position: { x: 200, y: 0 }, data: {} }
    ];

    const connections = [
      {
        id: 'conn1',
        source: 'custom',
        target: 'output',
        sourceHandle: '0',
        targetHandle: '0'
      }
    ];

    const targetNode = nodes[1];
    const inputs = (executor as any).getNodeInputs(targetNode, connections, nodes);

    // Should receive the entire object
    expect(inputs['data']).toEqual({
      someField: 'value',
      anotherField: 123
    });
  });
});