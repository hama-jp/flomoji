import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createNodeDefinition, NodeExecuteFunction } from './types';
import type { WorkflowNode, NodeInputs, NodeOutput, INodeExecutionContext } from '../../types';

const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

// Cache for compiled schemas
const schemaCache = new Map<string, any>();

// Execute function for the validator node
const execute: NodeExecuteFunction = async (node: WorkflowNode, inputs: NodeInputs, context?: INodeExecutionContext): Promise<NodeOutput> => {
  const data = node.data;

  // Required inputs
  const llmResponse = inputs.llmResponse;
  const schema = inputs.schema || data.schema;
  const originalText = inputs.originalText; // Optional, for context

  if (!llmResponse) {
    throw new Error('No LLM response provided for validation');
  }

  if (!schema) {
    throw new Error('No JSON schema provided for validation');
  }

  // Parse schema if it's a string
  let parsedSchema;
  try {
    parsedSchema = typeof schema === 'string' ? JSON.parse(schema) : schema;
  } catch (error) {
    throw new Error('Invalid JSON schema provided');
  }

  // Use cached validator if available
  const schemaKey = JSON.stringify(parsedSchema);
  let validate = schemaCache.get(schemaKey);
  if (!validate) {
    validate = ajv.compile(parsedSchema);
    schemaCache.set(schemaKey, validate);
  }

  const validationMode = data.validationMode || 'strict';
  const outputFormat = data.outputFormat || 'object';
  const attemptRepair = data.attemptRepair || false;

  context?.addLog('info', 'Validating LLM response against schema', node.id);

  let extractedData;

  try {
    // Parse the LLM response
    extractedData = typeof llmResponse === 'string' ? JSON.parse(llmResponse) : llmResponse;
  } catch (parseError: any) {
    // If JSON parsing fails, attempt to extract JSON from text
    if (attemptRepair && typeof llmResponse === 'string') {
      context?.addLog('warning', 'Failed to parse response directly, attempting JSON extraction', node.id);
      extractedData = attemptJsonExtraction(llmResponse);

      if (!extractedData) {
        return {
          data: null,
          isValid: false,
          error: `Failed to parse LLM response as JSON: ${parseError.message}`,
          validationErrors: null,
          repairedData: null
        };
      }
    } else {
      return {
        data: null,
        isValid: false,
        error: `Failed to parse LLM response as JSON: ${parseError.message}`,
        validationErrors: null,
        repairedData: null
      };
    }
  }

  // Validate against schema
  const isValid = validate(extractedData);

  if (isValid) {
    context?.addLog('success', 'Validation successful', node.id);
    return {
      data: formatOutput(extractedData, outputFormat),
      isValid: true,
      error: null,
      validationErrors: null,
      repairedData: null
    };
  }

  // Validation failed
  const errors = validate.errors ? validate.errors.map((e: any) => ({
    path: e.instancePath,
    message: e.message,
    keyword: e.keyword,
    params: e.params
  })) : [];

  const errorMessage = errors.map((e: any) => `${e.path} ${e.message}`).join(', ');

  context?.addLog('warning', `Validation failed: ${errorMessage}`, node.id);

  // Attempt to repair if enabled
  let repairedData = null;
  if (attemptRepair) {
    repairedData = attemptDataRepair(extractedData, parsedSchema, errors);

    if (repairedData && validate(repairedData)) {
      context?.addLog('success', 'Successfully repaired data to match schema', node.id);
      return {
        data: formatOutput(repairedData, outputFormat),
        isValid: true,
        error: null,
        validationErrors: null,  // Clear errors after successful repair
        repairedData: formatOutput(repairedData, outputFormat)
      };
    }
  }

  // Return based on validation mode
  if (validationMode === 'lenient') {
    context?.addLog('info', 'Returning invalid data in lenient mode', node.id);
    return {
      data: formatOutput(extractedData, outputFormat),
      isValid: false,
      error: errorMessage,
      validationErrors: errors,
      repairedData: repairedData ? formatOutput(repairedData, outputFormat) : null
    };
  }

  // Strict mode - return error
  return {
    data: null,
    isValid: false,
    error: errorMessage,
    validationErrors: errors,
    repairedData: repairedData ? formatOutput(repairedData, outputFormat) : null
  };
};

