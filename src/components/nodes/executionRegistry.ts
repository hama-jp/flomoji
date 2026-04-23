import type { ExtendedNodeDefinition } from './types';

import ArrayOperationsNode from './ArrayOperationsNode';
import CodeExecutionNode from './CodeExecutionNode';
import DataTransformNode from './DataTransformNode';
import HTTPRequestNode from './HTTPRequestNode';
import IfNode from './IfNode';
import InputNode from './InputNode';
import JSONTransformNode from './JSONTransformNode';
import LLMNode from './LLMNode';
import OutputNode from './OutputNode';
import ScheduleNode from './ScheduleNode';
import StructuredExtractionNode from './StructuredExtractionNode';
import StructuredExtractionValidatorNode from './StructuredExtractionValidatorNode';
import TextCombinerNode from './TextCombinerNode';
import TimestampNode from './TimestampNode';
import VariableSetNode from './VariableSetNode';
import WebAPINode from './WebAPINode';
import WebSearchNode from './WebSearchNode';
import WhileNode from './WhileNode';
import WorkflowNode from './WorkflowNode';

// Runtime-only registry to keep the execution service's dynamic import separate
// from the UI-facing nodes index, which is statically imported across the app.
export const nodeTypes: Record<string, ExtendedNodeDefinition> = {
  input: InputNode,
  output: OutputNode,
  llm: LLMNode,
  text_combiner: TextCombinerNode,
  structured_extraction: StructuredExtractionNode,
  schema_validator: StructuredExtractionValidatorNode,
  json_transform: JSONTransformNode,
  array_operations: ArrayOperationsNode,
  data_transform: DataTransformNode,
  if: IfNode,
  while: WhileNode,
  variable_set: VariableSetNode,
  schedule: ScheduleNode,
  timestamp: TimestampNode,
  http_request: HTTPRequestNode,
  web_search: WebSearchNode,
  code_execution: CodeExecutionNode,
  web_api: WebAPINode,
  workflow: WorkflowNode,
};

export default nodeTypes;
