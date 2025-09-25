import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowNode, NodeInputs, INodeExecutionContext } from '../../../types';
import JSONTransformNode from '../JSONTransformNode';
import ArrayOperationsNode from '../ArrayOperationsNode';
import DataTransformNode from '../DataTransformNode';

describe('Security and Bug Fixes', () => {
  let mockContext: INodeExecutionContext;

  beforeEach(() => {
    mockContext = {
      variables: {},
      addLog: vi.fn(),
      getVariable: vi.fn(),
      setVariable: vi.fn()
    };
  });

  describe('JSONTransformNode - Template Placeholder Fix', () => {
    it('should handle embedded placeholders within strings', async () => {
      const testNode: WorkflowNode = {
        id: 'test-json',
        type: 'json_transform',
        position: { x: 0, y: 0 },
        data: {
          operation: 'create',
          template: '{"greeting": "Hello, {{name}}!", "message": "Welcome {{name}} to our system"}'
        }
      };

      const inputs: NodeInputs = {
        variables: {
          name: 'Alice'
        }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        greeting: 'Hello, Alice!',
        message: 'Welcome Alice to our system'
      });
    });

    it('should handle placeholders that need escaping', async () => {
      const testNode: WorkflowNode = {
        id: 'test-json',
        type: 'json_transform',
        position: { x: 0, y: 0 },
        data: {
          operation: 'create',
          template: '{"message": "User said: \\"{{text}}\\"", "raw": "{{text}}"}'
        }
      };

      const inputs: NodeInputs = {
        variables: {
          text: 'Hello "world" with\nnewlines\tand\ttabs'
        }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        message: 'User said: "Hello "world" with\nnewlines\tand\ttabs"',
        raw: 'Hello "world" with\nnewlines\tand\ttabs'
      });
    });

    it('should handle standalone placeholders', async () => {
      const testNode: WorkflowNode = {
        id: 'test-json',
        type: 'json_transform',
        position: { x: 0, y: 0 },
        data: {
          operation: 'create',
          template: '{"name": {{name}}, "age": {{age}}, "active": {{active}}}'
        }
      };

      const inputs: NodeInputs = {
        variables: {
          name: 'Bob',
          age: 30,
          active: true
        }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        name: 'Bob',
        age: 30,
        active: true
      });
    });

    it('should handle quoted placeholders as entire values', async () => {
      const testNode: WorkflowNode = {
        id: 'test-json',
        type: 'json_transform',
        position: { x: 0, y: 0 },
        data: {
          operation: 'create',
          template: '{"name": "{{name}}", "id": "{{id}}"}'
        }
      };

      const inputs: NodeInputs = {
        variables: {
          name: 'Charlie',
          id: 12345
        }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        name: 'Charlie',
        id: '12345'  // When a number is in quotes in template, it becomes a string
      });
    });

    it('should handle complex mixed templates', async () => {
      const testNode: WorkflowNode = {
        id: 'test-json',
        type: 'json_transform',
        position: { x: 0, y: 0 },
        data: {
          operation: 'create',
          template: '{"greeting": "Hello {{name}}, you have {{count}} messages", "user": {{user}}, "timestamp": "{{timestamp}}"}'
        }
      };

      const inputs: NodeInputs = {
        variables: {
          name: 'David',
          count: 5,
          user: { id: 1, role: 'admin' },
          timestamp: '2024-01-01T12:00:00Z'
        }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        greeting: 'Hello David, you have 5 messages',
        user: { id: 1, role: 'admin' },
        timestamp: '2024-01-01T12:00:00Z'
      });
    });

    it('should handle arrays in templates', async () => {
      const testNode: WorkflowNode = {
        id: 'test-json',
        type: 'json_transform',
        position: { x: 0, y: 0 },
        data: {
          operation: 'create',
          template: '{"items": {{items}}, "description": "Found {{count}} items"}'
        }
      };

      const inputs: NodeInputs = {
        variables: {
          items: ['apple', 'banana', 'orange'],
          count: 3
        }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        items: ['apple', 'banana', 'orange'],
        description: 'Found 3 items'
      });
    });
  });

  describe('ArrayOperationsNode - Security Fix', () => {
    it('should safely evaluate expressions without code injection', async () => {
      const testNode: WorkflowNode = {
        id: 'test-array',
        type: 'array_operations',
        position: { x: 0, y: 0 },
        data: {
          operation: 'filter',
          expression: 'item > 5'
        }
      };

      const inputs: NodeInputs = {
        array: [3, 8, 2, 10, 5, 7]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([8, 10, 7]);
    });

    it('should reject dangerous expressions trying to access globals', async () => {
      const testNode: WorkflowNode = {
        id: 'test-array',
        type: 'array_operations',
        position: { x: 0, y: 0 },
        data: {
          operation: 'filter',
          expression: 'globalThis.localStorage.clear()'
        }
      };

      const inputs: NodeInputs = {
        array: [1, 2, 3]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      // Expression should not execute dangerous code and return safe default
      expect(result).toEqual([]);
    });

    it('should handle property access safely', async () => {
      const testNode: WorkflowNode = {
        id: 'test-array',
        type: 'array_operations',
        position: { x: 0, y: 0 },
        data: {
          operation: 'filter',
          expression: 'item.active === true'
        }
      };

      const inputs: NodeInputs = {
        array: [
          { name: 'A', active: true },
          { name: 'B', active: false },
          { name: 'C', active: true }
        ]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([
        { name: 'A', active: true },
        { name: 'C', active: true }
      ]);
    });

    it('should handle math operations safely', async () => {
      const testNode: WorkflowNode = {
        id: 'test-array',
        type: 'array_operations',
        position: { x: 0, y: 0 },
        data: {
          operation: 'map',
          expression: 'item * 2'
        }
      };

      const inputs: NodeInputs = {
        array: [1, 2, 3, 4]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([2, 4, 6, 8]);
    });
  });

  describe('DataTransformNode - CSV Parsing Fix', () => {
    it('should handle CSV with commas in quoted fields', async () => {
      const testNode: WorkflowNode = {
        id: 'test-csv',
        type: 'data_transform',
        position: { x: 0, y: 0 },
        data: {
          transformType: 'csv_to_json',
          delimiter: ',',
          headers: true
        }
      };

      const inputs: NodeInputs = {
        data: 'Company,Revenue\n"Acme, Inc.","1,000,000"\n"Beta Corp","500,000"'
      };

      const result = await DataTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([
        { Company: 'Acme, Inc.', Revenue: '1,000,000' },
        { Company: 'Beta Corp', Revenue: '500,000' }
      ]);
    });

    it('should handle CSV with escaped quotes', async () => {
      const testNode: WorkflowNode = {
        id: 'test-csv',
        type: 'data_transform',
        position: { x: 0, y: 0 },
        data: {
          transformType: 'csv_to_json',
          delimiter: ',',
          headers: true
        }
      };

      const inputs: NodeInputs = {
        data: 'Product,Description\n"Widget","A 5"" wide widget"\n"Gadget","Uses ""special"" technology"'
      };

      const result = await DataTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([
        { Product: 'Widget', Description: 'A 5" wide widget' },
        { Product: 'Gadget', Description: 'Uses "special" technology' }
      ]);
    });

    it('should generate CSV with proper escaping', async () => {
      const testNode: WorkflowNode = {
        id: 'test-csv',
        type: 'data_transform',
        position: { x: 0, y: 0 },
        data: {
          transformType: 'json_to_csv',
          delimiter: ',',
          headers: true
        }
      };

      const inputs: NodeInputs = {
        data: [
          { Company: 'Acme, Inc.', Revenue: '1,000,000' },
          { Company: 'Beta "Corp"', Revenue: '500,000' }
        ]
      };

      const result = await DataTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toBe(
        'Company,Revenue\n' +
        '"Acme, Inc.","1,000,000"\n' +
        '"Beta ""Corp""","500,000"'
      );
    });

    it('should handle CSV with newlines in fields', async () => {
      const testNode: WorkflowNode = {
        id: 'test-csv',
        type: 'data_transform',
        position: { x: 0, y: 0 },
        data: {
          transformType: 'csv_to_json',
          delimiter: ',',
          headers: true
        }
      };

      const inputs: NodeInputs = {
        data: 'Note,Author\n"Line 1\nLine 2","Alice"\n"Single line","Bob"'
      };

      const result = await DataTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([
        { Note: 'Line 1\nLine 2', Author: 'Alice' },
        { Note: 'Single line', Author: 'Bob' }
      ]);
    });

    it('should round-trip CSV data correctly', async () => {
      const originalData = [
        { Company: 'Acme, Inc.', Description: 'Makes "quality" products', Revenue: '1,000,000' },
        { Company: 'Beta Corp', Description: 'Line 1\nLine 2', Revenue: '500,000' }
      ];

      // Convert to CSV
      const csvNode: WorkflowNode = {
        id: 'test-csv-gen',
        type: 'data_transform',
        position: { x: 0, y: 0 },
        data: {
          transformType: 'json_to_csv',
          delimiter: ',',
          headers: true
        }
      };

      const csvResult = await DataTransformNode.execute(
        csvNode,
        { data: originalData },
        mockContext
      );

      // Convert back to JSON
      const jsonNode: WorkflowNode = {
        id: 'test-csv-parse',
        type: 'data_transform',
        position: { x: 0, y: 0 },
        data: {
          transformType: 'csv_to_json',
          delimiter: ',',
          headers: true
        }
      };

      const jsonResult = await DataTransformNode.execute(
        jsonNode,
        { data: csvResult },
        mockContext
      );

      // Should match original data
      expect(jsonResult).toEqual(originalData);
    });
  });
});