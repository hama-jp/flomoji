import { Node, Edge, Connection } from '@xyflow/react';
import useReactFlowStore from '../../store/reactFlowStore';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowTemplate } from '../../types/workflow';
import { NodeExecutionService } from '../nodeExecutionService';
import workflowManagerService from '../workflowManagerService';
import { NodeInputs } from '../../types';
import { nodeTypes as copilotNodeCatalog } from '../../constants/nodeTypes';
import componentNodeDefinitions from '../../components/nodes';

interface ToolResult {
  success: boolean;
  type?: string;
  description?: string;
  data?: any;
  error?: string;
  confidence?: number;
}

type NodeHandleInfo = {
  inputs: string[];
  outputs: string[];
};

const HANDLE_CATALOG: Map<string, NodeHandleInfo> = new Map();

copilotNodeCatalog.forEach(entry => {
  HANDLE_CATALOG.set(entry.type, {
    inputs: Array.isArray(entry.inputs) ? [...entry.inputs] : [],
    outputs: Array.isArray(entry.outputs) ? [...entry.outputs] : [],
  });
});

Object.entries(componentNodeDefinitions).forEach(([type, definition]) => {
  if (!HANDLE_CATALOG.has(type)) {
    HANDLE_CATALOG.set(type, {
      inputs: Array.isArray(definition.inputs) ? [...definition.inputs] : [],
      outputs: Array.isArray(definition.outputs) ? [...definition.outputs] : [],
    });
  }
});

const ADDITIONAL_HANDLE_DEFINITIONS: Record<string, NodeHandleInfo> = {
  input: {
    inputs: [],
    outputs: ['0'],
  },
  output: {
    inputs: ['0'],
    outputs: [],
  },
  llm: {
    inputs: ['0'],
    outputs: ['0'],
  },
  timestamp: {
    inputs: [],
    outputs: ['0'],
  },
  structured_extraction: {
    inputs: ['0', '1'],
    outputs: ['0', '1', '2', '3', '4'],
  },
  schema_validator: {
    inputs: ['0', '1', '2'],
    outputs: ['0', '1', '2', '3', '4'],
  },
  http_request: {
    inputs: ['body', 'query'],
    outputs: ['response', 'error', 'metadata'],
  },
  web_search: {
    inputs: ['query'],
    outputs: ['results', 'metadata', 'error'],
  },
  code_execution: {
    inputs: ['input'],
    outputs: ['output', 'error'],
  },
  web_api: {
    inputs: ['url', 'headers', 'body', 'query', 'path'],
    outputs: ['output', 'error', 'response'],
  },
  variable_set: {
    inputs: ['input'],
    outputs: ['output'],
  },
  while: {
    inputs: ['input', 'loop'],
    outputs: ['output', 'loop'],
  },
  if: {
    inputs: ['input'],
    outputs: ['true', 'false'],
  },
  text_combiner: {
    inputs: ['input1', 'input2', 'input3', 'input4'],
    outputs: ['output'],
  },
  upper_case: {
    inputs: ['input'],
    outputs: ['output', 'metadata', 'error'],
  },
};

Object.entries(ADDITIONAL_HANDLE_DEFINITIONS).forEach(([type, handles]) => {
  HANDLE_CATALOG.set(type, {
    inputs: [...handles.inputs],
    outputs: [...handles.outputs],
  });
});

// Provide aliases for node types that use different identifiers internally
if (HANDLE_CATALOG.has('code_execution')) {
  HANDLE_CATALOG.set('js_code', HANDLE_CATALOG.get('code_execution')!);
}

export class ToolInvoker {
  private nodeHandles = new Map<string, NodeHandleInfo>();
  constructor() {
    this.syncExistingNodes();
  }
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
      case 'disconnect_nodes':
        return this.disconnectNodes(parameters);
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
      // Map generic types to actual node component types
      const nodeTypeMap: Record<string, string> = {
        'input': 'input',
        'inputNode': 'input',
        'output': 'output',
        'outputNode': 'output',
        'llm': 'llm',
        'llmNode': 'llm',
        'text': 'text',
        'textNode': 'text',
        'http': 'http_request',
        'httpRequest': 'http_request',
        'httpRequestNode': 'http_request',
        'if': 'if',
        'ifNode': 'if',
        'while': 'while',
        'whileNode': 'while',
        'workflow': 'workflow',
        'workflowNode': 'workflow',
        'timestamp': 'timestamp',
        'timestampNode': 'timestamp',
        'variable': 'variable_set',
        'variableSet': 'variable_set',
        'variableSetNode': 'variable_set',
        'textCombiner': 'text_combiner',
        'textCombinerNode': 'text_combiner',
        'schedule': 'schedule',
        'scheduleNode': 'schedule',
        'webSearch': 'web_search',
        'webSearchNode': 'web_search',
        'codeExecution': 'code_execution',
        'codeExecutionNode': 'code_execution',
        'webApi': 'web_api',
        'webApiNode': 'web_api',
        'structuredExtraction': 'structured_extraction',
        'structuredExtractionNode': 'structured_extraction',
        'schemaValidator': 'schema_validator',
        'schemaValidatorNode': 'schema_validator',
      };

