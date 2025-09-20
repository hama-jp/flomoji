import { createNodeDefinition, NodeExecuteFunction } from './types';
import type { WorkflowNode, NodeInputs, NodeOutput, INodeExecutionContext } from '../../types';

const execute: NodeExecuteFunction = async (
  node: WorkflowNode,
  inputs: NodeInputs,
  context?: INodeExecutionContext
): Promise<NodeOutput> => {
  const { operation, expression, initialValue, sortOrder, uniqueBy } = node.data;
  const inputArray = inputs.array || inputs.data || inputs.input;

  // Most operations require an array input
  if (!Array.isArray(inputArray) && operation !== 'create' && operation !== 'range' && operation !== 'split') {
    throw new Error('Input must be an array');
  }

  context?.addLog('info', `Executing array ${operation} operation`, node.id);

  try {
    switch (operation) {
      case 'filter': {
        // Filter array based on expression
        if (!expression) {
          throw new Error('Filter expression is required');
        }

        const filtered = inputArray.filter((item: any, index: number) => {
          try {
            // Simple expression evaluation
            return evaluateExpression(expression, { item, index, array: inputArray });
          } catch (e) {
            context?.addLog('warning', `Filter expression failed for item ${index}`, node.id);
            return false;
          }
        });

        context?.addLog('success', `Filtered array: ${inputArray.length} → ${filtered.length} items`, node.id);
        return filtered;
      }

      case 'map': {
        // Transform each element
        if (!expression) {
          throw new Error('Map expression is required');
        }

        const mapped = inputArray.map((item: any, index: number) => {
          try {
            return evaluateExpression(expression, { item, index, array: inputArray });
          } catch (e) {
            context?.addLog('warning', `Map expression failed for item ${index}`, node.id);
            return item; // Return original on error
          }
        });

        context?.addLog('success', `Mapped ${mapped.length} items`, node.id);
        return mapped;
      }

      case 'reduce': {
        // Reduce array to single value
        if (!expression) {
          throw new Error('Reduce expression is required');
        }

        const initial = initialValue !== undefined ? initialValue : 0;
        const reduced = inputArray.reduce((acc: any, item: any, index: number) => {
          try {
            return evaluateExpression(expression, { acc, item, index, array: inputArray });
          } catch (e) {
            context?.addLog('warning', `Reduce expression failed for item ${index}`, node.id);
            return acc;
          }
        }, initial);

        context?.addLog('success', 'Reduced array to single value', node.id);
        return reduced;
      }

      case 'sort': {
        // Sort array
        const sorted = [...inputArray].sort((a, b) => {
          if (expression) {
            // Custom sort expression
            try {
              return evaluateExpression(expression, { a, b });
            } catch (e) {
              return 0;
            }
          }

          // Default sort
          if (sortOrder === 'desc') {
            return b > a ? 1 : b < a ? -1 : 0;
          }
          return a > b ? 1 : a < b ? -1 : 0;
        });

        context?.addLog('success', `Sorted ${sorted.length} items`, node.id);
        return sorted;
      }

      case 'reverse': {
        // Reverse array
        const reversed = [...inputArray].reverse();
        context?.addLog('success', `Reversed ${reversed.length} items`, node.id);
        return reversed;
      }

      case 'unique': {
        // Remove duplicates
        let unique: any[];

        if (uniqueBy) {
          // Unique by property
          const seen = new Set();
          unique = inputArray.filter((item: any) => {
            const key = getValueByPath(item, uniqueBy);
            if (seen.has(key)) {
              return false;
            }
            seen.add(key);
            return true;
          });
        } else {
          // Simple unique
          unique = [...new Set(inputArray)];
        }

        context?.addLog('success', `Unique items: ${inputArray.length} → ${unique.length}`, node.id);
        return unique;
      }

      case 'flatten': {
        // Flatten nested arrays
        const depth = node.data.flattenDepth || 1;
        const flattened = flatten(inputArray, depth);
        context?.addLog('success', `Flattened array to depth ${depth}`, node.id);
        return flattened;
      }

      case 'chunk': {
        // Split array into chunks
        const size = node.data.chunkSize || 10;
        const chunks: any[][] = [];

        for (let i = 0; i < inputArray.length; i += size) {
          chunks.push(inputArray.slice(i, i + size));
        }

        context?.addLog('success', `Split into ${chunks.length} chunks of size ${size}`, node.id);
        return chunks;
      }

      case 'slice': {
        // Get array slice
        const start = node.data.sliceStart || 0;
        const end = node.data.sliceEnd;
        const sliced = inputArray.slice(start, end);
        context?.addLog('success', `Sliced array: ${sliced.length} items`, node.id);
        return sliced;
      }

      case 'concat': {
        // Concatenate arrays
        const secondArray = inputs.concat || inputs.secondary || [];
        if (!Array.isArray(secondArray)) {
          throw new Error('Secondary input must be an array for concat');
        }

        const concatenated = inputArray.concat(secondArray);
        context?.addLog('success', `Concatenated arrays: ${inputArray.length} + ${secondArray.length} = ${concatenated.length}`, node.id);
        return concatenated;
      }

      case 'join': {
        // Join array to string
        const separator = node.data.separator || ',';
        const joined = inputArray.join(separator);
        context?.addLog('success', 'Joined array to string', node.id);
        return joined;
      }

      case 'split': {
        // Split string to array
        if (typeof inputArray === 'string') {
          const separator = node.data.separator || ',';
          const split = inputArray.split(separator).map(s => s.trim());
          context?.addLog('success', `Split string into ${split.length} items`, node.id);
          return split;
        }
        throw new Error('Split operation requires string input');
      }

      case 'length': {
        // Get array length
        const length = inputArray.length;
        context?.addLog('success', `Array length: ${length}`, node.id);
        return length;
      }

      case 'first': {
        // Get first N elements
        const count = node.data.count || 1;
        const first = count === 1 ? inputArray[0] : inputArray.slice(0, count);
        context?.addLog('success', `Got first ${count} item(s)`, node.id);
        return first;
      }

      case 'last': {
        // Get last N elements
        const count = node.data.count || 1;
        const last = count === 1 ? inputArray[inputArray.length - 1] : inputArray.slice(-count);
        context?.addLog('success', `Got last ${count} item(s)`, node.id);
        return last;
      }

      case 'find': {
        // Find first matching element
        if (!expression) {
          throw new Error('Find expression is required');
        }

        const found = inputArray.find((item: any, index: number) => {
          try {
            return evaluateExpression(expression, { item, index, array: inputArray });
          } catch (e) {
            return false;
          }
        });

        if (found === undefined) {
          context?.addLog('info', 'No matching item found', node.id);
          return null;
        }

        context?.addLog('success', 'Found matching item', node.id);
        return found;
      }

      case 'includes': {
        // Check if array includes value
        const value = inputs.value || node.data.value;
        const includes = inputArray.includes(value);
        context?.addLog('success', `Array ${includes ? 'includes' : 'does not include'} value`, node.id);
        return includes;
      }

      case 'create': {
        // Create new array from values
        const values = inputs.values || node.data.values || [];
        const created = Array.isArray(values) ? values : [values];
        context?.addLog('success', `Created array with ${created.length} items`, node.id);
        return created;
      }

      case 'range': {
        // Create array of numbers
        const start = node.data.rangeStart || 0;
        const end = node.data.rangeEnd || 10;
        const step = node.data.rangeStep || 1;

        const range: number[] = [];
        for (let i = start; i < end; i += step) {
          range.push(i);
        }

        context?.addLog('success', `Created range with ${range.length} items`, node.id);
        return range;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error: any) {
    context?.addLog('error', `Array operation failed: ${error.message}`, node.id);
    throw error;
  }
};

// Safe expression evaluator using a simple DSL
function evaluateExpression(expression: string, context: any): any {
  // This is a safe expression evaluator that only supports specific operations
  // Supported operations:
  // - Comparisons: >, <, >=, <=, ==, ===, !=, !==
  // - Logical: &&, ||, !
  // - Math: +, -, *, /
  // - Property access: item.property, item['property']
  // - Simple values: numbers, strings, booleans

  const { item, index, array, acc, a, b } = context;

  // Remove whitespace
  const expr = expression.trim();

  // Don't return early for property access - we might need to compare it
  // This check is now done in evaluateSimpleValue

  // Handle simple comparisons and operations
  // Parse comparison operators
  const comparisonMatch = expr.match(/^(.+?)\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+)$/);
  if (comparisonMatch) {
    const [, left, operator, right] = comparisonMatch;
    const leftVal = evaluateSimpleValue(left, context);
    const rightVal = evaluateSimpleValue(right, context);

    switch (operator) {
      case '>': return leftVal > rightVal;
      case '<': return leftVal < rightVal;
      case '>=': return leftVal >= rightVal;
      case '<=': return leftVal <= rightVal;
      case '==': return leftVal == rightVal;
      case '===': return leftVal === rightVal;
      case '!=': return leftVal != rightVal;
      case '!==': return leftVal !== rightVal;
    }
  }

  // Handle math operations
  const mathMatch = expr.match(/^(.+?)\s*([+\-*/])\s*(.+)$/);
  if (mathMatch) {
    const [, left, operator, right] = mathMatch;
    const leftVal = evaluateSimpleValue(left, context);
    const rightVal = evaluateSimpleValue(right, context);

    switch (operator) {
      case '+': return leftVal + rightVal;
      case '-': return leftVal - rightVal;
      case '*': return leftVal * rightVal;
      case '/': return leftVal / rightVal;
    }
  }

  // Handle logical operations
  if (expr.includes('&&') || expr.includes('||')) {
    const parts = expr.split(/\s*(&&|\|\|)\s*/);
    let result = evaluateSimpleValue(parts[0], context);

    for (let i = 1; i < parts.length; i += 2) {
      const operator = parts[i];
      const nextValue = evaluateSimpleValue(parts[i + 1], context);

      if (operator === '&&') {
        result = result && nextValue;
      } else if (operator === '||') {
        result = result || nextValue;
      }
    }
    return result;
  }

  // Handle negation
  if (expr.startsWith('!')) {
    return !evaluateSimpleValue(expr.substring(1).trim(), context);
  }

  // Return simple value
  return evaluateSimpleValue(expr, context);
}

// Helper to evaluate simple values
function evaluateSimpleValue(expr: string, context: any): any {
  expr = expr.trim();

  // Direct context variable
  if (context.hasOwnProperty(expr)) {
    return context[expr];
  }

  // Property access
  if (expr.includes('.')) {
    const parts = expr.split('.');
    let value = context[parts[0]];
    for (let i = 1; i < parts.length; i++) {
      if (value && typeof value === 'object') {
        value = value[parts[i]];
      } else {
        return undefined;
      }
    }
    return value;
  }

  // Boolean literals
  if (expr === 'true') return true;
  if (expr === 'false') return false;
  if (expr === 'null') return null;
  if (expr === 'undefined') return undefined;

  // Number literal
  const num = Number(expr);
  if (!isNaN(num)) {
    return num;
  }

  // String literal (wrapped in quotes)
  if ((expr.startsWith('"') && expr.endsWith('"')) ||
      (expr.startsWith("'") && expr.endsWith("'"))) {
    return expr.slice(1, -1);
  }

  // Default to string
  return expr;
}

// Helper function to get nested property value
function getValueByPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }

  return current;
}

// Helper function to flatten array
function flatten(arr: any[], depth: number = 1): any[] {
  if (depth <= 0) return arr;

  return arr.reduce((flat, item) => {
    if (Array.isArray(item) && depth > 0) {
      return flat.concat(flatten(item, depth - 1));
    }
    return flat.concat(item);
  }, []);
}

const ArrayOperationsNode = createNodeDefinition(
  'Array Operations',
  '📊',
  'blue',
  ['array', 'value', 'concat', 'secondary', 'values'],
  ['output'],
  {
    operation: 'filter', // filter, map, reduce, sort, reverse, unique, flatten, chunk, slice, concat, join, split, length, first, last, find, includes, create, range
    expression: '',
    initialValue: null,
    sortOrder: 'asc', // asc, desc
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
  },
  execute,
  {
    description: 'Perform operations on arrays: filter, map, reduce, sort, and more',
    category: 'processing'
  }
);

export default ArrayOperationsNode;