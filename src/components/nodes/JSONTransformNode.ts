import { createNodeDefinition, NodeExecuteFunction } from './types';
import type { WorkflowNode, NodeInputs, NodeOutput, INodeExecutionContext } from '../../types';

const execute: NodeExecuteFunction = async (
  node: WorkflowNode,
  inputs: NodeInputs,
  context?: INodeExecutionContext
): Promise<NodeOutput> => {
  const { operation, jsonPath, prettyPrint, defaultValue } = node.data;
  const inputData = inputs.data || inputs.input;

  if (!inputData && operation !== 'create') {
    throw new Error('No input data provided');
  }

  context?.addLog('info', `Executing JSON ${operation} operation`, node.id);

  try {
    switch (operation) {
      case 'parse': {
        // Parse JSON string to object
        if (typeof inputData === 'string') {
          const parsed = JSON.parse(inputData);
          context?.addLog('success', 'Successfully parsed JSON string', node.id);
          return parsed;
        }
        // Already an object
        return inputData;
      }

      case 'stringify': {
        // Convert object to JSON string
        const stringified = prettyPrint
          ? JSON.stringify(inputData, null, 2)
          : JSON.stringify(inputData);
        context?.addLog('success', 'Successfully stringified object', node.id);
        return stringified;
      }

      case 'extract': {
        // Extract value using JSON path
        if (!jsonPath) {
          throw new Error('JSON path is required for extract operation');
        }

        const value = getValueByPath(inputData, jsonPath);

        if (value === undefined) {
          if (defaultValue !== undefined) {
            context?.addLog('info', `Path not found, using default value`, node.id);
            return defaultValue;
          } else {
            throw new Error(`Path "${jsonPath}" not found in JSON data`);
          }
        }

        context?.addLog('success', `Extracted value at path: ${jsonPath}`, node.id);
        return value;
      }

      case 'set': {
        // Set value at JSON path
        if (!jsonPath) {
          throw new Error('JSON path is required for set operation');
        }

        const newValue = inputs.value !== undefined ? inputs.value : defaultValue;
        if (newValue === undefined) {
          throw new Error('No value provided for set operation');
        }

        const result = setValueByPath(
          JSON.parse(JSON.stringify(inputData)), // Deep clone
          jsonPath,
          newValue
        );

        context?.addLog('success', `Set value at path: ${jsonPath}`, node.id);
        return result;
      }

      case 'delete': {
        // Delete value at JSON path
        if (!jsonPath) {
          throw new Error('JSON path is required for delete operation');
        }

        const result = deleteValueByPath(
          JSON.parse(JSON.stringify(inputData)), // Deep clone
          jsonPath
        );

        context?.addLog('success', `Deleted value at path: ${jsonPath}`, node.id);
        return result;
      }

      case 'merge': {
        // Merge two JSON objects
        const mergeWith = inputs.mergeWith || inputs.secondary;
        if (!mergeWith) {
          throw new Error('No secondary object provided for merge');
        }

        const merged = mergeObjects(inputData, mergeWith, node.data.mergeStrategy || 'shallow');
        context?.addLog('success', 'Successfully merged objects', node.id);
        return merged;
      }

      case 'create': {
        // Create new JSON object from template
        const template = node.data.template || '{}';
        const variables = inputs.variables || {};

        // Replace variables in template
        let processedTemplate = template;

        Object.entries(variables).forEach(([key, value]) => {
          const placeholder = `{{\\s*${key}\\s*}}`;

          // Case 1: Placeholder is standalone (e.g., "field": {{key}})
          const standaloneRegex = new RegExp(`(:\\s*)(${placeholder})(?=\\s*[,}\\]])`, 'g');
          processedTemplate = processedTemplate.replace(standaloneRegex, (_match: string, prefix: string) => {
            return `${prefix}${JSON.stringify(value)}`;
          });

          // Case 2: Placeholder inside a string literal ("Hello {{key}}!")
          const embeddedRegex = new RegExp(`("(?:[^"\\\\]|\\\\.)*?)(${placeholder})((?:[^"\\\\]|\\\\.)*?")`, 'g');
          processedTemplate = processedTemplate.replace(
            embeddedRegex,
            (_match: string, before: string, _placeholderMatch: string, after: string) => {
              let stringValue = String(value);
              stringValue = stringValue
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/\t/g, '\\t');
              return `${before}${stringValue}${after}`;
            }
          );

          // Case 3: Placeholder already wrapped in quotes ("{{key}}")
          const quotedValueRegex = new RegExp(`"\\s*(${placeholder})\\s*"`, 'g');
          processedTemplate = processedTemplate.replace(quotedValueRegex, (_match: string) => {
            return JSON.stringify(value);
          });
        });

        const created = JSON.parse(processedTemplate);
        context?.addLog('success', 'Successfully created JSON from template', node.id);
        return created;
      }

      case 'validate': {
        // Validate JSON structure
        const schema = inputs.schema || node.data.schema;
        if (!schema) {
          // Basic validation - just check if it's valid JSON
          if (typeof inputData === 'string') {
            try {
              JSON.parse(inputData);
              return { isValid: true, data: inputData, error: null };
            } catch (e: any) {
              return { isValid: false, data: null, error: e.message };
            }
          }
          return { isValid: true, data: inputData, error: null };
        }

        // Schema validation would go here (could integrate with AJV)
        context?.addLog('warning', 'Schema validation not yet implemented', node.id);
        return { isValid: true, data: inputData, error: null };
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error: any) {
    context?.addLog('error', `JSON operation failed: ${error.message}`, node.id);
    throw error;
  }
};

// Helper function to get value by JSON path
function getValueByPath(obj: any, path: string): any {
  const parts = path.split('.').filter(p => p);
  let current = obj;

  for (const part of parts) {
    // Handle array notation like items[0]
    const arrayMatch = part.match(/^(.+?)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, prop, index] = arrayMatch;
      current = current?.[prop]?.[parseInt(index)];
    } else {
      current = current?.[part];
    }

    if (current === undefined) {
      return undefined;
    }
  }

  return current;
}