      // Get the correct node type or default to the provided type
      const actualType = nodeTypeMap[params.type] || params.type;

      const nodeId = `${actualType}-${uuidv4().slice(0, 8)}`;
      const newNode: Node = {
        id: nodeId,
        type: actualType,
        position: params.position || { x: 250, y: 250 },
        data: {
          ...params.data,
          label: params.data?.label || `${params.type} Node`,
        },
      };

      const handles = this.lookupHandlesByType(actualType);
      if (handles) {
        newNode.data = {
          ...newNode.data,
          inputs: handles.inputs.map(handle => ({ id: handle, name: handle })),
          outputs: handles.outputs.map(handle => ({ id: handle, name: handle })),
        };
      }

      const result: ToolResult = {
        success: true,
        type: 'add_node',
        description: `Add ${params.type} node`,
        data: { node: newNode },
        confidence: 0.9,
      };

      this.registerNodeHandlesInternal(nodeId, actualType);

      return result;
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
      const normalizeHandle = (handle: string | undefined, role: 'source' | 'target') => {
        const fallback = role === 'source' ? 'output' : 'input';

        if (!handle) {
          return fallback;
        }

        const lowered = handle.trim().toLowerCase();
        const canonicalMatches = role === 'source'
          ? ['output', 'out', 'default', 'result']
          : ['input', 'in', 'default', 'target', 'result'];

        if (canonicalMatches.includes(lowered)) {
          return fallback;
        }

        return lowered;
      };

      const sourceHandle = normalizeHandle(params.sourceHandle, 'source');
      const targetHandle = normalizeHandle(params.targetHandle, 'target');

      const resolvedSource = this.resolveHandle(params.sourceId, sourceHandle, 'source');
      if (resolvedSource.error) {
        return {
          success: false,
          error: resolvedSource.error,
        };
      }

      const resolvedTarget = this.resolveHandle(params.targetId, targetHandle, 'target');
      if (resolvedTarget.error) {
        return {
          success: false,
          error: resolvedTarget.error,
        };
      }

