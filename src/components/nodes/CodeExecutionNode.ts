/**
 * CodeExecutionNode.js
 * JavaScriptコードを安全に実行するノード
 */

import codeExecutionService from '../../utils/codeExecutionService';
import { createNodeDefinition } from './types';
import type { WorkflowNode, NodeInputs, INodeExecutionContext, NodeOutput } from '../../types';

interface CodePreset {
  name: string;
  description: string;
  code: string;
}

// サンプルコードプリセット
export const CODE_PRESETS: Record<string, CodePreset> = {
  jsonFilter: {
    name: 'JSON Filter',
    description: 'Filter and transform JSON data',
    code: `// Filter and transform JSON data
const data = typeof input === 'string' ? JSON.parse(input) : input;

// Example: Filter items with price > 100
if (Array.isArray(data)) {
  return data.filter(item => item.price > 100);
}

// Or transform object
return {
  processed: true,
  itemCount: data.length || 0,
  timestamp: new Date().toISOString()
};
`
  },
  
  textProcessing: {
    name: 'Text Processing',
    description: 'Process text with regex and string methods',
    code: `// Text processing example
const text = String(input || '');

// Extract all email addresses
const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);

// Extract all URLs
const urls = text.match(/https?:\/\/[^\s]+/g);

// Extract numbers
const numbers = text.match(/\d+/g);

return {
  emails: emails || [],
  urls: urls || [],
  numbers: numbers ? numbers.map(Number) : [],
  wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
  charCount: text.length
};
`
  },
  
  dataAggregation: {
    name: 'Data Aggregation',
    description: 'Calculate statistics from numeric data',
    code: `// Aggregate numeric data
let numbers = [];

// Parse input as array of numbers
if (typeof input === 'string') {
  numbers = input.split(/[,\n\s]+/).map(Number).filter(n => !isNaN(n));
} else if (Array.isArray(input)) {
  numbers = input.map(Number).filter(n => !isNaN(n));
}

if (numbers.length === 0) {
  return { error: 'No valid numbers found' };
}

// Calculate statistics
const sum = numbers.reduce((a: any, b: any) => a + b, 0);
const avg = sum / numbers.length;
const min = Math.min(...numbers);
const max = Math.max(...numbers);
const sorted = [...numbers].sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)];

return {
  count: numbers.length,
  sum: sum,
  average: avg,
  min: min,
  max: max,
  median: median,
  values: numbers
};
`
  },
  
  dataTransform: {
    name: 'Data Transform',
    description: 'Transform data between formats',
    code: `// Transform data format

// Example: Convert CSV to JSON
if (typeof input === 'string' && input.includes(',')) {
  const lines = input.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const result = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((header, i: any) => {
      obj[header] = values[i];
    });
    return obj;
  });
  
  return result;
}

// Or transform array to object map
if (Array.isArray(input)) {
  const map = {};
  input.forEach((item, index: any) => {
    const key = item.id || item.name || index;
    map[key] = item;
  });
  return map;
}

return input;
`
  },
  
  conditionalLogic: {
    name: 'Conditional Logic',
    description: 'Complex conditional processing',
    code: `// Complex conditional logic
const data = typeof input === 'object' ? input : { value: input };
const value = data.value;
const threshold = data.threshold || 50;
const mode = data.mode || 'normal';

console.log('Processing with threshold:', threshold, 'mode:', mode);

// Multi-condition processing
let result = {
  status: 'unknown',
  value: value,
  processed: false
};

if (typeof value === 'number') {
  if (value > threshold) {
    result.status = 'high';
    result.action = 'alert';
    result.processed = true;
  } else if (value > threshold * 0.8) {
    result.status = 'warning';
    result.action = 'monitor';
    result.processed = true;
  } else {
    result.status = 'normal';
    result.action = 'none';
    result.processed = true;
  }
  
  // Apply mode modifiers
  if (mode === 'strict' && result.status !== 'normal') {
    result.priority = 'urgent';
  }
}

return result;
`
  },
  
  arrayOperations: {
    name: 'Array Operations',
    description: 'Advanced array manipulation',
    code: `// Array operations
// If input is an object with arrays, extract them
const data = typeof input === 'object' && !Array.isArray(input) ? input : { arr1: input };
const arr1 = Array.isArray(data.arr1) ? data.arr1 : [data.arr1];
const arr2 = Array.isArray(data.arr2) ? data.arr2 : [];

// Various array operations
const operations = {
  // Combine arrays
  combined: [...arr1, ...arr2],
  
  // Unique values
  unique: [...new Set([...arr1, ...arr2])],
  
  // Intersection
  intersection: arr1.filter(x => arr2.includes(x)),
  
  // Difference (arr1 - arr2)
  difference: arr1.filter(x => !arr2.includes(x)),
  
  // Flatten nested arrays
  flattened: arr1.flat(Infinity),
  
  // Group by first letter (for strings)
  grouped: arr1.reduce((acc: any, item: any) => {
    const key = String(item)[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {})
};

return operations;
`
  }
};

/**
 * コード実行ノードの実行メソッド
 */
async function executeCodeNode(
  node: WorkflowNode,
  inputs: NodeInputs,
  context?: INodeExecutionContext
): Promise<NodeOutput> {
  const { code, timeout = 5000, enableConsoleLog = true }: any = node.data;
  
  if (!code || code.trim() === '') {
    context?.addLog('warning', 'No code provided', node.id);
    return { output: null, error: 'No code to execute' };
  }
  
  context?.addLog('info', `Executing JavaScript code (timeout: ${timeout}ms)`, node.id);
  
  try {
    // コード実行 - 単一の入力を渡す
    const result = await codeExecutionService.executeCode(
      code,
      {
        input: inputs.input  // 単一の入力
      },
      context?.variables || {},
      timeout
    );
    
    // console.log 出力をログに追加
    if (enableConsoleLog && result.logs && result.logs.length > 0) {
      result.logs.forEach((log: any) => {
        context?.addLog('info', `[Console] ${log}`, node.id);
      });
    }
    
    if (result.error) {
      context?.addLog('error', `Execution error: ${result.error}`, node.id);
      return { output: null, error: result.error };
    }
    
    context?.addLog('success', 'Code executed successfully', node.id, { result: result.result });
    return { output: result.result, error: null };
    
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    context?.addLog('error', `Failed to execute code: ${errorMessage}`, node.id);
    return { output: null, error: errorMessage };
  }
}

/**
 * コード実行ノードの定義
 */
export const CodeExecutionNode = createNodeDefinition(
  'JS Code',
  '⚙️',
  'cyan',
  ['input'], // 単一の入力ポート（複数データはマージノードで結合）
  ['output', 'error'], // 出力とエラーポート
  {
    code: CODE_PRESETS.jsonFilter.code, // デフォルトはJSONフィルタのサンプル
    timeout: 5000,
    enableConsoleLog: true,
    selectedPreset: 'jsonFilter'
  },
  executeCodeNode,
  {
    description: 'Execute JavaScript code safely in an isolated environment. Access inputs via input1/2/3 and workflow variables via variables object.',
    category: 'processing',
    outputMapping: {
      output: 'output',
      error: 'error'
    }
  }
);

export default CodeExecutionNode;
