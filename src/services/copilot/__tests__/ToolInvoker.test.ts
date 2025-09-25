import { describe, it, expect, beforeEach } from 'vitest';
import { ToolInvoker } from '../ToolInvoker';
import useReactFlowStore from '../../../store/reactFlowStore';

describe('ToolInvoker.connectNodes handle validation', () => {
  let invoker: ToolInvoker;

  beforeEach(() => {
    const store = useReactFlowStore.getState();
    store.setNodes([]);
    store.setEdges([]);
    invoker = new ToolInvoker();
  });

  it('rejects connections when the source handle does not exist', async () => {
    const source = await invoker.execute({
      name: 'add_node',
      parameters: {
        type: 'http_request',
        data: {},
        position: { x: 0, y: 0 },
      },
    });

    const target = await invoker.execute({
      name: 'add_node',
      parameters: {
        type: 'web_api',
        data: {},
        position: { x: 100, y: 0 },
      },
    });

    const result = await invoker.execute({
      name: 'connect_nodes',
      parameters: {
        sourceId: source.data.node.id,
        sourceHandle: 'nonexistent',
        targetId: target.data.node.id,
        targetHandle: 'input',
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid source handle/);
  });

  it('maps generic input handle to the first available port when possible', async () => {
    const source = await invoker.execute({
      name: 'add_node',
      parameters: {
        type: 'code_execution',
        data: {},
        position: { x: 0, y: 0 },
      },
    });

    const target = await invoker.execute({
      name: 'add_node',
      parameters: {
        type: 'text_combiner',
        data: {},
        position: { x: 100, y: 0 },
      },
    });

    const result = await invoker.execute({
      name: 'connect_nodes',
      parameters: {
        sourceId: source.data.node.id,
        sourceHandle: 'output',
        targetId: target.data.node.id,
        targetHandle: 'input',
      },
    });

    expect(result.success).toBe(true);
    expect(result.data.edge.targetHandle).toBe('input1');
  });

  it('blocks target handles that are not defined on the node', async () => {
    const source = await invoker.execute({
      name: 'add_node',
      parameters: {
        type: 'input',
        data: {},
        position: { x: 0, y: 0 },
      },
    });

    const target = await invoker.execute({
      name: 'add_node',
      parameters: {
        type: 'text_combiner',
        data: {},
        position: { x: 100, y: 0 },
      },
    });

    const result = await invoker.execute({
      name: 'connect_nodes',
      parameters: {
        sourceId: source.data.node.id,
        sourceHandle: 'output',
        targetId: target.data.node.id,
        targetHandle: 'input5',
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid target handle/);
  });
});
