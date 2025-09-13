import type { WorkflowNode, NodeInputs, NodeOutput, ExecutionContext } from '../types';
import { errorService } from '../services/errorService';

/**
 * Node execution context interface
 */
export interface NodeExecutionContext {
  node: WorkflowNode;
  inputs: NodeInputs;
  context?: ExecutionContext;
}

/**
 * Standard node execution result
 */
export interface NodeExecutionResult<T = any> {
  output: T | null;
  error: string | null;
  metadata?: Record<string, any>;
}

/**
 * Execute a node with standard error handling and timing
 */
export async function withNodeExecution<T>(
  context: NodeExecutionContext,
  executeFn: () => Promise<T>
): Promise<NodeExecutionResult<T>> {
  const startTime = Date.now();
  
  try {
    const output = await executeFn();
    return {
      output,
      error: null,
      metadata: {
        executionTime: Date.now() - startTime,
        nodeId: context.node.id,
        nodeType: context.node.type
      }
    };
  } catch (error) {
    errorService.logError(error as Error, {
      nodeId: context.node.id,
      nodeType: context.node.type
    }, {
      category: 'execution',
      userMessage: `ノード実行エラー: ${context.node.type}`,
      retryable: true
    });
    return {
      output: null,
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        executionTime: Date.now() - startTime,
        nodeId: context.node.id,
        nodeType: context.node.type,
        failed: true
      }
    };
  }
}

/**
 * Validate required inputs for a node
 */
export function validateNodeInputs(
  inputs: NodeInputs,
  requiredInputs: string[]
): void {
  for (const required of requiredInputs) {
    if (!inputs[required]) {
      throw new Error(`Missing required input: ${required}`);
    }
  }
}

/**
 * Process node data with defaults
 */
export function processNodeData<T extends Record<string, any>>(
  data: any,
  defaults: T
): T {
  return {
    ...defaults,
    ...data
  };
}

/**
 * Format error message consistently
 */
export function formatNodeError(
  nodeType: string,
  error: unknown
): string {
  const message = error instanceof Error ? error.message : String(error);
  return `${nodeType} Node Error: ${message}`;
}

/**
 * Create a standard node output
 */
export function createNodeOutput<T = any>(
  success: boolean,
  data?: T,
  error?: string | null,
  metadata?: Record<string, any>
): NodeOutput {
  if (success) {
    return {
      output: data,
      error: null,
      ...metadata
    };
  }
  
  return {
    output: null,
    error: error || 'Unknown error',
    ...metadata
  };
}