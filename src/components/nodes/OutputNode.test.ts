import { describe, expect, it } from 'vitest';

import { OutputNode } from './OutputNode';

describe('OutputNode', () => {
  it('should keep plain text output as-is', async () => {
    const result = await OutputNode.execute(
      {
        id: 'output-1',
        type: 'output',
        position: { x: 0, y: 0 },
        data: { format: 'text', name: 'summary' }
      },
      {
        input: 'hello world'
      }
    );

    expect(result).toBe('hello world');
  });

  it('should serialize object output as formatted JSON', async () => {
    const variables: Record<string, unknown> = {};
    const context = {
      variables,
      addLog: () => undefined,
      setVariable(key: string, value: unknown) {
        variables[key] = value;
      },
      getVariable(key: string) {
        return variables[key];
      }
    };

    const result = await OutputNode.execute(
      {
        id: 'output-1',
        type: 'output',
        position: { x: 0, y: 0 },
        data: { format: 'json', name: 'payload' }
      },
      {
        input: { name: 'flomoji', count: 2 }
      },
      context
    );

    expect(result).toBe('{\n  "name": "flomoji",\n  "count": 2\n}');
    expect(variables.payload).toBe(result);
  });

  it('should render objects as markdown code blocks when markdown output is selected', async () => {
    const result = await OutputNode.execute(
      {
        id: 'output-1',
        type: 'output',
        position: { x: 0, y: 0 },
        data: { format: 'markdown', name: 'report' }
      },
      {
        input: { status: 'ok' }
      }
    );

    expect(result).toContain('```json');
    expect(result).toContain('"status": "ok"');
  });
});
