import Ajv from 'ajv';
import { createNodeDefinition, NodeExecuteFunction } from './types';
import type { WorkflowNode, NodeInputs, NodeOutput, INodeExecutionContext } from '../../types';

const ajv = new Ajv({ allErrors: true, verbose: true });

// Cache for compiled schemas
const schemaCache = new Map<string, any>();

interface ExtractionRule {
  field: string;
  pattern: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
  transform?: 'trim' | 'lowercase' | 'uppercase' | 'number' | 'boolean' | 'json';
}

const defaultSchema = JSON.stringify({
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "email": { "type": "string", "format": "email" },
    "phone": { "type": "string" },
    "date": { "type": "string", "format": "date" }
  },
  "required": ["name", "email"]
}, null, 2);

const defaultLLMPrompt = `Extract structured data from the following text according to the provided JSON schema.
Return ONLY valid JSON that matches the schema, nothing else.

Text: {text}

Schema: {schema}

Extracted JSON:`;

// Helper function to parse boolean values consistently
function parseBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
  }
  return Boolean(value);
}

// Execute function for the node
const execute: NodeExecuteFunction = async (node: WorkflowNode, inputs: NodeInputs, context?: INodeExecutionContext): Promise<NodeOutput> => {
  const data = node.data;
  const text = inputs.text || '';
  const schemaOverride = inputs.schema || data.schema;

  if (!text) {
    throw new Error('No input text provided for extraction');
  }

  let schema;
  try {
    schema = typeof schemaOverride === 'string' ? JSON.parse(schemaOverride) : schemaOverride;
  } catch (error) {
    throw new Error('Invalid JSON schema provided');
  }

  // Use cached validator if available
  const schemaKey = JSON.stringify(schema);
  let validate = schemaCache.get(schemaKey);
  if (!validate) {
    validate = ajv.compile(schema);
    schemaCache.set(schemaKey, validate);
  }
  let extractedData = {};
  let retryCount = 0;
  const maxRetries = data.maxRetries || 3;

  // Rule-based extraction
  if (data.extractionMode === 'rules' || data.extractionMode === 'hybrid') {
    extractedData = await extractWithRules(text, data.rules || [], schema);

    // Validate extracted data
    if (validate(extractedData)) {
      return formatOutput(extractedData, data.outputFormat);
    }

    // If hybrid mode and rules failed, fall back to LLM
    if (data.extractionMode !== 'hybrid') {
      const errors = validate.errors ? validate.errors.map((e: any) => `${e.instancePath} ${e.message}`).join(', ') : 'Unknown validation error';
      throw new Error(`Rule-based extraction failed validation: ${errors}`);
    }
  }

  // LLM-based extraction (or hybrid fallback)
  if (data.extractionMode === 'llm' || data.extractionMode === 'hybrid') {
    // Retry loop for LLM extraction
    while (retryCount < maxRetries) {
      // Check if there's an LLM input connection
      if (inputs.llmResponse) {
        // If we have a direct LLM response, try to parse it
        try {
          extractedData = typeof inputs.llmResponse === 'string'
            ? JSON.parse(inputs.llmResponse)
            : inputs.llmResponse;

          if (validate(extractedData)) {
            return formatOutput(extractedData, data.outputFormat);
          }

          // Validation failed, increment retry count
          retryCount++;
          if (retryCount < maxRetries) {
            context?.addLog('warning', `Extraction validation failed, retry ${retryCount}/${maxRetries}`, node.id, {
              errors: validate.errors
            });
          }
        } catch (error) {
          retryCount++;
          if (retryCount < maxRetries) {
            context?.addLog('warning', `Failed to parse LLM response, retry ${retryCount}/${maxRetries}`, node.id, {
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      } else {
        // No LLM response yet, exit retry loop to generate prompt
        break;
      }
    }

    // If no direct LLM input, construct prompt for upstream LLM node
    if (!inputs.llmResponse) {
      const prompt = (data.llmPromptTemplate || defaultLLMPrompt)
        .replace('{text}', text)
        .replace('{schema}', JSON.stringify(schema, null, 2));

      // Return prompt for upstream LLM node to process
      return {
        needsLLM: true,
        prompt: prompt,
        originalText: text,
        schema: schema
      };
    }

    // If we reach here, LLM response failed validation
    const errors = validate.errors ? validate.errors.map((e: any) => `${e.instancePath} ${e.message}`).join(', ') : 'Unknown validation error';

    if (data.validationMode === 'lenient') {
      // In lenient mode, return partial data even if validation fails
      return formatOutput(extractedData, data.outputFormat);
    }

    throw new Error(`LLM extraction failed validation after ${retryCount} retries: ${errors}`);
  }

  throw new Error('No valid extraction mode configured');
};

// Helper function for rule-based extraction
async function extractWithRules(text: string, rules: ExtractionRule[], schema: any): Promise<any> {
  const result: any = {};

  for (const rule of rules) {
    if (!rule.field || !rule.pattern) continue;

    try {
      const regex = new RegExp(rule.pattern, 'gmi');
      const matches = text.match(regex);

      if (matches && matches.length > 0) {
        let value: any = matches[0];

        // Apply transformation if specified
        if (rule.transform) {
          switch (rule.transform) {
            case 'trim':
              value = value.trim();
              break;
            case 'lowercase':
              value = value.toLowerCase();
              break;
            case 'uppercase':
              value = value.toUpperCase();
              break;
            case 'number':
              value = parseFloat(value);
              break;
            case 'boolean':
              value = parseBoolean(value);
              break;
            case 'json':
              try {
                value = JSON.parse(value);
              } catch {
                // Keep as string if JSON parse fails
              }
              break;
          }
        }

        // Convert to appropriate type
        switch (rule.type) {
          case 'number':
            result[rule.field] = parseFloat(value);
            break;
          case 'boolean':
            result[rule.field] = parseBoolean(value);
            break;
          case 'array':
            result[rule.field] = Array.isArray(value) ? value : [value];
            break;
          default:
            result[rule.field] = String(value);
        }
      } else if (rule.required) {
        throw new Error(`Required field "${rule.field}" not found`);
      }
    } catch (error: any) {
      console.error(`Error extracting field "${rule.field}":`, error);
      if (rule.required) {
        throw error;
      }
    }
  }

  // Add default values for schema required fields not found in rules
  if (schema.required && Array.isArray(schema.required)) {
    for (const requiredField of schema.required) {
      if (!(requiredField in result)) {
        // Try to infer from text using simple heuristics
        result[requiredField] = inferFieldFromText(text, requiredField, schema.properties?.[requiredField]);
      }
    }
  }

  return result;
}

// Helper function to infer field values from text
function inferFieldFromText(text: string, fieldName: string, fieldSchema?: any): any {
  const lowerFieldName = fieldName.toLowerCase();

  // Common patterns for different field types
  const patterns: Record<string, RegExp> = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    phone: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/,
    date: /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b|\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/,
    url: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
    name: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/,
    number: /\b\d+(\.\d+)?\b/,
    currency: /\$?\d+(\.\d{2})?|\b\d+(\.\d{2})?\s?(USD|EUR|GBP|JPY)\b/i
  };

  // Check field schema format hint
  if (fieldSchema?.format && patterns[fieldSchema.format]) {
    const match = text.match(patterns[fieldSchema.format]);
    if (match) return match[0];
  }

  // Check by field name
  if (lowerFieldName.includes('email') && patterns.email) {
    const match = text.match(patterns.email);
    if (match) return match[0];
  }

  if ((lowerFieldName.includes('phone') || lowerFieldName.includes('tel')) && patterns.phone) {
    const match = text.match(patterns.phone);
    if (match) return match[0];
  }

  if (lowerFieldName.includes('date') && patterns.date) {
    const match = text.match(patterns.date);
    if (match) return match[0];
  }

  if (lowerFieldName.includes('name') && patterns.name) {
    const match = text.match(patterns.name);
    if (match) return match[0];
  }

  if ((lowerFieldName.includes('url') || lowerFieldName.includes('link')) && patterns.url) {
    const match = text.match(patterns.url);
    if (match) return match[0];
  }

  // Return null for fields we couldn't infer
  return null;
}

// Helper function to format output
function formatOutput(data: any, format: string): any {
  if (format === 'json') {
    // Return as object with data property for consistency
    return { data: JSON.stringify(data, null, 2) };
  }
  return { data };
}

// Node definition
export const StructuredExtractionNode = createNodeDefinition(
  'Structured Extraction',
  '📄',
  'purple',
  ['text', 'schema', 'llmResponse'],
  ['data', 'error', 'needsLLM', 'prompt'],
  {
    extractionMode: 'hybrid',
    schema: defaultSchema,
    rules: [],
    llmPromptTemplate: defaultLLMPrompt,
    maxRetries: 3,
    validationMode: 'strict',
    outputFormat: 'json'
  },
  execute,
  {
    description: 'Extract structured data from unstructured text using JSON Schema validation with rule-based or LLM extraction',
    category: 'processing'
  }
);

export default StructuredExtractionNode;