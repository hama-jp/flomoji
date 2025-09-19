/**
 * Debugger-enabled Node Executor
 * Extends NodeExecutor with debugging capabilities
 */

import { NodeExecutor } from './NodeExecutor';
import { ExecutionContext } from './ExecutionContext';
import { useDebuggerStore } from '../../store/debuggerStore';
import type { NodeConnection, WorkflowNode, NodeOutput } from '../../types';
import jexl from 'jexl';

export class DebuggerEnabledNodeExecutor extends NodeExecutor {
  private startTime: number = 0;

  constructor(context: ExecutionContext, nodeTypes: Record<string, any>) {
    super(context, nodeTypes);
  }

  private getDebuggerStore() {
    return useDebuggerStore.getState();
  }

  /**
   * Execute a single node with debugging support
   */
  async execute(
    node: WorkflowNode,
    nodes: WorkflowNode[],
    connections: NodeConnection[]
  ): Promise<NodeOutput> {
    const debugMode = this.getDebuggerStore().debugMode;

    // If debugger is off, use parent implementation
    if (debugMode === 'off') {
      return super.execute(node, nodes, connections);
    }

    // Pre-execution debugging
    await this.handlePreExecution(node, nodes, connections);

    this.startTime = performance.now();

    try {
      // Execute the node
      const result = await super.execute(node, nodes, connections);

      // Post-execution debugging
      await this.handlePostExecution(node, result, null);

      return result;
    } catch (error) {
      // Handle execution error in debugger
      await this.handlePostExecution(node, null, error);
      throw error;
    }
  }

  /**
   * Handle pre-execution debugging tasks
   */
  private async handlePreExecution(
    node: WorkflowNode,
    nodes: WorkflowNode[],
    connections: NodeConnection[]
  ): Promise<void> {
    const store = this.getDebuggerStore();
    const { debugMode, breakpoints, setCurrentNode, abortController } = store;

    // Check if execution was aborted
    if (abortController?.signal.aborted) {
      throw new Error('Execution aborted');
    }

    // Set current node
    setCurrentNode(node.id);

    // Check for breakpoints
    if (debugMode === 'breakpoint') {
      const breakpoint = breakpoints.get(node.id);
      if (breakpoint?.enabled) {
        // Check condition if exists
        if (breakpoint.condition) {
          try {
            const shouldBreak = this.evaluateBreakpointCondition(
              breakpoint.condition,
              node,
              nodes,
              connections
            );
            if (shouldBreak) {
              await this.pauseExecution();
            }
          } catch (e) {
            console.error('Breakpoint condition evaluation failed:', e);
          }
        } else {
          await this.pauseExecution();
        }
      }
    }

    // Handle step mode - always pause at each node
    if (debugMode === 'step') {
      await this.pauseExecution();
    }

    // Handle slow mode
    if (debugMode === 'slow') {
      const { executionSpeed } = this.getDebuggerStore();
      await this.sleep(executionSpeed);
    }

    // Add data flow visualization
    this.trackDataFlow(node, connections, nodes);
  }

  /**
   * Handle post-execution debugging tasks
   */
  private async handlePostExecution(
    node: WorkflowNode,
    result: NodeOutput,
    error: any
  ): Promise<void> {
    const duration = performance.now() - this.startTime;
    const { addExecutionStep, updateWatchVariable, watchVariables } = this.getDebuggerStore();

    // Get node inputs from context (to avoid infinite recursion)
    const inputs = node.data || {};

    // Add execution step to history
    addExecutionStep({
      nodeId: node.id,
      timestamp: Date.now(),
      inputs,
      outputs: result || {},
      error: error ? (error.message || String(error)) : undefined,
      duration: Math.round(duration)
    });

    // Update watch variables
    this.updateWatchVariables(node, result);
  }

  /**
   * Pause execution and wait for user to continue
   */
  private async pauseExecution(): Promise<void> {
    const { setExecutionStatus, abortController } = this.getDebuggerStore();
    setExecutionStatus('paused');

    // Wait for execution to resume (either by play button or step button) or abort
    await new Promise<void>((resolve, reject) => {
      // Check if already aborted
      if (abortController?.signal.aborted) {
        reject(new Error('Execution aborted'));
        return;
      }

      // Set up abort listener
      const abortHandler = () => {
        unsubscribe();
        reject(new Error('Execution aborted'));
      };

      abortController?.signal.addEventListener('abort', abortHandler);

      const unsubscribe = useDebuggerStore.subscribe((state) => {
        if (state.executionStatus === 'running' || state.shouldStepForward) {
          // If stepping forward, reset the flag
          if (state.shouldStepForward) {
            useDebuggerStore.setState({ shouldStepForward: false });
          }
          abortController?.signal.removeEventListener('abort', abortHandler);
          unsubscribe();
          resolve();
        }
      });
    });
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Evaluate breakpoint condition safely using JEXL
   */
  private evaluateBreakpointCondition(
    condition: string,
    node: WorkflowNode,
    nodes: WorkflowNode[],
    connections: NodeConnection[]
  ): boolean {
    try {
      // Create a safe evaluation context
      const context = {
        node,
        nodes,
        connections,
        nodeData: node.data,
        nodeType: node.type,
        nodeId: node.id,
        variables: this.context.getVariables()
      };

      // Use JEXL for safe expression evaluation - no arbitrary code execution
      const expression = jexl.compile(condition);
      const result = expression.evalSync(context);

      return Boolean(result);
    } catch (e) {
      console.error('Failed to evaluate breakpoint condition:', e);
      return false;
    }
  }

  /**
   * Track data flow between nodes
   */
  private trackDataFlow(
    targetNode: WorkflowNode,
    connections: NodeConnection[],
    nodes: WorkflowNode[]
  ): void {
    const { addDataFlow } = this.getDebuggerStore();

    // Find incoming connections
    const incomingConnections = connections.filter(
      conn => conn.target === targetNode.id || conn.to?.nodeId === targetNode.id
    );

    incomingConnections.forEach(conn => {
      const sourceNodeId = conn.source || conn.from?.nodeId;
      if (sourceNodeId) {
        const sourceNode = nodes.find(n => n.id === sourceNodeId);
        if (sourceNode) {
          const sourceResult = this.context.getNodeResult(sourceNodeId);

          addDataFlow({
            sourceNodeId,
            targetNodeId: targetNode.id,
            data: sourceResult,
            timestamp: Date.now()
          });
        }
      }
    });
  }

  /**
   * Update watch variables based on node execution
   */
  private updateWatchVariables(node: WorkflowNode, result: NodeOutput): void {
    const { watchVariables, updateWatchVariable } = this.getDebuggerStore();

    watchVariables.forEach(watchVar => {
      try {
        let value: any;

        // Parse the watch path
        if (watchVar.path.startsWith('node.')) {
          // Watch node-specific data
          const path = watchVar.path.substring(5);
          if (path === 'result') {
            value = result;
          } else if (path.startsWith('data.')) {
            const dataPath = path.substring(5);
            value = this.getNestedValue(node.data, dataPath);
          }
        } else if (watchVar.path.startsWith('variable.')) {
          // Watch global variables
          const varName = watchVar.path.substring(9);
          value = this.context.getVariable(varName);
        } else if (watchVar.path === 'result') {
          // Direct result watch
          value = result;
        }

        updateWatchVariable(watchVar.id, value);
      } catch (e) {
        console.error(`Failed to update watch variable ${watchVar.name}:`, e);
      }
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

}

export default DebuggerEnabledNodeExecutor;