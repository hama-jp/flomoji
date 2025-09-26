export interface CopilotNodeInfo {
  type: string;
  name: string;
  description: string;
  category: string;
  inputs: string[];
  outputs: string[];
  icon?: string;
}

export const nodeTypes: CopilotNodeInfo[] = [
  {
    type: 'input',
    name: 'Input',
    description: 'Accepts user input, uploaded files, or static values as the workflow entry point.',
    category: 'Input/Output',
    inputs: [],
    outputs: ['output'],
    icon: '📥'
  },
  {
    type: 'output',
    name: 'Output',
    description: 'Displays or exports the final results of the workflow.',
    category: 'Input/Output',
    inputs: ['input'],
    outputs: [],
    icon: '📤'
  },
  {
    type: 'llm',
    name: 'LLM',
    description: 'Calls a configured large language model with optional system prompt and parameters.',
    category: 'AI/ML',
    inputs: ['input'],
    outputs: ['output'],
    icon: '🤖'
  },
  {
    type: 'text',
    name: 'Text',
    description: 'Provides a static text block to use elsewhere in the workflow.',
    category: 'Content',
    inputs: [],
    outputs: ['output'],
    icon: '📝'
  },
  {
    type: 'text_combiner',
    name: 'Text Combiner',
    description: 'Merges multiple text inputs into a single combined string.',
    category: 'Transform',
    inputs: ['input1', 'input2'],
    outputs: ['output'],
    icon: '🔗'
  },
  {
    type: 'structured_extraction',
    name: 'Structured Extraction',
    description: 'Extracts structured data from text using a schema definition.',
    category: 'AI/ML',
    inputs: ['input'],
    outputs: ['output', 'error'],
    icon: '📊'
  },
  {
    type: 'schema_validator',
    name: 'Schema Validator',
    description: 'Validates JSON data against a provided schema definition.',
    category: 'Validation',
    inputs: ['input'],
    outputs: ['valid', 'invalid'],
    icon: '✅'
  },
  {
    type: 'json_transform',
    name: 'JSON Transform',
    description: 'Transforms JSON structures with declarative mapping rules.',
    category: 'Transform',
    inputs: ['input'],
    outputs: ['output'],
    icon: '📋'
  },
  {
    type: 'array_operations',
    name: 'Array Operations',
    description: 'Filters, maps, or reduces arrays with configurable operations.',
    category: 'Transform',
    inputs: ['array'],
    outputs: ['output'],
    icon: '📚'
  },
  {
    type: 'data_transform',
    name: 'Data Transform',
    description: 'Applies custom data transformation logic.',
    category: 'Transform',
    inputs: ['input'],
    outputs: ['output'],
    icon: '🔄'
  },
  {
    type: 'variable_set',
    name: 'Variable Set',
    description: 'Stores a value in the workflow variable store and forwards the payload.',
    category: 'Control',
    inputs: ['input'],
    outputs: ['output'],
    icon: '💾'
  },
  {
    type: 'workflow',
    name: 'Workflow',
    description: 'Executes another workflow as a sub-process, passing inputs and receiving outputs.',
    category: 'Control',
    inputs: [],
    outputs: [],
    icon: '🌊'
  },
  {
    type: 'if',
    name: 'If Condition',
    description: 'Splits flow based on a boolean condition, exposing true/false outputs.',
    category: 'Control',
    inputs: ['condition', 'input'],
    outputs: ['true', 'false'],
    icon: '🔀'
  },
  {
    type: 'while',
    name: 'While Loop',
    description: 'Iterates while a condition stays true, exposing loop output and done handles.',
    category: 'Control',
    inputs: ['condition', 'input'],
    outputs: ['output', 'done'],
    icon: '🔁'
  },
  {
    type: 'schedule',
    name: 'Schedule',
    description: 'Triggers the workflow based on cron-like schedules.',
    category: 'Control',
    inputs: ['input'],
    outputs: ['output'],
    icon: '⏰'
  },
  {
    type: 'timestamp',
    name: 'Timestamp',
    description: 'Provides the current timestamp when executed.',
    category: 'Utility',
    inputs: [],
    outputs: ['timestamp'],
    icon: '🕐'
  },
  {
    type: 'http_request',
    name: 'HTTP Request',
    description: 'Makes HTTP calls with URL, method, and headers support.',
    category: 'External',
    inputs: ['input'],
    outputs: ['output', 'error'],
    icon: '🌐'
  },
  {
    type: 'web_api',
    name: 'Web API',
    description: 'Calls pre-configured API integrations with authentication.',
    category: 'External',
    inputs: ['input'],
    outputs: ['output', 'error'],
    icon: '🔌'
  },
  {
    type: 'web_search',
    name: 'Web Search',
    description: 'Performs web searches and returns relevant results.',
    category: 'External',
    inputs: ['query'],
    outputs: ['results'],
    icon: '🔍'
  },
  {
    type: 'code_execution',
    name: 'Code Execution',
    description: 'Executes custom JavaScript code in a sandboxed environment.',
    category: 'Advanced',
    inputs: ['input'],
    outputs: ['output', 'error'],
    icon: '💻'
  }
];

export function findNodeInfo(type: string): CopilotNodeInfo | undefined {
  return nodeTypes.find(entry => entry.type === type);
}
