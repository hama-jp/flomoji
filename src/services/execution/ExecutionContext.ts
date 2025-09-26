/**
 * Execution context management for workflow execution
 * Handles variables, logging, and execution state
 */

import type { DebugLogEntry, ExecutionContext as IExecutionContext } from '../../types';

import logService from '../logService';

export interface ExecutionContextOptions {
  debugMode?: boolean;
  workflowId?: string;
  inputData?: Record<string, any>;
  nodes?: WorkflowNode[];
}

export class ExecutionContext {
  private executionContext: IExecutionContext = {};
  private variables: Record<string, any> = {};
  private executionLog: DebugLogEntry[] = [];
  private debugMode: boolean = false;
  private currentRunId: string | null = null;
  private currentNodeId: string | null = null;

  constructor(options: ExecutionContextOptions = {}) {
    this.debugMode = options.debugMode || false;
    this.variables = { ...options.inputData };
    
    if (options.workflowId) {
      this.initializeRun(options.workflowId, options.inputData || {});
    }
  }

  /**
   * Initialize a new run in the log service
   */
  private async initializeRun(workflowId: string, inputData: Record<string, any>): Promise<void> {
    try {
      this.currentRunId = await logService.createRun(workflowId, inputData);
    } catch (error: any) {
      console.error('Failed to create run:', error);
    }
  }

  /**
   * Set the current executing node
   */
  setCurrentNode(nodeId: string | null): void {
    this.currentNodeId = nodeId;
  }

  /**
   * Add a log entry
   */
  addLog(level: 'info' | 'warning' | 'error' | 'debug' | 'success', message: string, nodeId: string | null = null, data: any = null): void {
    const logEntry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      nodeId: nodeId || this.currentNodeId,
      data: this.debugMode ? data : undefined,
    };

    // Keep in-memory log bounded
    if (this.executionLog.length >= 500) {
      this.executionLog = this.executionLog.slice(-400);
    }
    this.executionLog.push(logEntry);

    // Persist to log service if we have a run ID and node ID
    if (this.currentRunId && (nodeId || this.currentNodeId)) {
      const nodeLogData = {
        runId: this.currentRunId,
        nodeId: nodeId || this.currentNodeId!,
        status: level === 'error' ? 'failed' : level === 'success' ? 'completed' : 'running',
        inputs: data?.inputs || {},
        outputs: data?.result || data?.response || {},
        error: level === 'error' ? message : undefined
      };
      
      logService.addNodeLog(nodeLogData).catch(error => {
        console.error('ログ保存エラー:', error);
      });
    }
  }

  /**
   * Get a variable value
   */
  getVariable(key: string): any {
    return this.variables[key];
  }

  /**
   * Set a variable value
   */
  setVariable(key: string, value: any): void {
    this.variables[key] = value;
  }

  /**
   * Get all variables
   */
  getVariables(): Record<string, any> {
    return { ...this.variables };
  }

  /**
   * Set node execution result
   */
  setNodeResult(nodeId: string, result: any): void {
    this.executionContext[nodeId] = result;
  }

  /**
   * Get node execution result
   */
  getNodeResult(nodeId: string): any {
    return this.executionContext[nodeId];
  }

  /**
   * Get all node results
   */
  getAllNodeResults(): IExecutionContext {
    return { ...this.executionContext };
  }

  /**
   * Get execution log
   */
  getExecutionLog(): DebugLogEntry[] {
    return [...this.executionLog];
  }

  /**
   * Clear execution log
   */
  clearLog(): void {
    this.executionLog = [];
  }

  /**
   * Set debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Update run status
   */
  async updateRunStatus(status: 'completed' | 'failed' | 'stopped'): Promise<void> {
    if (this.currentRunId) {
      try {
        await logService.updateRun(this.currentRunId, { status });
      } catch (error: any) {
        console.error('Failed to update run status:', error);
      }
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.executionContext = {};
    this.variables = {};
    this.executionLog = [];
    this.currentRunId = null;
    this.currentNodeId = null;
  }
}