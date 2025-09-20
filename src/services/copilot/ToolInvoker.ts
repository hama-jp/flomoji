import { Node, Edge, Connection } from '@xyflow/react';
import useReactFlowStore from '../../store/reactFlowStore';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowTemplate } from '../../types/workflow';
import nodeExecutorService from '../nodeExecutionService';

interface ToolResult {
  success: boolean;
  type?: string;
  description?: string;
  data?: any;
  error?: string;
  confidence?: number;
}

export class ToolInvoker {
  private templates: WorkflowTemplate[] = [
    {
      id: 'csv-to-slack',
      name: 'CSV to Slack Notification',
      description: 'Read CSV data and send notifications to Slack',
      nodes: [
        {
          id: 'input-1',
          type: 'inputNode',
          position: { x: 100, y: 100 },
          data: { label: 'CSV Input', inputType: 'file', fileType: 'csv' },
        },
        {
          id: 'transform-1',
          type: 'dataTransformNode',
          position: { x: 300, y: 100 },
          data: { label: 'Parse CSV', transformType: 'csv-parse' },
        },
        {
          id: 'webhook-1',
          type: 'httpRequestNode',
          position: { x: 500, y: 100 },
          data: {
            label: 'Send to Slack',
            url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
            method: 'POST',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'input-1', target: 'transform-1', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e2', source: 'transform-1', target: 'webhook-1', sourceHandle: 'output', targetHandle: 'input' },
      ],
      tags: ['csv', 'slack', 'notification'],
    },
    {
      id: 'api-aggregator',
      name: 'API Data Aggregator',
      description: 'Fetch data from multiple APIs and combine results',
      nodes: [
        {
          id: 'api-1',
          type: 'httpRequestNode',
          position: { x: 100, y: 100 },
          data: { label: 'API 1', url: '', method: 'GET' },
        },
        {
          id: 'api-2',
          type: 'httpRequestNode',
          position: { x: 100, y: 200 },
          data: { label: 'API 2', url: '', method: 'GET' },
        },
        {
          id: 'combiner-1',
          type: 'textCombinerNode',
          position: { x: 300, y: 150 },
          data: { label: 'Combine Results' },
        },
      ],
      edges: [
        { id: 'e1', source: 'api-1', target: 'combiner-1', sourceHandle: 'output', targetHandle: 'input1' },
        { id: 'e2', source: 'api-2', target: 'combiner-1', sourceHandle: 'output', targetHandle: 'input2' },
      ],
      tags: ['api', 'aggregation', 'data'],
    },
  ];

  async execute(toolCall: any): Promise<ToolResult> {
    const { name, parameters } = toolCall;

    switch (name) {
      case 'add_node':
        return this.addNode(parameters);
      case 'connect_nodes':
        return this.connectNodes(parameters);
      case 'update_node':
        return this.updateNode(parameters);
      case 'delete_node':
        return this.deleteNode(parameters);
      case 'run_workflow':
        return this.runWorkflow(parameters);
      case 'fetch_template':
        return this.fetchTemplate(parameters);
      default:
        return {
          success: false,
          error: `Unknown tool: ${name}`,
        };
    }
  }

  private addNode(params: { type: string; data: any; position: { x: number; y: number } }): ToolResult {
    try {
      const nodeId = `${params.type}-${uuidv4().slice(0, 8)}`;
      const newNode: Node = {
        id: nodeId,
        type: params.type,
        position: params.position,
        data: {
          ...params.data,
          label: params.data.label || `${params.type} Node`,
        },
      };

      // We'll need to call the store method from the component
      // For now, return the data that should be applied
      return {
        success: true,
        type: 'add_node',
        description: `Add ${params.type} node`,
        data: { node: newNode },
        confidence: 0.9,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private connectNodes(params: {
    sourceId: string;
    sourceHandle: string;
    targetId: string;
    targetHandle: string;
  }): ToolResult {
    try {
      const edgeId = `edge-${uuidv4().slice(0, 8)}`;
      const newEdge: Edge = {
        id: edgeId,
        source: params.sourceId,
        sourceHandle: params.sourceHandle,
        target: params.targetId,
        targetHandle: params.targetHandle,
        type: 'default',
      };

      return {
        success: true,
        type: 'connect_nodes',
        description: `Connect ${params.sourceId} to ${params.targetId}`,
        data: { edge: newEdge },
        confidence: 0.85,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private updateNode(params: { id: string; dataPatch: any }): ToolResult {
    try {
      return {
        success: true,
        type: 'update_node',
        description: `Update node ${params.id}`,
        data: {
          nodeId: params.id,
          updates: params.dataPatch,
        },
        confidence: 0.9,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private deleteNode(params: { id: string }): ToolResult {
    try {
      return {
        success: true,
        type: 'remove_node',
        description: `Remove node ${params.id}`,
        data: {
          nodeId: params.id,
        },
        confidence: 0.75,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private async runWorkflow(params: { mode: 'preview' | 'dry-run' }): Promise<ToolResult> {
    try {
      // This would need to integrate with the execution service
      // For now, return a simulated result
      return {
        success: true,
        type: 'run_workflow',
        description: `Run workflow in ${params.mode} mode`,
        data: {
          mode: params.mode,
          results: {
            nodesExecuted: 0,
            errors: [],
            warnings: [],
          },
        },
        confidence: 0.8,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private fetchTemplate(params: { keywords?: string[] }): ToolResult {
    try {
      let results = this.templates;

      if (params.keywords && params.keywords.length > 0) {
        results = this.templates.filter(template => {
          const searchText = `${template.name} ${template.description} ${template.tags?.join(' ')}`.toLowerCase();
          return params.keywords!.some(keyword =>
            searchText.includes(keyword.toLowerCase())
          );
        });
      }

      return {
        success: true,
        type: 'fetch_template',
        description: `Found ${results.length} templates`,
        data: { templates: results },
        confidence: 0.95,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async apply(suggestion: any): Promise<void> {
    // This method would be called from a React component
    // that has access to the store
    const store = useReactFlowStore.getState();

    switch (suggestion.type) {
      case 'add_node':
        store.addNode(suggestion.data.node);
        break;

      case 'connect_nodes':
        const connection: Connection = {
          source: suggestion.data.edge.source,
          sourceHandle: suggestion.data.edge.sourceHandle,
          target: suggestion.data.edge.target,
          targetHandle: suggestion.data.edge.targetHandle,
        };
        store.onConnect(connection);
        break;

      case 'update_node':
        store.updateNodeData(suggestion.data.nodeId, suggestion.data.updates);
        break;

      case 'remove_node':
        const currentNodes = store.nodes.filter(n => n.id !== suggestion.data.nodeId);
        const currentEdges = store.edges.filter(
          e => e.source !== suggestion.data.nodeId && e.target !== suggestion.data.nodeId
        );
        store.setNodes(currentNodes);
        store.setEdges(currentEdges);
        break;

      default:
        throw new Error(`Unknown suggestion type: ${suggestion.type}`);
    }
  }

  async fetchTemplates(keywords?: string[]): Promise<WorkflowTemplate[]> {
    // In a real implementation, this would fetch from a backend or template service
    let results = this.templates;

    if (keywords && keywords.length > 0) {
      results = this.templates.filter(template => {
        const searchText = `${template.name} ${template.description} ${template.tags?.join(' ')}`.toLowerCase();
        return keywords.some(keyword =>
          searchText.includes(keyword.toLowerCase())
        );
      });
    }

    return results;
  }

  async validateWorkflow(nodes: Node[], edges: Edge[]): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for disconnected nodes
    const connectedNodeIds = new Set<string>();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    nodes.forEach(node => {
      if (!connectedNodeIds.has(node.id) && nodes.length > 1) {
        warnings.push(`Node "${node.data?.label || node.id}" is not connected to any other node`);
      }
    });

    // Check for missing required configurations
    nodes.forEach(node => {
      if (node.type === 'httpRequestNode' && !node.data?.url) {
        errors.push(`HTTP Request node "${node.data?.label || node.id}" is missing URL`);
      }

      if (node.type === 'llmNode' && !node.data?.model) {
        errors.push(`LLM node "${node.data?.label || node.id}" is missing model configuration`);
      }
    });

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCircularDependency = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          if (hasCircularDependency(edge.target)) {
            return true;
          }
        } else if (recursionStack.has(edge.target)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        if (hasCircularDependency(node.id)) {
          errors.push(`Circular dependency detected involving node "${node.data?.label || node.id}"`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}