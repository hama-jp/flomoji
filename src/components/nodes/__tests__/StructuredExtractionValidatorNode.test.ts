import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowNode, NodeInputs, INodeExecutionContext } from '../../../types';
import StructuredExtractionValidatorNode from '../StructuredExtractionValidatorNode';

describe('StructuredExtractionValidatorNode', () => {
  let testNode: WorkflowNode;
  let mockContext: INodeExecutionContext;

  beforeEach(() => {
    testNode = {
      id: 'test-validator',
      type: 'schema_validator',
      position: { x: 0, y: 0 },
      data: {
        schema: JSON.stringify({
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "email": { "type": "string", "format": "email" },
            "age": { "type": "number" }
          },
          "required": ["name", "email"]
        }),
        validationMode: 'strict',
        outputFormat: 'object',
        attemptRepair: true
      }
    };

    mockContext = {
      variables: {},
      addLog: vi.fn(),
      getVariable: vi.fn(),
      setVariable: vi.fn()
    };
  });

  describe('Valid JSON validation', () => {
    it('should validate correct JSON that matches schema', async () => {
      const inputs: NodeInputs = {
        llmResponse: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          age: 30
        })
      };

      const result = await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      });
      expect(result.error).toBeNull();
      expect(result.validationErrors).toBeNull();
    });

    it('should validate JSON object input (not string)', async () => {
      const inputs: NodeInputs = {
        llmResponse: {
          name: 'Jane Smith',
          email: 'jane@example.com'
        }
      };

      const result = await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({
        name: 'Jane Smith',
        email: 'jane@example.com'
      });
    });

    it('should handle JSON string format output', async () => {
      testNode.data.outputFormat = 'json';

      const inputs: NodeInputs = {
        llmResponse: {
          name: 'Test User',
          email: 'test@example.com'
        }
      };

      const result = await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(result.isValid).toBe(true);
      expect(typeof result.data).toBe('string');
      const parsed = JSON.parse(result.data as string);
      expect(parsed.name).toBe('Test User');
    });
  });

  describe('Invalid JSON handling', () => {
    it('should fail validation for missing required fields in strict mode', async () => {
      testNode.data.validationMode = 'strict';
      testNode.data.attemptRepair = false;

      const inputs: NodeInputs = {
        llmResponse: JSON.stringify({
          name: 'John Doe'
          // Missing required email field
        })
      };

      const result = await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toContain('required');
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors).toHaveLength(1);
    });

    it('should return invalid data in lenient mode', async () => {
      testNode.data.validationMode = 'lenient';
      testNode.data.attemptRepair = false;

      const inputs: NodeInputs = {
        llmResponse: JSON.stringify({
          name: 'John Doe'
          // Missing required email
        })
      };

      const result = await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.data).toEqual({ name: 'John Doe' }); // Returns data despite being invalid
      expect(result.error).toContain('required');
      expect(result.validationErrors).toBeDefined();
    });

    it('should handle type mismatches', async () => {
      testNode.data.attemptRepair = false;

      const inputs: NodeInputs = {
        llmResponse: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          age: '30' // String instead of number
        })
      };

      const result = await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be number');
    });
  });

  describe('JSON extraction from text', () => {
    it('should extract JSON from markdown code blocks', async () => {
      const inputs: NodeInputs = {
        llmResponse: `Here is the extracted data:
\`\`\`json
{
  "name": "Alice Brown",
  "email": "alice@example.com"
}
\`\`\`
That's the result.`
      };

      const result = await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({
        name: 'Alice Brown',
        email: 'alice@example.com'
      });
    });

    it('should extract JSON from text with prefixes', async () => {
      const inputs: NodeInputs = {
        llmResponse: `Output: {"name": "Bob Smith", "email": "bob@example.com"}`
      };

      const result = await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({
        name: 'Bob Smith',
        email: 'bob@example.com'
      });
    });

    it('should find JSON objects in mixed content', async () => {
      const inputs: NodeInputs = {
        llmResponse: `The user information is as follows: {"name": "Charlie", "email": "charlie@test.com", "age": 25}. Please process this data.`
      };

      const result = await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({
        name: 'Charlie',
        email: 'charlie@test.com',
        age: 25
      });
    });

    it('should fail when no JSON can be extracted', async () => {
      testNode.data.attemptRepair = false;

      const inputs: NodeInputs = {
        llmResponse: 'This is just plain text without any JSON content'
      };

      const result = await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toContain('Failed to parse');
    });
  });

  describe('Data repair functionality', () => {
    it('should add missing required fields with defaults', async () => {
      testNode.data.attemptRepair = true;

      const inputs: NodeInputs = {
        llmResponse: JSON.stringify({
          name: 'David Lee'
          // Missing required email
        })
      };

      const result = await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty('name', 'David Lee');
      expect(result.data).toHaveProperty('email', 'default@example.com'); // Default email for email format field
      expect(result.repairedData).toBeDefined();
      expect(result.validationErrors).toBeNull(); // Errors should be cleared after successful repair
      expect(result.error).toBeNull();
    });

    it('should coerce types when repairing', async () => {
      testNode.data.attemptRepair = true;

      const inputs: NodeInputs = {
        llmResponse: JSON.stringify({
          name: 'Emma Wilson',
          email: 'emma@example.com',
          age: '35' // String instead of number
        })
      };

      const result = await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({
        name: 'Emma Wilson',
        email: 'emma@example.com',
        age: 35 // Coerced to number
      });
      expect(result.validationErrors).toBeNull(); // Errors cleared after successful repair
      expect(result.error).toBeNull();
    });

    it('should coerce boolean values correctly', async () => {
      testNode.data.schema = JSON.stringify({
        type: 'object',
        properties: {
          active: { type: 'boolean' }
        }
      });
      testNode.data.attemptRepair = true;

      const testCases = [
        { input: 'true', expected: true },
        { input: 'false', expected: false },
        { input: '1', expected: true },
        { input: '0', expected: false },
        { input: 'yes', expected: true },
        { input: 'no', expected: false }
      ];

      for (const testCase of testCases) {
        const inputs: NodeInputs = {
          llmResponse: JSON.stringify({ active: testCase.input })
        };

        const result = await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);
        expect(result.data).toEqual({ active: testCase.expected });
      }
    });

    it('should handle arrays and objects in repair', async () => {
      testNode.data.schema = JSON.stringify({
        type: 'object',
        properties: {
          tags: { type: 'array', items: { type: 'string' } },
          metadata: { type: 'object' }
        }
      });
      testNode.data.attemptRepair = true;

      const inputs: NodeInputs = {
        llmResponse: JSON.stringify({
          tags: 'single-tag', // Should be array
          metadata: null // Should be object
        })
      };

      const result = await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(result.data).toEqual({
        tags: ['single-tag'], // Converted to array
        metadata: {} // Converted to empty object
      });
    });
  });

  describe('Schema override', () => {
    it('should use schema from input when provided', async () => {
      const customSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          value: { type: 'number' }
        },
        required: ['id']
      };

      const inputs: NodeInputs = {
        llmResponse: JSON.stringify({
          id: 'test-123',
          value: 42
        }),
        schema: JSON.stringify(customSchema)
      };

      const result = await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({
        id: 'test-123',
        value: 42
      });
    });
  });

  describe('Error handling', () => {
    it('should throw error when no LLM response is provided', async () => {
      const inputs: NodeInputs = {};

      await expect(
        StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext)
      ).rejects.toThrow('No LLM response provided for validation');
    });

    it('should throw error when no schema is provided', async () => {
      testNode.data.schema = undefined;

      const inputs: NodeInputs = {
        llmResponse: '{"test": "data"}'
      };

      await expect(
        StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext)
      ).rejects.toThrow('No JSON schema provided for validation');
    });

    it('should handle invalid schema gracefully', async () => {
      const inputs: NodeInputs = {
        llmResponse: '{"test": "data"}',
        schema: 'invalid json schema'
      };

      await expect(
        StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext)
      ).rejects.toThrow('Invalid JSON schema provided');
    });
  });

  describe('Validation error details', () => {
    it('should provide detailed validation errors', async () => {
      testNode.data.attemptRepair = false;
      testNode.data.schema = JSON.stringify({
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 3 },
          email: { type: 'string', format: 'email' },
          age: { type: 'number', minimum: 18 }
        },
        required: ['name', 'email', 'age']
      });

      const inputs: NodeInputs = {
        llmResponse: JSON.stringify({
          name: 'Jo', // Too short
          email: 'not-an-email', // Invalid format
          age: 15 // Below minimum
        })
      };

      const result = await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors.length).toBeGreaterThan(0);

      const errorPaths = result.validationErrors.map((e: any) => e.path);
      expect(errorPaths).toContain('/name');
      expect(errorPaths).toContain('/email');
      expect(errorPaths).toContain('/age');
    });
  });

  describe('Context logging', () => {
    it('should log successful validation', async () => {
      const inputs: NodeInputs = {
        llmResponse: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com'
        })
      };

      await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(mockContext.addLog).toHaveBeenCalledWith(
        'info',
        'Validating LLM response against schema',
        testNode.id
      );
      expect(mockContext.addLog).toHaveBeenCalledWith(
        'success',
        'Validation successful',
        testNode.id
      );
    });

    it('should log repair attempts', async () => {
      testNode.data.attemptRepair = true;

      const inputs: NodeInputs = {
        llmResponse: 'Not valid JSON but contains {"name": "Test", "email": "test@example.com"}'
      };

      await StructuredExtractionValidatorNode.execute(testNode, inputs, mockContext);

      expect(mockContext.addLog).toHaveBeenCalledWith(
        'warning',
        'Failed to parse response directly, attempting JSON extraction',
        testNode.id
      );
    });
  });
});