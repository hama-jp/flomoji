/**
 * Node Execution Service
 * Main service for workflow execution orchestration
 */

import type { DebugLogEntry, NodeConnection, NodeDefinition, NodeExecutionState, WorkflowNode, NodeInputs } from '../types';

import StorageService from './storageService';

import { ExecutionContext } from './execution/ExecutionContext';
import { GraphAnalyzer } from './execution/GraphAnalyzer';
import { NodeExecutor } from './execution/NodeExecutor';
import { DebuggerEnabledNodeExecutor } from './execution/DebuggerEnabledNodeExecutor';

export interface ExecutionGenerator {
  next(): Promise<IteratorResult<NodeExecutionState>>;
  stop(): void;
}

export class NodeExecutionService {
  private isExecuting: boolean = false;
  private executor: ExecutionGenerator | null = null;
  private context: ExecutionContext | null = null;
  private nodeTypesRegistry: Record<string, any> = {};

  /**
   * Check if execution is running
   */
  isRunning(): boolean {
    return this.isExecuting;
  }

  /**
   * Set debug mode
   */
  setDebugMode(enabled: boolean): void {
    if (this.context) {
      this.context.setDebugMode(enabled);
    }
  }

  /**
   * Get execution context (for backward compatibility)
   */
  get executionContext(): Record<string, any> {
    return this.context?.getAllNodeResults() || {};
  }

  /**
   * Get variables (for backward compatibility)
   */
  get variables(): Record<string, any> {
    return this.context?.getVariables() || {};
  }

  /**
   * Set node types registry
   */
  set nodeTypes(types: Record<string, any>) {
    this.nodeTypesRegistry = types;
  }

  /**
   * Add log entry
   */
  addLog(level: 'info' | 'warning' | 'error' | 'debug' | 'success', message: string, nodeId: string | null = null, data: any = null): void {
    if (this.context) {
      this.context.addLog(level, message, nodeId, data);
    }
  }

  /**
   * Get execution log
   */
  getExecutionLog(): DebugLogEntry[] {
    return this.context?.getExecutionLog() || [];
  }

  /**
   * Clear execution log
   */
  clearLog(): void {
    if (this.context) {
      this.context.clearLog();
    }
  }

