/**
 * Graph analysis for workflow execution
 * Handles node connectivity, dependency validation, and execution order determination
 */

import type { NodeConnection, WorkflowNode } from '../../types';

export interface GraphAnalysisResult {
  executionOrder: string[];
  connectedNodes: WorkflowNode[];
  isolatedNodes: WorkflowNode[];
  validationErrors: string[];
}

export class GraphAnalyzer {
  /**
   * Analyze the workflow graph and determine execution order
   */
  static analyze(nodes: WorkflowNode[], connections: NodeConnection[]): GraphAnalysisResult {
    const analyzer = new GraphAnalyzer();
    
    // Filter connected nodes
    const { connectedNodes, isolatedNodes }: any = analyzer.filterConnectedNodes(nodes, connections);
    
    // Validate dependencies
    const validationErrors = analyzer.validateControlFlowDependencies(connectedNodes, connections);
    
    if (validationErrors.length > 0 || connectedNodes.length === 0) {
      return {
        executionOrder: [],
        connectedNodes,
        isolatedNodes,
        validationErrors
      };
    }
    
    // Determine execution order
    const executionOrder = analyzer.determineExecutionOrder(connectedNodes, connections);
    
    return {
      executionOrder,
      connectedNodes,
      isolatedNodes,
      validationErrors
    };
  }

  /**
   * Filter out unconnected nodes
   */
  private filterConnectedNodes(nodes: WorkflowNode[], connections: NodeConnection[]): {
    connectedNodes: WorkflowNode[];
    isolatedNodes: WorkflowNode[];
  } {
    const connectedNodeIds = new Set<string>();
    
    // Mark both ends of connections as connected
    connections.forEach(conn => {
      if (conn.source && conn.target) {
        connectedNodeIds.add(conn.source);
        connectedNodeIds.add(conn.target);
      }
      // Support legacy format
      if (conn.from?.nodeId && conn.to?.nodeId) {
        connectedNodeIds.add(conn.from.nodeId);
        connectedNodeIds.add(conn.to.nodeId);
      }
    });
    
    // Input nodes are always included as starting points
    nodes.forEach(node => {
      if (node.type === 'input') {
        connectedNodeIds.add(node.id);
      }
    });
    
    const connectedNodes = nodes.filter(node => connectedNodeIds.has(node.id));
    const isolatedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));
    
    return { connectedNodes, isolatedNodes };
  }

  /**
   * Validate control flow dependencies
   */
  private validateControlFlowDependencies(nodes: WorkflowNode[], connections: NodeConnection[]): string[] {
    const errors: string[] = [];
    
    const getTargetConnections = (nodeId: string) => {
      return connections.filter(conn => 
        conn.target === nodeId || conn.to?.nodeId === nodeId
      );
    };
    
    nodes.forEach(node => {
      const nodeLabel = node.data.label || node.id;
      
      switch (node.type) {
        case 'if': {
          const ifInputs = getTargetConnections(node.id);
          if (ifInputs.length === 0) {
            errors.push(`🔀 IF条件ノード "${nodeLabel}" には条件判定のための入力接続が必要です`);
          }
          break;
        }
        
        case 'while': {
          const whileInputs = getTargetConnections(node.id);
          if (whileInputs.length === 0) {
            errors.push(`🔄 WHILEループノード "${nodeLabel}" には条件判定のための入力接続が必要です`);
          }
          break;
        }
        
        case 'text_combiner': {
          const combinerInputs = getTargetConnections(node.id);
          if (combinerInputs.length < 2) {
            errors.push(`📝 テキスト結合ノード "${nodeLabel}" には少なくとも2つの入力接続が必要です (現在: ${combinerInputs.length})`);
          }
          break;
        }
        
        case 'llm': {
          const llmInputs = getTargetConnections(node.id);
          const hasSystemPrompt = node.data.systemPrompt && node.data.systemPrompt.trim();
          if (llmInputs.length === 0 && !hasSystemPrompt) {
            errors.push(`🤖 LLMノード "${nodeLabel}" にはシステムプロンプトまたは入力接続が必要です`);
          }
          break;
        }
        
        case 'output': {
          const outputInputs = getTargetConnections(node.id);
          if (outputInputs.length === 0) {
            errors.push(`📤 出力ノード "${nodeLabel}" には入力接続が必要です`);
          }
          break;
        }
      }
    });
    
    return errors;
  }

  /**
   * Determine execution order using topological sort
   */
  private determineExecutionOrder(nodes: WorkflowNode[], connections: NodeConnection[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    // Initialize graph
    nodes.forEach(node => {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    });
    
    // Build graph edges
    connections.forEach(conn => {
      let source: string | undefined;
      let target: string | undefined;
      
      // Handle both formats
      if (conn.source && conn.target) {
        source = conn.source;
        target = conn.target;
      } else if (conn.from?.nodeId && conn.to?.nodeId) {
        source = conn.from.nodeId;
        target = conn.to.nodeId;
      }
      
      if (source && target && graph.has(source) && graph.has(target)) {
        graph.get(source)!.push(target);
        inDegree.set(target, inDegree.get(target)! + 1);
      }
    });
    
    const queue: string[] = [];
    const result: string[] = [];
    
    // Prioritize input nodes
    const inputNodes = nodes.filter(node => node.type === 'input');
    inputNodes.forEach(node => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
      }
    });
    
    // Add other nodes with zero in-degree
    inDegree.forEach((degree, nodeId: any) => {
      const node = nodes.find(n => n.id === nodeId);
      if (degree === 0 && node && node.type !== 'input' && !queue.includes(nodeId)) {
        queue.push(nodeId);
      }
    });
    
    // Topological sort
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);
      
      graph.get(nodeId)!.forEach(neighbor => {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      });
    }
    
    // Check for cycles
    if (result.length !== nodes.length) {
      const unreachableNodes = nodes.filter(node => !result.includes(node.id));
      throw new Error(`ワークフローに循環参照があります。到達不可能なノード: ${unreachableNodes.map(n => n.data.label || n.id).join(', ')}`);
    }
    
    return result;
  }
}