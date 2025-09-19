/**
 * Node executor for individual node execution
 * Handles input gathering, node execution, and special node types
 */

import type { NodeConnection, NodeDefinition, WorkflowNode, INodeExecutionContext, NodeInputs, NodeOutput } from '../../types';

import llmService from '../llmService';

import { ExecutionContext } from './ExecutionContext';

export class NodeExecutor {
  protected context: ExecutionContext;
  protected nodeTypes: Record<string, any>;

  constructor(context: ExecutionContext, nodeTypes: Record<string, any>) {
    this.context = context;
    this.nodeTypes = nodeTypes;
  }

  /**
   * Execute a single node
   */
  async execute(
    node: WorkflowNode,
    nodes: WorkflowNode[],
    connections: NodeConnection[]
  ): Promise<NodeOutput> {
    this.context.setCurrentNode(node.id);
    const inputs = this.getNodeInputs(node, connections, nodes);
    
    // Check for conditional skip (from if nodes)
    if (this.shouldSkipNode(node, nodes, connections, inputs)) {
      this.context.addLog('info', `条件分岐の結果、このノードの実行をスキップします`, node.id);
      this.context.setNodeResult(node.id, null);
      return null;
    }
    
    this.context.addLog('info', `ノード実行開始: ${node.data.label || node.type}`, node.id, node.data);
    
    try {
      const result = await this.executeNodeType(node, inputs, nodes, connections);
      
      this.context.addLog('success', `ノード実行完了: ${node.data.label || node.type}`, node.id, { result });
      this.context.setNodeResult(node.id, result);
      
      return result;
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.context.addLog('error', `ノード実行エラー: ${errorMessage}`, node.id, { 
        error: error instanceof Error ? error.stack : errorMessage 
      });
      throw error;
    }
  }

  /**
   * Check if node should be skipped based on conditional inputs
   */
  private shouldSkipNode(
    node: WorkflowNode,
    nodes: WorkflowNode[],
    connections: NodeConnection[],
    inputs: Record<string, any>
  ): boolean {
    const inputConnections = connections.filter(conn => 
      conn.target === node.id || conn.to?.nodeId === node.id
    );
    
    const ifConnections = inputConnections.filter(conn => {
      const sourceNodeId = conn.source || conn.from?.nodeId;
      const sourceNode = nodes.find(n => n.id === sourceNodeId);
      return sourceNode && sourceNode.type === 'if';
    });
    
    if (ifConnections.length > 0) {
      const allInputsNull = Object.values(inputs).every(value => value === null);
      return allInputsNull;
    }
    
    return false;
  }

  /**
   * Execute node based on its type
   */
  private async executeNodeType(
    node: WorkflowNode,
    inputs: NodeInputs,
    nodes: WorkflowNode[],
    connections: NodeConnection[]
  ): Promise<NodeOutput> {
    const nodeDefinition = this.nodeTypes[node.type];
    
    // Use node definition's execute method if available
    if (nodeDefinition?.execute && node.type !== 'if' && node.type !== 'while') {
      const executionContext: INodeExecutionContext = {
        variables: this.context.getVariables(),
        addLog: this.context.addLog.bind(this.context),
        setVariable: this.context.setVariable.bind(this.context),
        getVariable: this.context.getVariable.bind(this.context)
      };
      
      return await nodeDefinition.execute(node, inputs, executionContext);
    }
    
    // Handle special control flow nodes
    switch (node.type) {
      case 'if':
        return await this.executeIfNode(node, inputs);
      case 'while':
        return await this.executeWhileNode(node, inputs, nodes, connections);
      default:
        throw new Error(`未知のノードタイプ: ${node.type}`);
    }
  }

