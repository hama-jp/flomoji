import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createNodeDefinition, NodeExecuteFunction } from './types';
import type { WorkflowNode, NodeInputs, NodeOutput, INodeExecutionContext } from '../../types';

const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

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
    return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on' || lower === 'active';
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

  // Process based on extraction mode
  const extractionMode = data.extractionMode || 'hybrid';

  // Rule-based extraction (when we have text and rules)
  if ((extractionMode === 'rules' || extractionMode === 'hybrid') && data.rules && data.rules.length > 0) {
    context?.addLog('info', `Attempting rule-based extraction (${data.rules.length} rules)`, node.id);

    const extractedData = await extractWithRules(text, data.rules, schema);

    // Validate extracted data
    if (validate(extractedData)) {
      context?.addLog('success', 'Rule-based extraction succeeded', node.id);
      return {
        data: formatOutput(extractedData, data.outputFormat),
        prompt: null,
        needsLLM: false,
        originalText: null,
        schema: null
      };
    }

    // If rules only mode, fail here
    if (extractionMode === 'rules') {
      const errors = validate.errors ? validate.errors.map((e: any) => `${e.instancePath} ${e.message}`).join(', ') : 'Unknown validation error';
      throw new Error(`Rule-based extraction failed validation: ${errors}`);
    }

    context?.addLog('warning', 'Rule-based extraction failed validation, preparing LLM prompt', node.id);
  }

  // LLM mode or hybrid fallback - generate prompt for LLM
  if (extractionMode === 'llm' || extractionMode === 'hybrid') {
    const prompt = (data.llmPromptTemplate || defaultLLMPrompt)
      .replace('{text}', text)
      .replace('{schema}', JSON.stringify(schema, null, 2));

    context?.addLog('info', 'Generated prompt for LLM extraction', node.id, { promptLength: prompt.length });

    // Output the prompt for a downstream LLM node to process
    // The LLM response should be connected to the Schema Validator node
    return {
      data: null,
      prompt: prompt,
      needsLLM: true,
      originalText: text,
      schema: JSON.stringify(schema, null, 2)
    };
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
    // Return as string for JSON format
    return JSON.stringify(data, null, 2);
  }
  // Return as object for object format
  return data;
}

// Node definition
export const StructuredExtractionNode = createNodeDefinition(
  'Structured Extraction',
  '📄',
  'purple',
  ['text', 'schema'],
  ['data', 'prompt', 'needsLLM', 'originalText', 'schema'],
  {
    extractionMode: 'hybrid',
    schema: defaultSchema,
    rules: [],
    llmPromptTemplate: defaultLLMPrompt,
    outputFormat: 'object'
  },
  execute,
  {
    description: 'Extract structured data from text using rules or generate prompts for LLM extraction. For LLM mode, connect prompt output to LLM node, then LLM response to Schema Validator node.',
    category: 'processing',
    outputMapping: {
      'data': 'data',
      'prompt': 'prompt',
      'needsLLM': 'needsLLM',
      'originalText': 'originalText',
      'schema': 'schema'
    }
  }
);

export default StructuredExtractionNode;