// Helper function to extract JSON from text that may contain other content
function attemptJsonExtraction(text: string): any {
  // Try to find JSON-like content in the text
  const patterns = [
    /\{[\s\S]*\}/,  // Object pattern
    /\[[\s\S]*\]/   // Array pattern
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // Continue to next pattern
      }
    }
  }

  // Try to find JSON after common prefixes
  const prefixes = ['```json', '```', 'JSON:', 'Output:', 'Result:'];
  for (const prefix of prefixes) {
    const index = text.indexOf(prefix);
    if (index !== -1) {
      const jsonStart = text.substring(index + prefix.length).trim();
      const endIndex = jsonStart.indexOf('```');
      const jsonText = endIndex !== -1 ? jsonStart.substring(0, endIndex) : jsonStart;

      try {
        return JSON.parse(jsonText);
      } catch {
        // Continue to next prefix
      }
    }
  }

  return null;
}

// Helper function to attempt data repair based on schema
function attemptDataRepair(data: any, schema: any, errors: any[]): any {
  const repaired = JSON.parse(JSON.stringify(data)); // Deep clone

  // Add missing required fields with default values
  if (schema.required && Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!(field in repaired)) {
        const fieldSchema = schema.properties?.[field];
        if (fieldSchema) {
          repaired[field] = getDefaultValue(fieldSchema);
        }
      }
    }
  }

  // Fix type mismatches
  for (const error of errors) {
    if (error.keyword === 'type' && error.path) {
      const path = error.path.replace(/^\//, '').split('/');
      const fieldSchema = getSchemaAtPath(schema, path);
      if (fieldSchema) {
        setValueAtPath(repaired, path, coerceToType(getValueAtPath(repaired, path), fieldSchema.type));
      }
    }
  }

  return repaired;
}

// Helper function to get default value for a schema type
function getDefaultValue(schema: any): any {
  switch (schema.type) {
    case 'string':
      // For email format, provide a valid default email
      if (schema.format === 'email') {
        return schema.default || 'default@example.com';
      }
      return schema.default || '';
    case 'number':
    case 'integer':
      return schema.default || 0;
    case 'boolean':
      return schema.default || false;
    case 'array':
      return schema.default || [];
    case 'object':
      return schema.default || {};
    default:
      return null;
  }
}

// Helper function to coerce value to type
function coerceToType(value: any, type: string): any {
  switch (type) {
    case 'string':
      return String(value);
    case 'number':
    case 'integer':
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    case 'boolean':
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        return lower === 'true' || lower === '1' || lower === 'yes';
      }
      return Boolean(value);
    case 'array':
      return Array.isArray(value) ? value : [value];
    case 'object':
      return typeof value === 'object' && value !== null ? value : {};
    default:
      return value;
  }
}

// Helper function to get schema at path
function getSchemaAtPath(schema: any, path: string[]): any {
  let current = schema;
  for (const segment of path) {
    if (current.properties && current.properties[segment]) {
      current = current.properties[segment];
    } else if (current.items) {
      current = current.items;
    } else {
      return null;
    }
  }
  return current;
}

// Helper function to get value at path
function getValueAtPath(obj: any, path: string[]): any {
  let current = obj;
  for (const segment of path) {
    if (current && typeof current === 'object') {
      current = current[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

// Helper function to set value at path
function setValueAtPath(obj: any, path: string[], value: any): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];
    if (!current[segment] || typeof current[segment] !== 'object') {
      current[segment] = {};
    }
    current = current[segment];
  }
  if (path.length > 0) {
    current[path[path.length - 1]] = value;
  }
}

// Helper function to format output
function formatOutput(data: any, format: string): any {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }
  return data;
}

// Node definition
export const StructuredExtractionValidatorNode = createNodeDefinition(
  'Schema Validator',
  '✅',
  'green',
  ['llmResponse', 'schema', 'originalText'],
  ['data', 'isValid', 'error', 'validationErrors', 'repairedData'],
  {
    schema: JSON.stringify({
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string", "format": "email" }
      },
      "required": ["name", "email"]
    }, null, 2),
    validationMode: 'strict', // 'strict' or 'lenient'
    outputFormat: 'object', // 'json' or 'object'
    attemptRepair: true // Try to repair invalid data
  },
  execute,
  {
    description: 'Validates LLM responses against JSON Schema and attempts to repair invalid data. Part of the structured extraction pipeline.',
    category: 'processing',
    outputMapping: {
      'data': 'data',
      'isValid': 'isValid',
      'error': 'error',
      'validationErrors': 'validationErrors',
      'repairedData': 'repairedData'
    }
  }
);

export default StructuredExtractionValidatorNode;