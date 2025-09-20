import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowNode, NodeInputs, INodeExecutionContext } from '../../../types';
import ArrayOperationsNode from '../ArrayOperationsNode';

describe('ArrayOperationsNode', () => {
  let testNode: WorkflowNode;
  let mockContext: INodeExecutionContext;

  beforeEach(() => {
    testNode = {
      id: 'test-array-ops',
      type: 'array_operations',
      position: { x: 0, y: 0 },
      data: {
        operation: 'filter',
        expression: '',
        initialValue: null,
        sortOrder: 'asc',
        uniqueBy: '',
        flattenDepth: 1,
        chunkSize: 10,
        sliceStart: 0,
        sliceEnd: undefined,
        separator: ',',
        count: 1,
        value: null,
        values: [],
        rangeStart: 0,
        rangeEnd: 10,
        rangeStep: 1
      }
    };

    mockContext = {
      variables: {},
      addLog: vi.fn(),
      getVariable: vi.fn(),
      setVariable: vi.fn()
    };
  });

  describe('Filter operation', () => {
    it('should filter array with expression', async () => {
      testNode.data.operation = 'filter';
      testNode.data.expression = 'item > 5';
      const inputs: NodeInputs = {
        array: [3, 8, 2, 10, 5, 7]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([8, 10, 7]);
      expect(mockContext.addLog).toHaveBeenCalledWith(
        'success',
        'Filtered array: 6 → 3 items',
        testNode.id
      );
    });

    it('should filter objects with property expression', async () => {
      testNode.data.operation = 'filter';
      testNode.data.expression = 'item.active === true';
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
  });

  describe('Map operation', () => {
    it('should transform array elements', async () => {
      testNode.data.operation = 'map';
      testNode.data.expression = 'item * 2';
      const inputs: NodeInputs = {
        array: [1, 2, 3, 4]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([2, 4, 6, 8]);
    });

    it('should extract object properties', async () => {
      testNode.data.operation = 'map';
      testNode.data.expression = 'item.name';
      const inputs: NodeInputs = {
        array: [
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 30 }
        ]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual(['Alice', 'Bob']);
    });
  });

  describe('Reduce operation', () => {
    it('should reduce array to sum', async () => {
      testNode.data.operation = 'reduce';
      testNode.data.expression = 'acc + item';
      testNode.data.initialValue = 0;
      const inputs: NodeInputs = {
        array: [1, 2, 3, 4, 5]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toBe(15);
    });

    it('should reduce with custom initial value', async () => {
      testNode.data.operation = 'reduce';
      testNode.data.expression = 'acc + item';
      testNode.data.initialValue = 10;
      const inputs: NodeInputs = {
        array: [1, 2, 3]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toBe(16);
    });
  });

  describe('Sort operation', () => {
    it('should sort numbers ascending', async () => {
      testNode.data.operation = 'sort';
      testNode.data.sortOrder = 'asc';
      const inputs: NodeInputs = {
        array: [3, 1, 4, 1, 5, 9, 2]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([1, 1, 2, 3, 4, 5, 9]);
    });

    it('should sort numbers descending', async () => {
      testNode.data.operation = 'sort';
      testNode.data.sortOrder = 'desc';
      const inputs: NodeInputs = {
        array: [3, 1, 4, 1, 5]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([5, 4, 3, 1, 1]);
    });

    it('should sort with custom expression', async () => {
      testNode.data.operation = 'sort';
      testNode.data.expression = 'a.age - b.age';
      const inputs: NodeInputs = {
        array: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
          { name: 'Charlie', age: 35 }
        ]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([
        { name: 'Bob', age: 25 },
        { name: 'Alice', age: 30 },
        { name: 'Charlie', age: 35 }
      ]);
    });
  });

  describe('Unique operation', () => {
    it('should remove duplicate primitives', async () => {
      testNode.data.operation = 'unique';
      const inputs: NodeInputs = {
        array: [1, 2, 2, 3, 1, 4, 3]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([1, 2, 3, 4]);
    });

    it('should remove duplicates by property', async () => {
      testNode.data.operation = 'unique';
      testNode.data.uniqueBy = 'id';
      const inputs: NodeInputs = {
        array: [
          { id: 1, name: 'A' },
          { id: 2, name: 'B' },
          { id: 1, name: 'C' },
          { id: 3, name: 'D' }
        ]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'D' }
      ]);
    });
  });

  describe('Flatten operation', () => {
    it('should flatten nested array one level', async () => {
      testNode.data.operation = 'flatten';
      testNode.data.flattenDepth = 1;
      const inputs: NodeInputs = {
        array: [1, [2, 3], [4, [5, 6]]]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([1, 2, 3, 4, [5, 6]]);
    });

    it('should flatten deeply nested array', async () => {
      testNode.data.operation = 'flatten';
      testNode.data.flattenDepth = 2;
      const inputs: NodeInputs = {
        array: [1, [2, [3, [4]]]]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([1, 2, 3, [4]]);
    });
  });

  describe('Chunk operation', () => {
    it('should split array into chunks', async () => {
      testNode.data.operation = 'chunk';
      testNode.data.chunkSize = 3;
      const inputs: NodeInputs = {
        array: [1, 2, 3, 4, 5, 6, 7]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });
  });

  describe('Slice operation', () => {
    it('should slice array with start and end', async () => {
      testNode.data.operation = 'slice';
      testNode.data.sliceStart = 1;
      testNode.data.sliceEnd = 4;
      const inputs: NodeInputs = {
        array: ['a', 'b', 'c', 'd', 'e']
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual(['b', 'c', 'd']);
    });

    it('should slice from start when no end specified', async () => {
      testNode.data.operation = 'slice';
      testNode.data.sliceStart = 2;
      const inputs: NodeInputs = {
        array: [1, 2, 3, 4, 5]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([3, 4, 5]);
    });
  });

  describe('Concat operation', () => {
    it('should concatenate two arrays', async () => {
      testNode.data.operation = 'concat';
      const inputs: NodeInputs = {
        array: [1, 2, 3],
        concat: [4, 5, 6]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe('Join operation', () => {
    it('should join array to string', async () => {
      testNode.data.operation = 'join';
      testNode.data.separator = ', ';
      const inputs: NodeInputs = {
        array: ['apple', 'banana', 'orange']
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toBe('apple, banana, orange');
    });
  });

  describe('Split operation', () => {
    it('should split string to array', async () => {
      testNode.data.operation = 'split';
      testNode.data.separator = ',';
      const inputs: NodeInputs = {
        array: 'apple,banana,orange'
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual(['apple', 'banana', 'orange']);
    });
  });

  describe('Length operation', () => {
    it('should return array length', async () => {
      testNode.data.operation = 'length';
      const inputs: NodeInputs = {
        array: [1, 2, 3, 4, 5]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toBe(5);
    });
  });

  describe('First/Last operations', () => {
    it('should get first element', async () => {
      testNode.data.operation = 'first';
      testNode.data.count = 1;
      const inputs: NodeInputs = {
        array: ['a', 'b', 'c']
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toBe('a');
    });

    it('should get first N elements', async () => {
      testNode.data.operation = 'first';
      testNode.data.count = 2;
      const inputs: NodeInputs = {
        array: ['a', 'b', 'c', 'd']
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual(['a', 'b']);
    });

    it('should get last element', async () => {
      testNode.data.operation = 'last';
      testNode.data.count = 1;
      const inputs: NodeInputs = {
        array: ['a', 'b', 'c']
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toBe('c');
    });
  });

  describe('Find operation', () => {
    it('should find first matching element', async () => {
      testNode.data.operation = 'find';
      testNode.data.expression = 'item.active === true';
      const inputs: NodeInputs = {
        array: [
          { id: 1, active: false },
          { id: 2, active: true },
          { id: 3, active: true }
        ]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual({ id: 2, active: true });
    });

    it('should return null when no match found', async () => {
      testNode.data.operation = 'find';
      testNode.data.expression = 'item > 100';
      const inputs: NodeInputs = {
        array: [1, 2, 3]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toBeNull();
    });
  });

  describe('Includes operation', () => {
    it('should check if array includes value', async () => {
      testNode.data.operation = 'includes';
      testNode.data.value = 3;
      const inputs: NodeInputs = {
        array: [1, 2, 3, 4, 5]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toBe(true);
    });

    it('should return false when value not included', async () => {
      testNode.data.operation = 'includes';
      const inputs: NodeInputs = {
        array: ['a', 'b', 'c'],
        value: 'd'
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toBe(false);
    });
  });

  describe('Create operation', () => {
    it('should create array from values', async () => {
      testNode.data.operation = 'create';
      testNode.data.values = [1, 2, 3];

      const result = await ArrayOperationsNode.execute(testNode, {}, mockContext);

      expect(result).toEqual([1, 2, 3]);
    });

    it('should wrap single value in array', async () => {
      testNode.data.operation = 'create';
      const inputs: NodeInputs = {
        values: 'single'
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual(['single']);
    });
  });

  describe('Range operation', () => {
    it('should create range of numbers', async () => {
      testNode.data.operation = 'range';
      testNode.data.rangeStart = 0;
      testNode.data.rangeEnd = 5;
      testNode.data.rangeStep = 1;

      const result = await ArrayOperationsNode.execute(testNode, {}, mockContext);

      expect(result).toEqual([0, 1, 2, 3, 4]);
    });

    it('should create range with custom step', async () => {
      testNode.data.operation = 'range';
      testNode.data.rangeStart = 0;
      testNode.data.rangeEnd = 10;
      testNode.data.rangeStep = 2;

      const result = await ArrayOperationsNode.execute(testNode, {}, mockContext);

      expect(result).toEqual([0, 2, 4, 6, 8]);
    });
  });

  describe('Reverse operation', () => {
    it('should reverse array', async () => {
      testNode.data.operation = 'reverse';
      const inputs: NodeInputs = {
        array: [1, 2, 3, 4, 5]
      };

      const result = await ArrayOperationsNode.execute(testNode, inputs, mockContext);

      expect(result).toEqual([5, 4, 3, 2, 1]);
    });
  });

  describe('Error handling', () => {
    it('should throw error when input is not array', async () => {
      testNode.data.operation = 'filter';
      const inputs: NodeInputs = {
        array: 'not an array'
      };

      await expect(
        ArrayOperationsNode.execute(testNode, inputs, mockContext)
      ).rejects.toThrow('Input must be an array');
    });

    it('should throw error when expression missing', async () => {
      testNode.data.operation = 'filter';
      testNode.data.expression = '';
      const inputs: NodeInputs = {
        array: [1, 2, 3]
      };

      await expect(
        ArrayOperationsNode.execute(testNode, inputs, mockContext)
      ).rejects.toThrow('Filter expression is required');
    });

    it('should throw error for unknown operation', async () => {
      testNode.data.operation = 'unknown' as any;
      const inputs: NodeInputs = {
        array: []
      };

      await expect(
        ArrayOperationsNode.execute(testNode, inputs, mockContext)
      ).rejects.toThrow('Unknown operation: unknown');
    });
  });
});