  /**
   * Execute IF node
   */
  private async executeIfNode(node: WorkflowNode, inputs: NodeInputs): Promise<NodeOutput> {
    const inputValue = Object.values(inputs)[0];
    const { conditionType, conditionValue, comparisonOperator, useLLM }: any = node.data;
    
    let conditionMet = false;
    
    if (useLLM) {
      // LLM evaluation
      const prompt = `以下の入力を評価して、条件「${conditionValue || '真である'}」を満たすかどうかを判定してください。
      
入力: ${inputValue}
条件: ${conditionValue || '真である'}

条件を満たす場合は「true」、満たさない場合は「false」と回答してください。`;
      
      try {
        const response = await llmService.sendMessage(prompt, null);
        conditionMet = response.toLowerCase().includes('true');
        this.context.addLog('info', `LLM条件評価結果: ${conditionMet}`, node.id);
      } catch (error: any) {
        this.context.addLog('error', `LLM条件評価エラー: ${error}`, node.id);
        throw error;
      }
    } else {
      // Variable comparison
      const variableValue = this.context.getVariable(conditionValue);
      
      switch (comparisonOperator) {
        case '==':
          conditionMet = inputValue == variableValue;
          break;
        case '!=':
          conditionMet = inputValue != variableValue;
          break;
        case '>':
          conditionMet = Number(inputValue) > Number(variableValue);
          break;
        case '<':
          conditionMet = Number(inputValue) < Number(variableValue);
          break;
        case '>=':
          conditionMet = Number(inputValue) >= Number(variableValue);
          break;
        case '<=':
          conditionMet = Number(inputValue) <= Number(variableValue);
          break;
        default:
          conditionMet = false;
      }
      
      this.context.addLog('info', `変数比較: ${inputValue} ${comparisonOperator} ${variableValue} = ${conditionMet}`, node.id);
    }
    
    return { conditionMet, trueOutput: conditionMet ? inputValue : null, falseOutput: conditionMet ? null : inputValue };
  }

  /**
   * Execute WHILE node
   */
  private async executeWhileNode(
    node: WorkflowNode,
    inputs: NodeInputs,
    nodes: WorkflowNode[],
    connections: NodeConnection[]
  ): Promise<NodeOutput> {
    const { conditionType, conditionValue, maxIterations = 10 }: any = node.data;
    const inputValue = Object.values(inputs)[0];
    
    let iterations = 0;
    let currentValue = inputValue;
    const results: any[] = [];
    
    while (iterations < maxIterations) {
      let conditionMet = false;
      
      if (conditionType === 'variable') {
        const variableValue = this.context.getVariable(conditionValue);
        conditionMet = currentValue == variableValue;
      } else if (conditionType === 'llm') {
        const prompt = `評価: ${currentValue}\n条件: ${conditionValue}\n条件を満たす場合は「true」、満たさない場合は「false」と回答してください。`;
        try {
          const response = await llmService.sendMessage(prompt, null);
          conditionMet = response.toLowerCase().includes('true');
        } catch (error: any) {
          this.context.addLog('error', `LLM条件評価エラー: ${error}`, node.id);
          break;
        }
      }
      
      if (!conditionMet) break;
      
      results.push(currentValue);
      iterations++;
      
      // Get next value from loop body connection
      const loopBodyConnection = connections.find(conn => 
        (conn.source === node.id || conn.from?.nodeId === node.id) &&
        (conn.sourceHandle === 'loop' || conn.from?.portIndex === 1)
      );
      
      if (loopBodyConnection) {
        const targetNodeId = loopBodyConnection.target || loopBodyConnection.to?.nodeId;
        const targetNode = nodes.find(n => n.id === targetNodeId);
        if (targetNode) {
          currentValue = await this.execute(targetNode, nodes, connections);
        }
      }
      
      this.context.addLog('info', `ループ反復 ${iterations}/${maxIterations}`, node.id);
    }
    
    return results.length > 0 ? results[results.length - 1] : null;
  }

  /**
   * Get inputs for a node from connections
   */
  protected getNodeInputs(
    node: WorkflowNode,
    connections: NodeConnection[],
    nodes: WorkflowNode[]
  ): NodeInputs {
    const inputs: NodeInputs = {};
    const nodeDefinition = this.nodeTypes[node.type];
    const inputNames = nodeDefinition?.inputs || [];
    
    // Find connections targeting this node
    const targetConnections = connections.filter(conn => 
      conn.target === node.id || conn.to?.nodeId === node.id
    );
    
    targetConnections.forEach(conn => {
      const sourceNodeId = conn.source || conn.from?.nodeId;
      const targetHandle = conn.targetHandle || conn.to?.name || String(conn.to?.portIndex || 0);
      
      if (sourceNodeId) {
        const sourceValue = this.context.getNodeResult(sourceNodeId);
        
        // Handle special IF node outputs
        const sourceNode = nodes.find(n => n.id === sourceNodeId);
        if (sourceNode?.type === 'if' && sourceValue) {
          const ifSourceHandle = conn.sourceHandle || String(conn.from?.portIndex || 0);
          if (ifSourceHandle === '0' || ifSourceHandle === 'true') {
            inputs[targetHandle] = sourceValue.trueOutput;
          } else if (ifSourceHandle === '1' || ifSourceHandle === 'false') {
            inputs[targetHandle] = sourceValue.falseOutput;
          }
        } else {
          // Map to input name or use handle as key
          const inputName = inputNames[parseInt(targetHandle)] || targetHandle;
          inputs[inputName] = sourceValue;
        }
      }
    });
    
    return inputs;
  }
}