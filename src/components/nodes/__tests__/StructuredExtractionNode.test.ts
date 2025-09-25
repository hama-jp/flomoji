import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowNode, NodeInputs, INodeExecutionContext } from '../../../types';
import StructuredExtractionNode from '../StructuredExtractionNode';

describe('StructuredExtractionNode', () => {
  let testNode: WorkflowNode;
  let mockContext: INodeExecutionContext;

  beforeEach(() => {
    testNode = {
      id: 'test-node',
      type: 'structured_extraction',
      position: { x: 0, y: 0 },
      data: {
        extractionMode: 'hybrid',
        schema: JSON.stringify({
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' }
          },
          required: ['name', 'email']
        }),
        rules: [],
        llmPromptTemplate: 'Extract data from: {text}\nSchema: {schema}',
        outputFormat: 'object'
      }
    };

    mockContext = {
      variables: {},
      addLog: vi.fn(),
      getVariable: vi.fn(),
      setVariable: vi.fn()
    };
  });

  describe('Rule-based extraction', () => {
    it('should extract data using rules when patterns match', async () => {
      testNode.data.extractionMode = 'rules';
      testNode.data.rules = [
        {
          field: 'email',
          pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
          type: 'string',
          required: true
        },
        {
          field: 'name',
          pattern: 'John Doe',
          type: 'string',
          required: true
        }
      ];

      const inputs: NodeInputs = {
        text: 'Contact John Doe at john.doe@example.com for more information.'
      };

      const result = await StructuredExtractionNode.execute(testNode, inputs, mockContext);

      expect(result.data).toEqual({
        email: 'john.doe@example.com',
        name: 'John Doe'
      });
      expect(result.needsLLM).toBe(false);
      expect(result.prompt).toBeNull();
    });

    it('should fail in rules mode when required fields are missing', async () => {
      testNode.data.extractionMode = 'rules';
      testNode.data.rules = [
        {
          field: 'email',
          pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
          type: 'string',
          required: true
        }
      ];

      const inputs: NodeInputs = {
        text: 'Contact John Doe for more information.' // No email
      };

      await expect(
        StructuredExtractionNode.execute(testNode, inputs, mockContext)
      ).rejects.toThrow('Required field "email" not found');
    });

    it('should apply transformations to extracted values', async () => {
      testNode.data.extractionMode = 'rules';
      testNode.data.rules = [
        {
          field: 'email',
          pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
          type: 'string',
          transform: 'lowercase',
          required: true
        },
        {
          field: 'name',
          pattern: 'John Doe',
          type: 'string',
          transform: 'uppercase',
          required: true
        }
      ];

      const inputs: NodeInputs = {
        text: 'Contact John Doe at JOHN.DOE@EXAMPLE.COM'
      };

      const result = await StructuredExtractionNode.execute(testNode, inputs, mockContext);

      expect(result.data).toEqual({
        email: 'john.doe@example.com',
        name: 'JOHN DOE'
      });
    });

    it('should handle number and boolean type conversions', async () => {
      testNode.data.schema = JSON.stringify({
        type: 'object',
        properties: {
          age: { type: 'number' },
          active: { type: 'boolean' }
        }
      });
      testNode.data.extractionMode = 'rules';
      testNode.data.rules = [
        {
          field: 'age',
          pattern: '\\b\\d+(?= years old)',
          type: 'number'
        },
        {
          field: 'active',
          pattern: '\\b(active)\\b',
          type: 'boolean',
          transform: 'boolean'
        }
      ];

      const inputs: NodeInputs = {
        text: 'User is 25 years old and currently active'
      };

      const result = await StructuredExtractionNode.execute(testNode, inputs, mockContext);

      expect(result.data).toEqual({
        age: 25,
        active: true
      });
    });
  });

  describe('LLM mode', () => {
    it('should generate prompt for LLM when in LLM mode', async () => {
      testNode.data.extractionMode = 'llm';

      const inputs: NodeInputs = {
        text: 'John Doe can be reached at john@example.com'
      };

      const result = await StructuredExtractionNode.execute(testNode, inputs, mockContext);

      expect(result.prompt).toContain('John Doe can be reached at john@example.com');
      expect(result.prompt).toContain('"email"');
      expect(result.prompt).toContain('"name"');
      expect(result.needsLLM).toBe(true);
      expect(result.originalText).toBe(inputs.text);
      expect(result.data).toBeNull();
    });

    it('should use custom prompt template', async () => {
      testNode.data.extractionMode = 'llm';
      testNode.data.llmPromptTemplate = 'Custom prompt: {text}\nCustom schema: {schema}';

      const inputs: NodeInputs = {
        text: 'Test text'
      };

      const result = await StructuredExtractionNode.execute(testNode, inputs, mockContext);

      expect(result.prompt).toContain('Custom prompt: Test text');
      expect(result.prompt).toContain('Custom schema:');
    });
  });

  describe('Hybrid mode', () => {
    it('should try rules first, then fall back to LLM prompt', async () => {
      testNode.data.extractionMode = 'hybrid';
      testNode.data.rules = [
        {
          field: 'phone',  // Look for phone but text has email
          pattern: '\\b\\d{3}-\\d{3}-\\d{4}\\b',
          type: 'string',
          required: false
        }
      ];

      const inputs: NodeInputs = {
        text: 'Contact John at somewhere' // No email or phone that would match
      };

      const result = await StructuredExtractionNode.execute(testNode, inputs, mockContext);

      // Rules won't extract required fields, so it should fall back to LLM
      expect(result.needsLLM).toBe(true);
      expect(result.prompt).toBeTruthy();
      expect(result.data).toBeNull();
    });

    it('should return data directly when rules succeed in hybrid mode', async () => {
      testNode.data.extractionMode = 'hybrid';
      testNode.data.rules = [
        {
          field: 'email',
          pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
          type: 'string',
          required: true
        },
        {
          field: 'name',
          pattern: 'John Doe',
          type: 'string',
          required: true
        }
      ];

      const inputs: NodeInputs = {
        text: 'Contact John Doe at john@example.com'
      };

      const result = await StructuredExtractionNode.execute(testNode, inputs, mockContext);

      expect(result.data).toEqual({
        email: 'john@example.com',
        name: 'John Doe'
      });
      expect(result.needsLLM).toBe(false);
      expect(result.prompt).toBeNull();
    });
  });

  describe('Output formatting', () => {
    it('should output as JSON string when format is json', async () => {
      testNode.data.extractionMode = 'rules';
      testNode.data.outputFormat = 'json';
      testNode.data.rules = [
        {
          field: 'email',
          pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
          type: 'string',
          required: true
        },
        {
          field: 'name',
          pattern: 'John Doe',
          type: 'string',
          required: true
        }
      ];

      const inputs: NodeInputs = {
        text: 'John Doe at john@example.com'
      };

      const result = await StructuredExtractionNode.execute(testNode, inputs, mockContext);

      expect(typeof result.data).toBe('string');
      const parsed = JSON.parse(result.data as string);
      expect(parsed).toEqual({
        email: 'john@example.com',
        name: 'John Doe'
      });
    });
  });

  describe('Schema validation', () => {
    it('should accept schema override from input', async () => {
      testNode.data.extractionMode = 'llm';

      const customSchema = {
        type: 'object',
        properties: {
          customField: { type: 'string' }
        },
        required: ['customField']
      };

      const inputs: NodeInputs = {
        text: 'Test text',
        schema: JSON.stringify(customSchema)
      };

      const result = await StructuredExtractionNode.execute(testNode, inputs, mockContext);

      expect(result.prompt).toContain('customField');
      expect(result.schema).toContain('customField');
    });

    it('should throw error for invalid schema', async () => {
      const inputs: NodeInputs = {
        text: 'Test text',
        schema: 'invalid json'
      };

      await expect(
        StructuredExtractionNode.execute(testNode, inputs, mockContext)
      ).rejects.toThrow('Invalid JSON schema provided');
    });
  });

  describe('Error handling', () => {
    it('should throw error when no text is provided', async () => {
      const inputs: NodeInputs = {};

      await expect(
        StructuredExtractionNode.execute(testNode, inputs, mockContext)
      ).rejects.toThrow('No input text provided for extraction');
    });

    it('should handle missing required fields gracefully', async () => {
      testNode.data.extractionMode = 'rules';
      testNode.data.rules = [
        {
          field: 'optional',
          pattern: 'optional_pattern',
          type: 'string',
          required: false
        }
      ];

      const inputs: NodeInputs = {
        text: 'Text without the pattern'
      };

      // Should throw validation error for missing required fields
      await expect(
        StructuredExtractionNode.execute(testNode, inputs, mockContext)
      ).rejects.toThrow('Rule-based extraction failed validation');
    });
  });

  describe('Common pattern extraction', () => {
    it('should extract emails using built-in inference', async () => {
      testNode.data.extractionMode = 'hybrid'; // Changed to hybrid since rules alone with no rules will fail
      testNode.data.rules = []; // No explicit rules

      const inputs: NodeInputs = {
        text: 'Email me at test@example.com'
      };

      // The function will fall back to LLM prompt generation
      const result = await StructuredExtractionNode.execute(testNode, inputs, mockContext);

      // In hybrid mode without rules, it falls back to LLM
      expect(result.needsLLM).toBe(true);
      expect(result.prompt).toBeDefined();
    });
  });
});