      const edgeId = `edge-${uuidv4().slice(0, 8)}`;
      const newEdge: Edge = {
        id: edgeId,
        source: params.sourceId,
        sourceHandle: resolvedSource.handle,
        target: params.targetId,
        targetHandle: resolvedTarget.handle,
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

  private lookupHandlesByType(type: string): NodeHandleInfo | null {
    const info = HANDLE_CATALOG.get(type);
    if (info) {
      return {
        inputs: [...info.inputs],
        outputs: [...info.outputs],
      };
    }
    return null;
  }

  public registerHandlesForNode(nodeId: string, nodeType?: string): void {
    this.registerNodeHandlesInternal(nodeId, nodeType);
  }

  private registerNodeHandlesInternal(nodeId: string, nodeType: string | undefined): void {
    if (!nodeType || this.nodeHandles.has(nodeId)) {
      return;
    }

    const handles = this.lookupHandlesByType(nodeType);
    if (handles) {
      this.nodeHandles.set(nodeId, handles);
    }
  }

  private ensureHandlesForNode(nodeId: string): NodeHandleInfo | null {
    if (this.nodeHandles.has(nodeId)) {
      return this.nodeHandles.get(nodeId)!;
    }

    const store = useReactFlowStore.getState();
    const nodes = Array.isArray(store.nodes) ? store.nodes : [];
    const existing = nodes.find(n => n.id === nodeId);
    if (existing) {
      this.registerNodeHandlesInternal(existing.id, existing.type);
      return this.nodeHandles.get(nodeId) || null;
    }

    return null;
  }

  private syncExistingNodes(): void {
    const store = useReactFlowStore.getState();
    const nodes = Array.isArray(store.nodes) ? store.nodes : [];
    nodes.forEach(node => {
      this.registerNodeHandlesInternal(node.id, node.type);
    });
  }

  private resolveHandle(
    nodeId: string,
    handle: string,
    role: 'source' | 'target'
  ): { handle: string; error?: string } {
    const info = this.ensureHandlesForNode(nodeId);

    if (!info) {
      // If we can't resolve the handles (e.g., node not yet created), allow the connection
      return { handle };
    }

    const candidates = role === 'source' ? info.outputs : info.inputs;

    if (!candidates || candidates.length === 0) {
      return { handle };
    }

    const canonicalMap = new Map<string, string>();
    candidates.forEach(h => {
      canonicalMap.set(h.toLowerCase(), h);
    });

    const normalized = handle.trim().toLowerCase();

    if (canonicalMap.has(normalized)) {
      return { handle: canonicalMap.get(normalized)! };
    }

    if (/^\d+$/.test(handle)) {
      const numericIndex = Number(handle);
      if (!Number.isNaN(numericIndex) && candidates[numericIndex]) {
        return { handle: candidates[numericIndex] };
      }
    }

    if (normalized === 'output') {
      if (canonicalMap.has('output')) {
        return { handle: canonicalMap.get('output')! };
      }
      if (candidates.length === 1) {
        return { handle: candidates[0] };
      }
      const firstOutput = candidates.find(h => h.toLowerCase().startsWith('output'));
      if (firstOutput) {
        return { handle: firstOutput };
      }
    }

    if (normalized === 'input') {
      if (canonicalMap.has('input')) {
        return { handle: canonicalMap.get('input')! };
      }
      if (candidates.length === 1) {
        return { handle: candidates[0] };
      }
      const firstInput = candidates.find(h => h.toLowerCase().startsWith('input'));
      if (firstInput) {
        return { handle: firstInput };
      }
    }

    return {
      handle,
      error: `Invalid ${role} handle "${handle}" for node ${nodeId}. Available handles: ${candidates.join(', ')}`,
    };
  }

  private disconnectNodes(params: {
    edgeId?: string;
    sourceId?: string;
    sourceHandle?: string;
    targetId?: string;
    targetHandle?: string;
  }): ToolResult {
    try {
      const store = useReactFlowStore.getState();
      const edges = Array.isArray(store.edges) ? store.edges : [];

      const normalizeHandle = (handle?: string | null) => handle?.toLowerCase();

      const matchHandle = (edgeHandle?: string | null, requested?: string) => {
        if (!requested) {
          return true;
        }
        if (!edgeHandle) {
          return false;
        }
        return edgeHandle.toLowerCase() === requested.toLowerCase();
      };

      let edgeToRemove = params.edgeId
        ? edges.find(edge => edge.id === params.edgeId)
        : undefined;

      const resolvedSourceHandle = normalizeHandle(params.sourceHandle);
      const resolvedTargetHandle = normalizeHandle(params.targetHandle);

      if (!edgeToRemove && params.sourceId && params.targetId) {
        edgeToRemove = edges.find(edge => {
          if (edge.source !== params.sourceId || edge.target !== params.targetId) {
            return false;
          }
          return matchHandle(edge.sourceHandle, resolvedSourceHandle) &&
            matchHandle(edge.targetHandle, resolvedTargetHandle);
        });

        if (!edgeToRemove) {
          edgeToRemove = edges.find(edge => edge.source === params.sourceId && edge.target === params.targetId);
        }
      }

      if (!edgeToRemove) {
        return {
          success: false,
          error: 'No matching edge found to disconnect. Provide edgeId or valid source/target identifiers.',
        };
      }

      return {
        success: true,
        type: 'disconnect_nodes',
        description: `Disconnect ${edgeToRemove.source} from ${edgeToRemove.target}`,
        data: { edgeId: edgeToRemove.id },
        confidence: 0.8,
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

  private async runWorkflow(params: {
    workflowId: string;
    inputs: NodeInputs;
  }): Promise<ToolResult> {
    try {
      const { workflowId, inputs } = params;

      if (!workflowId) {
        return { success: false, error: 'Workflow ID is not provided' };
      }

      const workflow = workflowManagerService.getWorkflow(workflowId);
      if (!workflow || !workflow.flow) {
        return { success: false, error: `Workflow with ID ${workflowId} not found` };
      }

      const subWorkflowExecutionService = new NodeExecutionService();
      const executionGenerator = await subWorkflowExecutionService.startExecution(
        workflow.flow.nodes,
        workflow.flow.edges,
        inputs
      );

      let lastResult: any;
      while (true) {
        const { done, value } = await executionGenerator.next();
        if (done) {
          lastResult = value;
          break;
        }
      }

      if (lastResult?.status === 'error') {
        return {
          success: false,
          error: `Sub-workflow execution failed: ${lastResult.error?.message}`,
        };
      }

      const outputs = lastResult.variables || {};

      return {
        success: true,
        type: 'run_workflow',
        description: `Successfully executed workflow ${workflow.name}`,
        data: {
          outputs,
        },
        confidence: 0.95,
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
        this.registerHandlesForNode(suggestion.data.node.id, suggestion.data.node.type);
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