  /**
   * Start workflow execution
   */
  async startExecution(
    nodes: WorkflowNode[],
    connections: NodeConnection[],
    inputData: NodeInputs = {},
    nodeTypes?: Record<string, any>,
    options?: {
      debugMode?: boolean;
      onDebuggerCheck?: () => boolean;
    }
  ): Promise<ExecutionGenerator> {
    if (this.isExecuting) {
      throw new Error('ワークフローが既に実行中です');
    }

    // Set node types if provided, otherwise load dynamically
    if (nodeTypes) {
      this.nodeTypesRegistry = nodeTypes;
    } else if (Object.keys(this.nodeTypesRegistry).length === 0) {
      const { nodeTypes: loadedNodeTypes } = await import('../components/nodes/index');
      this.nodeTypesRegistry = loadedNodeTypes;
    }

    // Initialize execution context
    const workflowId = StorageService.get<string>('currentWorkflowId') || 'default';
    this.context = new ExecutionContext({
      debugMode: false,
      workflowId,
      inputData,
      nodes
    });

    this.isExecuting = true;
    
    this.context.addLog('info', 'ワークフロー実行準備完了', null, {
      nodeCount: nodes.length,
      connectionCount: connections.length,
      inputData
    });

    try {
      // Analyze graph and determine execution order
      const analysis = GraphAnalyzer.analyze(nodes, connections);
      
      if (analysis.validationErrors.length > 0) {
        this.context.addLog('error', `⚠️ ワークフロー依存関係チェックに失敗しました`);
        analysis.validationErrors.forEach(error => {
          this.context!.addLog('error', error);
        });
        throw new Error(`ワークフローの依存関係エラー:\n${analysis.validationErrors.join('\n')}`);
      }
      
      if (analysis.executionOrder.length === 0) {
        throw new Error('実行可能なノードがありません。ノード間の接続を確認してください。');
      }
      
      if (analysis.isolatedNodes.length > 0) {
        this.context.addLog('warning', 
          `🔌 接続されていないノードを実行対象から除外: ${analysis.isolatedNodes.map(n => n.data.label || n.id).join(', ')}`
        );
      }
      
      this.context.addLog('info', '実行順序決定完了', null, { 
        executionOrder: analysis.executionOrder,
        connectedNodes: analysis.connectedNodes.length,
        isolatedNodes: analysis.isolatedNodes.length
      });

      // Create node executor based on options or callback
      const useDebugger = options?.debugMode ??
                          (options?.onDebuggerCheck ? options.onDebuggerCheck() : false);
      const nodeExecutor = useDebugger
        ? new DebuggerEnabledNodeExecutor(this.context, this.nodeTypesRegistry)
        : new NodeExecutor(this.context, this.nodeTypesRegistry);
      
      // Create execution generator
      let currentIndex = -1;
      const executionOrder = analysis.executionOrder;
      const context = this.context;
      const isExecutingRef = { value: true };
      const self = this; // Reference to NodeExecutionService instance
      
      this.executor = {
        async next(): Promise<IteratorResult<NodeExecutionState>> {
          if (!isExecutingRef.value) {
            context.addLog('info', '実行が外部から停止されました');
            await context.updateRunStatus('stopped');
            return { done: true, value: { status: 'stopped' } };
          }

          currentIndex++;
          if (currentIndex >= executionOrder.length) {
            isExecutingRef.value = false;
            context.addLog('success', 'ワークフロー実行完了');
            await context.updateRunStatus('completed');
            self.isExecuting = false; // Reset main execution flag
            return { 
              done: true, 
              value: { 
                status: 'completed', 
                variables: context.getVariables() 
              } 
            };
          }

          const nodeId = executionOrder[currentIndex];
          const node = nodes.find(n => n.id === nodeId);

          if (!node) {
            context.addLog('error', `ノードが見つかりません: ${nodeId}`);
            return this.next();
          }

          try {
            const result = await nodeExecutor.execute(node, nodes, connections);
            
            return {
              done: false,
              value: {
                status: 'running',
                currentNodeId: nodeId,
                variables: context.getVariables(),
                result: result
              } as any
            };
          } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            context.addLog('error', `ノード実行エラー: ${errorMessage}`, nodeId, { 
              error: error instanceof Error ? error.stack : errorMessage 
            });
            isExecutingRef.value = false;
            await context.updateRunStatus('failed');
            self.isExecuting = false; // Reset main execution flag on error
            return { 
              done: true, 
              value: { 
                status: 'error', 
                error: error instanceof Error ? error : new Error(errorMessage), 
                nodeId 
              } 
            };
          }
        },

        stop: () => {
          isExecutingRef.value = false;
          self.stopExecution();
        }
      };

      this.isExecuting = isExecutingRef.value;
      return this.executor;

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.context.addLog('error', `ワークフロー実行準備エラー: ${errorMessage}`, null, { 
        error: error instanceof Error ? error.stack : errorMessage 
      });
      this.isExecuting = false;
      await this.context.updateRunStatus('failed');
      throw error;
    }
  }

  /**
   * Stop execution
   */
  stopExecution(): void {
    if (this.isExecuting) {
      this.context?.addLog('info', 'ワークフロー実行停止が要求されました');
      this.isExecuting = false;
      this.executor = null;
      this.context?.updateRunStatus('stopped');
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Force stop any running execution
    this.isExecuting = false;
    this.executor = null;
    this.context?.cleanup();
    this.context = null;
  }

  /**
   * Reset service for testing
   * This method ensures complete state reset for test isolation
   */
  reset(): void {
    this.isExecuting = false;
    this.executor = null;
    this.context?.cleanup();
    this.context = null;
    // Reset node types to default
    this.nodeTypesRegistry = {};
  }
}

// Singleton instance
const nodeExecutionService = new NodeExecutionService();

export default nodeExecutionService;