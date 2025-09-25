import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowNode, NodeInputs, INodeExecutionContext } from '../../../types';
import JSONTransformNode from '../JSONTransformNode';

describe('JSONTransformNode', () => {
  let testNode: WorkflowNode;
  let mockContext: INodeExecutionContext;

  beforeEach(() => {
    testNode = {
      id: 'test-json-transform',
      type: 'json_transform',
      position: { x: 0, y: 0 },
      data: {
        operation: 'parse',
        jsonPath: '',
        prettyPrint: false,
        defaultValue: undefined,  // Change to undefined by default
        mergeStrategy: 'shallow',
        template: '{}'
      }
    };

    mockContext = {
      variables: {},
      addLog: vi.fn(),
      getVariable: vi.fn(),
      setVariable: vi.fn()
    };
  });

  describe('Parse operation', () => {
    it('should parse JSON string to object', async () => {
      testNode.data.operation = 'parse';
      const inputs: NodeInputs = {
        data: '{"name": "John", "age": 30}'
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({ name: 'John', age: 30 });
      expect(mockContext.addLog).toHaveBeenCalledWith(
        'success',
        'Successfully parsed JSON string',
        testNode.id
      );
    });

    it('should return input if already an object', async () => {
      testNode.data.operation = 'parse';
      const inputs: NodeInputs = {
        data: { already: 'parsed' }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({ already: 'parsed' });
    });
  });

  describe('Stringify operation', () => {
    it('should stringify object to JSON', async () => {
      testNode.data.operation = 'stringify';
      const inputs: NodeInputs = {
        data: { name: 'John', age: 30 }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toBe('{"name":"John","age":30}');
    });

    it('should pretty print when enabled', async () => {
      testNode.data.operation = 'stringify';
      testNode.data.prettyPrint = true;
      const inputs: NodeInputs = {
        data: { name: 'John', age: 30 }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toBe('{\n  "name": "John",\n  "age": 30\n}');
    });
  });

  describe('Extract operation', () => {
    it('should extract value at JSON path', async () => {
      testNode.data.operation = 'extract';
      testNode.data.jsonPath = 'user.profile.name';
      const inputs: NodeInputs = {
        data: {
          user: {
            profile: {
              name: 'Alice',
              age: 25
            }
          }
        }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toBe('Alice');
    });

    it('should handle array notation', async () => {
      testNode.data.operation = 'extract';
      testNode.data.jsonPath = 'items[1].name';
      const inputs: NodeInputs = {
        data: {
          items: [
            { name: 'Item1' },
            { name: 'Item2' },
            { name: 'Item3' }
          ]
        }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toBe('Item2');
    });

    it('should return default value when path not found', async () => {
      testNode.data.operation = 'extract';
      testNode.data.jsonPath = 'missing.path';
      testNode.data.defaultValue = 'default';
      const inputs: NodeInputs = {
        data: { other: 'value' }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toBe('default');
    });

    it('should throw error when path not found and no default', async () => {
      testNode.data.operation = 'extract';
      testNode.data.jsonPath = 'missing.path';
      testNode.data.defaultValue = undefined;  // Explicitly set to undefined
      const inputs: NodeInputs = {
        data: { other: 'value' }
      };

      await expect(
        JSONTransformNode.execute(testNode, inputs, mockContext)
      ).rejects.toThrow('Path "missing.path" not found in JSON data');
    });
  });

  describe('Set operation', () => {
    it('should set value at JSON path', async () => {
      testNode.data.operation = 'set';
      testNode.data.jsonPath = 'user.name';
      const inputs: NodeInputs = {
        data: { user: { age: 30 } },
        value: 'John'
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        user: {
          age: 30,
          name: 'John'
        }
      });
    });

    it('should create nested path if not exists', async () => {
      testNode.data.operation = 'set';
      testNode.data.jsonPath = 'deeply.nested.value';
      const inputs: NodeInputs = {
        data: {},
        value: 'test'
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        deeply: {
          nested: {
            value: 'test'
          }
        }
      });
    });

    it('should handle array notation in set', async () => {
      testNode.data.operation = 'set';
      testNode.data.jsonPath = 'items[0].name';
      const inputs: NodeInputs = {
        data: { items: [{ id: 1 }] },
        value: 'First Item'
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        items: [{ id: 1, name: 'First Item' }]
      });
    });
  });

  describe('Delete operation', () => {
    it('should delete value at JSON path', async () => {
      testNode.data.operation = 'delete';
      testNode.data.jsonPath = 'user.email';
      const inputs: NodeInputs = {
        data: {
          user: {
            name: 'John',
            email: 'john@example.com',
            age: 30
          }
        }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        user: {
          name: 'John',
          age: 30
        }
      });
    });

    it('should handle array element deletion', async () => {
      testNode.data.operation = 'delete';
      testNode.data.jsonPath = 'items[1]';
      const inputs: NodeInputs = {
        data: {
          items: ['a', 'b', 'c']
        }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        items: ['a', 'c']
      });
    });
  });

  describe('Merge operation', () => {
    it('should merge objects with shallow strategy', async () => {
      testNode.data.operation = 'merge';
      testNode.data.mergeStrategy = 'shallow';
      const inputs: NodeInputs = {
        data: {
          a: 1,
          b: { x: 1, y: 2 }
        },
        mergeWith: {
          b: { y: 3, z: 4 },
          c: 3
        }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        a: 1,
        b: { y: 3, z: 4 },
        c: 3
      });
    });

    it('should merge objects with deep strategy', async () => {
      testNode.data.operation = 'merge';
      testNode.data.mergeStrategy = 'deep';
      const inputs: NodeInputs = {
        data: {
          a: 1,
          b: { x: 1, y: 2 }
        },
        mergeWith: {
          b: { y: 3, z: 4 },
          c: 3
        }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        a: 1,
        b: { x: 1, y: 3, z: 4 },
        c: 3
      });
    });
  });

  describe('Create operation', () => {
    it('should create JSON from template', async () => {
      testNode.data.operation = 'create';
      // Note: For string variables, quotes are added automatically
      testNode.data.template = '{"name": {{name}}, "age": {{age}}}';
      const inputs: NodeInputs = {
        variables: {
          name: 'Alice',
          age: 25
        }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        name: 'Alice',
        age: 25
      });
    });

    it('should handle nested variables', async () => {
      testNode.data.operation = 'create';
      testNode.data.template = '{"user": {"profile": {{profile}}}}';
      const inputs: NodeInputs = {
        variables: {
          profile: { name: 'Bob', role: 'admin' }
        }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        user: {
          profile: {
            name: 'Bob',
            role: 'admin'
          }
        }
      });
    });
  });

  describe('Validate operation', () => {
    it('should validate valid JSON string', async () => {
      testNode.data.operation = 'validate';
      const inputs: NodeInputs = {
        data: '{"valid": "json"}'
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        isValid: true,
        data: '{"valid": "json"}',
        error: null
      });
    });

    it('should detect invalid JSON string', async () => {
      testNode.data.operation = 'validate';
      const inputs: NodeInputs = {
        data: '{"invalid": json}'
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toContain('Unexpected');
    });

    it('should validate object as valid', async () => {
      testNode.data.operation = 'validate';
      const inputs: NodeInputs = {
        data: { already: 'object' }
      };

      const result = await JSONTransformNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({
        isValid: true,
        data: { already: 'object' },
        error: null
      });
    });
  });

  describe('Error handling', () => {
    it('should throw error when no input provided', async () => {
      testNode.data.operation = 'parse';
      const inputs: NodeInputs = {};

      await expect(
        JSONTransformNode.execute(testNode, inputs, mockContext)
      ).rejects.toThrow('No input data provided');
    });

    it('should throw error for unknown operation', async () => {
      testNode.data.operation = 'unknown' as any;
      const inputs: NodeInputs = {
        data: {}
      };

      await expect(
        JSONTransformNode.execute(testNode, inputs, mockContext)
      ).rejects.toThrow('Unknown operation: unknown');
    });

    it('should throw error when jsonPath missing for extract', async () => {
      testNode.data.operation = 'extract';
      testNode.data.jsonPath = '';
      const inputs: NodeInputs = {
        data: {}
      };

      await expect(
        JSONTransformNode.execute(testNode, inputs, mockContext)
      ).rejects.toThrow('JSON path is required for extract operation');
    });
  });
});