// Helper function to set value by JSON path
function setValueByPath(obj: any, path: string, value: any): any {
  const parts = path.split('.').filter(p => p);
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    // Handle array notation
    const arrayMatch = part.match(/^(.+?)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, prop, index] = arrayMatch;
      if (!current[prop]) current[prop] = [];
      if (!current[prop][parseInt(index)]) current[prop][parseInt(index)] = {};
      current = current[prop][parseInt(index)];
    } else {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
  }

  const lastPart = parts[parts.length - 1];
  const arrayMatch = lastPart.match(/^(.+?)\[(\d+)\]$/);
  if (arrayMatch) {
    const [, prop, index] = arrayMatch;
    if (!current[prop]) current[prop] = [];
    current[prop][parseInt(index)] = value;
  } else {
    current[lastPart] = value;
  }

  return obj;
}

// Helper function to delete value by JSON path
function deleteValueByPath(obj: any, path: string): any {
  const parts = path.split('.').filter(p => p);
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];

    const arrayMatch = part.match(/^(.+?)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, prop, index] = arrayMatch;
      current = current?.[prop]?.[parseInt(index)];
    } else {
      current = current?.[part];
    }

    if (!current) return obj;
  }

  const lastPart = parts[parts.length - 1];
  const arrayMatch = lastPart.match(/^(.+?)\[(\d+)\]$/);
  if (arrayMatch) {
    const [, prop, index] = arrayMatch;
    if (current[prop] && Array.isArray(current[prop])) {
      current[prop].splice(parseInt(index), 1);
    }
  } else {
    delete current[lastPart];
  }

  return obj;
}

// Helper function to merge objects
function mergeObjects(obj1: any, obj2: any, strategy: string): any {
  if (strategy === 'deep') {
    // Deep merge
    const result = { ...obj1 };

    for (const key in obj2) {
      if (obj2.hasOwnProperty(key)) {
        if (typeof obj2[key] === 'object' && !Array.isArray(obj2[key]) && obj2[key] !== null) {
          result[key] = mergeObjects(result[key] || {}, obj2[key], 'deep');
        } else {
          result[key] = obj2[key];
        }
      }
    }

    return result;
  }

  // Shallow merge
  return { ...obj1, ...obj2 };
}

const JSONTransformNode = createNodeDefinition(
  'JSON Transform',
  '🔄',
  'purple',
  ['data', 'value', 'mergeWith', 'schema', 'variables'],
  ['output'],
  {
    operation: 'parse', // parse, stringify, extract, set, delete, merge, create, validate
    jsonPath: '',
    prettyPrint: false,
    defaultValue: null,
    mergeStrategy: 'shallow', // shallow, deep
    template: '{}'
  },
  execute,
  {
    description: 'Transform, parse, and manipulate JSON data',
    category: 'processing'
  }
);

export default JSONTransformNode;
