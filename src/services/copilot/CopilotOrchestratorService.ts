import { Node, Edge } from '@xyflow/react';
import { PromptBuilder } from './PromptBuilder';
import { LLMAdapter } from './LLMAdapter';
import { ToolInvoker } from './ToolInvoker';
import { CopilotMemory } from './CopilotMemory';
import { WorkflowTemplate } from '../../types/workflow';
import StorageService from '../storageService';
import { ConversationMessage } from '../../types/conversation';

export type CopilotIntent =
  | 'CREATE_FLOW'
  | 'IMPROVE_FLOW'
  | 'EXPLAIN'
  | 'DEBUG'
  | 'OPTIMIZE'
  | 'UNKNOWN';

export interface CopilotRequest {
  message: string;
  context?: {
    nodes?: Node[];
    edges?: Edge[];
    selectedNodeId?: string;
    executionLogs?: any[];
  };
}

export interface CopilotResponse {
  intent: CopilotIntent;
  suggestions: CopilotSuggestion[];
  explanation?: string;
  preview?: WorkflowPreview;
}

export interface CopilotSuggestion {
  id: string;
  type: 'add_node' | 'remove_node' | 'update_node' | 'connect_nodes' | 'disconnect_nodes';
  description: string;
  data: any;
  confidence: number;
}

export interface WorkflowPreview {
  nodes: Node[];
  edges: Edge[];
  diff?: {
    added: string[];
    removed: string[];
    modified: string[];
  };
}

interface ToolExecutionContext {
  createdNodes: Map<number, string>;
  nodesByType: Map<string, string[]>;
  nodeCounter: number;
  nodeIds: Set<string>;
}

export class CopilotOrchestratorService {
  private promptBuilder: PromptBuilder;
  private llmAdapter: LLMAdapter;
  private toolInvoker: ToolInvoker;
  private memory: CopilotMemory;

  constructor() {
    this.promptBuilder = new PromptBuilder();
    // Get model from settings
    const settings = StorageService.getSettings();
    this.llmAdapter = new LLMAdapter({
      model: settings.model || 'gpt-5-mini'
    });
    this.toolInvoker = new ToolInvoker();
    this.memory = new CopilotMemory();
  }

  async processRequest(request: CopilotRequest): Promise<CopilotResponse> {
    try {
      // Save request to memory
      this.memory.addConversation({
        type: 'user',
        message: request.message,
        timestamp: new Date(),
      });

      // Detect intent
      const intent = await this.detectIntent(request);

      // Build context-aware prompt
    const prompt = this.promptBuilder.build({
      intent,
      request,
      memory: this.memory.getContext(),
    });

    console.log('Sending request to LLM with prompt');

    const conversation = this.llmAdapter.createConversation(prompt);
    const executionContext = this.createToolExecutionContext();
    let toolResults: any[] = [];

    if (request.context?.nodes) {
      request.context.nodes.forEach(node => {
        if (!node?.id || !node?.type) {
          return;
        }
        this.registerExistingNode(executionContext, node);
      });
    }

    const maxIterations = 8;
    let llmResponse = null as Awaited<ReturnType<typeof this.llmAdapter.generateWithConversation>> | null;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const response = await this.llmAdapter.generateWithConversation(conversation);
      llmResponse = response;

      console.log('LLM Response:', {
        iteration,
        hasToolCalls: !!response.toolCalls,
        toolCallsCount: response.toolCalls?.length || 0
      });

      if (response.rawMessage) {
        conversation.push(response.rawMessage);
      } else if (response.text) {
        conversation.push({ role: 'assistant', content: response.text });
      }

      const toolCalls = response.toolCalls || [];
      if (toolCalls.length === 0) {
        break;
      }

      const executionResults = await this.executeTools(toolCalls, executionContext);
      toolResults.push(...executionResults);

      toolCalls.forEach((call, index) => {
        const execution = executionResults[index];
        const toolSummary = {
          success: execution?.success ?? false,
          type: execution?.type,
          description: execution?.description,
          nodeId: execution?.data?.node?.id,
          nodeType: execution?.data?.node?.type,
          edgeId: execution?.data?.edgeId,
          edge: execution?.data?.edge
            ? {
                id: execution.data.edge.id,
                source: execution.data.edge.source,
                target: execution.data.edge.target,
                sourceHandle: execution.data.edge.sourceHandle,
                targetHandle: execution.data.edge.targetHandle,
              }
            : undefined,
          error: execution?.error,
        };

        conversation.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(toolSummary),
        });
      });
    }

    if (!llmResponse) {
      throw new Error('No response received from LLM');
    }

    if ((llmResponse.toolCalls?.length || 0) > 0) {
      console.warn('LLM returned tool calls after max iterations; stopping to avoid infinite loop.');
    }

    // Validate the generated workflow and attempt self-correction
    const tempPreview = await this.createPreview(this.generateSuggestions(toolResults), request.context);
    const validation = await this.toolInvoker.validateWorkflow(tempPreview.nodes, tempPreview.edges);

    if (!validation.isValid && validation.errors.length > 0) {
      console.log('Workflow validation failed, attempting self-correction.');

      const correctionMessage: ConversationMessage = {
        role: 'user',
        content: `The workflow you generated is invalid. Please fix it.
Validation Errors:
${validation.errors.join('\n')}
${validation.warnings.join('\n')}

Analyze the errors and provide a new, complete set of tool calls to create a valid workflow that addresses the original request: "${request.message}"`
      };
      conversation.push(correctionMessage);

      // Re-run generation with correction instructions
      const correctionResponse = await this.llmAdapter.generateWithConversation(conversation);
      if (correctionResponse) {
        llmResponse = correctionResponse;

        if (correctionResponse.rawMessage) {
          conversation.push(correctionResponse.rawMessage);
        } else if (correctionResponse.text) {
          conversation.push({ role: 'assistant', content: correctionResponse.text });
        }

        const correctionToolCalls = correctionResponse.toolCalls || [];
        if (correctionToolCalls.length > 0) {
          const correctionToolResults = await this.executeTools(correctionToolCalls, executionContext);
          // Replace original results with corrected ones
          toolResults = correctionToolResults;
        }
      }
    }

    // Final review step to connect orphan output nodes
    const finalReviewPreview = await this.createPreview(this.generateSuggestions(toolResults), request.context);
    const outputNodes = finalReviewPreview.nodes.filter(n => n.type === 'output');
    const hasUnconnectedOutput = outputNodes.some(outputNode =>
      !finalReviewPreview.edges.some(edge => edge.target === outputNode.id)
    );

    if (outputNodes.length > 0 && hasUnconnectedOutput) {
      const unconnectedOutputIds = outputNodes
        .filter(n => !finalReviewPreview.edges.some(e => e.target === n.id))
        .map(n => n.id);

      console.log(`Found unconnected output node(s): ${unconnectedOutputIds.join(', ')}. Asking LLM for a final review.`);

      const finalReviewMessage: ConversationMessage = {
        role: 'user',
        content: `The workflow is almost complete, but the output node(s) (${unconnectedOutputIds.join(', ')}) are not connected. Please add the final connection from the last processing node to the output node. Do not create new nodes. Only add the missing connection.`
      };
      conversation.push(finalReviewMessage);

      const reviewResponse = await this.llmAdapter.generateWithConversation(conversation);
      if (reviewResponse) {
        if (reviewResponse.rawMessage) {
          conversation.push(reviewResponse.rawMessage);
        } else if (reviewResponse.text) {
          conversation.push({ role: 'assistant', content: reviewResponse.text });
        }

        const reviewToolCalls = reviewResponse.toolCalls || [];
        if (reviewToolCalls.length > 0) {
          const reviewToolResults = await this.executeTools(reviewToolCalls, executionContext);
          toolResults.push(...reviewToolResults);
        }
      }
    }

    // Apply fallback if still incomplete
    const fallbackResults = await this.ensureBasicFlow(request, toolResults, executionContext);
    if (fallbackResults.length > 0) {
      console.log('Applied fallback tool results to complete basic flow:', fallbackResults.length);
      toolResults.push(...fallbackResults);
    }

    // Generate suggestions based on results
    const suggestions = this.generateSuggestions(toolResults);

    // Create preview if needed
    const preview = await this.createPreview(suggestions, request.context);

    // Save response to memory
    this.memory.addConversation({
      type: 'assistant',
      message: llmResponse.explanation || llmResponse.text || '',
      suggestions,
      timestamp: new Date(),
    });

    return {
      intent,
      suggestions,
      explanation: llmResponse.explanation || llmResponse.text || 'I\'ve analyzed your request and prepared some suggestions.',
      preview,
    };
  } catch (error) {
    console.error('Copilot Orchestrator Error:', error);
    throw new Error('Failed to process copilot request');
  }
  }

  private async ensureBasicFlow(
    request: CopilotRequest,
    toolResults: any[],
    context: ToolExecutionContext
  ): Promise<any[]> {
    const additionalResults: any[] = [];
    const nodesByType = context.nodesByType;
    const config = this.llmAdapter.getConfig();

    // Consolidate all nodes from context and new tool results
    const allNodes: { id: string; type: string; }[] = [];
    if (request.context?.nodes) {
      allNodes.push(...request.context.nodes.map(n => ({ id: n.id, type: n.type! })));
    }
    toolResults.forEach(r => {
      if (r.type === 'add_node' && r.data?.node) {
        allNodes.push({ id: r.data.node.id, type: r.data.node.type! });
      }
    });

    const nodeIds = new Set(allNodes.map(n => n.id));
    const nodesWithoutInputConnection = new Set(nodeIds);
    const nodesWithoutOutputConnection = new Set(nodeIds);

    // Track existing connections
    const existingConnections = new Set<string>();
    const recordConnection = (edge: any) => {
      if (edge?.source && edge?.target) {
        existingConnections.add(`${edge.source}->${edge.target}:${edge.sourceHandle || ''}:${edge.targetHandle || ''}`);
        nodesWithoutOutputConnection.delete(edge.source);
        nodesWithoutInputConnection.delete(edge.target);
      }
    };

    if (request.context?.edges) {
      request.context.edges.forEach(recordConnection);
    }
    toolResults.forEach(r => {
      if (r.type === 'connect_nodes' && r.data?.edge) {
        recordConnection(r.data.edge);
      }
    });

    // Smart connection logic
    const connectIfUnconnected = async (
      sourceNode: { id: string; type: string; },
      targetNode: { id: string; type: string; }
    ) => {
      const handles = this.getConnectionHandles(sourceNode.type, targetNode.type);
      const connectionKey = `${sourceNode.id}->${targetNode.id}:${handles.sourceHandle}:${handles.targetHandle}`;
      if (existingConnections.has(connectionKey)) {
        return;
      }

      const result = await this.toolInvoker.execute({
        name: 'connect_nodes',
        parameters: {
          sourceId: sourceNode.id,
          sourceHandle: handles.sourceHandle,
          targetId: targetNode.id,
          targetHandle: handles.targetHandle,
        },
      });

      if (result.success && result.data?.edge) {
        additionalResults.push(result);
        recordConnection(result.data.edge);
      }
    };

    // Attempt to connect a single, unconnected output node
    if (nodesWithoutInputConnection.size === 1 && nodesWithoutOutputConnection.size > 0) {
      const outputNode = allNodes.find(n => nodesWithoutInputConnection.has(n.id) && n.type === 'output');
      if (outputNode) {
        const lastProcessingNode = allNodes.find(n =>
          n.type !== 'input' && n.type !== 'output' && nodesWithoutOutputConnection.has(n.id)
        );
        if (lastProcessingNode) {
          console.log(`Fallback: Connecting orphan output node ${outputNode.id} to ${lastProcessingNode.id}`);
          await connectIfUnconnected(lastProcessingNode, outputNode);
        }
      }
    }

    return additionalResults;
  }

  private getConnectionHandles(sourceType: string, targetType: string): { sourceHandle: string; targetHandle: string } {
    const connectionMatrix: Record<string, Record<string, { sourceHandle: string; targetHandle: string }>> = {
      input: {
        web_search: { sourceHandle: 'output', targetHandle: 'query' },
        http_request: { sourceHandle: 'output', targetHandle: 'body' },
        llm: { sourceHandle: 'output', targetHandle: 'input' },
        text_combiner: { sourceHandle: 'output', targetHandle: 'input1' },
        output: { sourceHandle: 'output', targetHandle: 'input' }
      },
      web_search: {
        llm: { sourceHandle: 'results', targetHandle: 'input' },
        text_combiner: { sourceHandle: 'results', targetHandle: 'input2' },
        output: { sourceHandle: 'results', targetHandle: 'input' }
      },
      http_request: {
        llm: { sourceHandle: 'response', targetHandle: 'input' },
        text_combiner: { sourceHandle: 'response', targetHandle: 'input2' },
        output: { sourceHandle: 'response', targetHandle: 'input' }
      },
      llm: {
        text_combiner: { sourceHandle: 'output', targetHandle: 'input2' },
        output: { sourceHandle: 'output', targetHandle: 'input' }
      },
      text_combiner: {
        output: { sourceHandle: 'output', targetHandle: 'input' }
      }
    };

    return connectionMatrix[sourceType]?.[targetType] || { sourceHandle: 'output', targetHandle: 'input' };
  }

  private async detectIntent(request: CopilotRequest): Promise<CopilotIntent> {
    try {
      const intentPrompt = this.promptBuilder.buildIntentDetection(request);
      const response = await this.llmAdapter.generate(intentPrompt, { toolChoice: 'none' });
      const detected = this.extractIntentFromResponse(response, request);
      if (detected) {
        return detected;
      }
    } catch (error) {
      console.warn('Copilot intent detection failed, using heuristic fallback:', error);
    }

    return this.heuristicIntentFallback(request);
  }

  private extractIntentFromResponse(response: any, request: CopilotRequest): CopilotIntent | null {
    const intents: CopilotIntent[] = ['CREATE_FLOW', 'IMPROVE_FLOW', 'EXPLAIN', 'DEBUG', 'OPTIMIZE', 'UNKNOWN'];

    if (response?.intent && intents.includes(response.intent)) {
      return response.intent as CopilotIntent;
    }

    const textCandidates: string[] = [];

    if (typeof response?.text === 'string') {
      textCandidates.push(response.text);
    }

    if (response?.rawMessage?.content) {
      if (typeof response.rawMessage.content === 'string') {
        textCandidates.push(response.rawMessage.content);
      } else if (Array.isArray(response.rawMessage.content)) {
        response.rawMessage.content.forEach((segment: any) => {
          if (typeof segment?.text === 'string') {
            textCandidates.push(segment.text);
          }
        });
      }
    }

    const parseJsonIntent = (payload: string): CopilotIntent | null => {
      if (!payload) return null;
      const jsonMatch = payload.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const candidate = parsed?.intent as CopilotIntent | undefined;
        if (candidate && intents.includes(candidate)) {
          return candidate;
        }
      } catch (error) {
        console.warn('Failed to parse intent JSON:', error);
      }
      return null;
    };

    for (const candidateText of textCandidates) {
      const parsedIntent = parseJsonIntent(candidateText);
      if (parsedIntent && parsedIntent !== 'UNKNOWN') {
        return parsedIntent;
      }
    }

    for (const candidateText of textCandidates) {
      const upper = candidateText?.toUpperCase?.() ?? '';
      for (const intent of intents) {
        if (intent !== 'UNKNOWN' && upper.includes(intent)) {
          return intent;
        }
      }
    }

    return null;
  }

  private heuristicIntentFallback(request: CopilotRequest): CopilotIntent {
    const lowerMessage = (request.message || '').toLowerCase();
    const nodeCount = request.context?.nodes?.length ?? 0;

    const keywordMap: Array<{ intent: CopilotIntent; keywords: string[] }> = [
      { intent: 'DEBUG', keywords: ['bug', 'error', 'エラー', '失敗', 'デバッグ', 'debug'] },
      { intent: 'OPTIMIZE', keywords: ['optimize', '高速', 'パフォーマンス', '効率', '最適化'] },
      { intent: 'EXPLAIN', keywords: ['explain', '説明', '教えて', 'understand'] },
      { intent: 'IMPROVE_FLOW', keywords: ['improve', '改善', 'refine', 'update', '調整'] },
      { intent: 'CREATE_FLOW', keywords: ['create', 'build', '作成', '追加', 'new', '構築'] },
    ];

    for (const { intent, keywords } of keywordMap) {
      if (keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))) {
        if (intent === 'CREATE_FLOW' && nodeCount > 0) {
          return 'IMPROVE_FLOW';
        }
        return intent;
      }
    }

    if (nodeCount === 0) {
      return 'CREATE_FLOW';
    }

    return 'IMPROVE_FLOW';
  }

  private createToolExecutionContext(): ToolExecutionContext {
    return {
      createdNodes: new Map<number, string>(),
      nodesByType: new Map<string, string[]>(),
      nodeCounter: 1,
      nodeIds: new Set<string>(),
    };
  }

  private registerExistingNode(context: ToolExecutionContext, node: Node): void {
    const label = (node.data as any)?.label;
    const nodeType = node.type ?? 'unknown';
    this.registerNodeReferences(context, node.id, nodeType, nodeType, label);

    const index = context.nodeCounter++;
    context.createdNodes.set(index, node.id);

    const aliases = [
      `node-${index}`,
      `node_${index}`,
      `[node-${index}]`,
      `[node_${index}]`,
    ];

    aliases.forEach(alias => {
      if (!context.nodesByType.has(alias)) {
        context.nodesByType.set(alias, []);
      }
      const list = context.nodesByType.get(alias)!;
      if (!list.includes(node.id)) {
        list.push(node.id);
      }
    });
  }

  private registerNodeReferences(
    context: ToolExecutionContext,
    nodeId: string,
    actualType: string | undefined,
    requestedType?: string,
    label?: string
  ): void {
    const aliases = new Set<string>();

    const addAlias = (value?: string) => {
      if (!value) return;
      const normalized = String(value).trim();
      if (!normalized) return;
      aliases.add(normalized);
      aliases.add(normalized.toLowerCase());
      aliases.add(normalized.replace(/Node$/i, ''));
      aliases.add(normalized.replace(/Node$/i, '').toLowerCase());
      aliases.add(normalized.replace(/[_\s]+/g, '-'));
      aliases.add(normalized.replace(/[_\s]+/g, '-').toLowerCase());
    };

    addAlias(actualType);
    addAlias(requestedType);
    addAlias(label);

    aliases.forEach(alias => {
      if (!alias) return;
      if (!context.nodesByType.has(alias)) {
        context.nodesByType.set(alias, []);
      }
      const list = context.nodesByType.get(alias)!;
      if (!list.includes(nodeId)) {
        list.push(nodeId);
      }
    });

    context.nodeIds.add(nodeId);
  }

  private resolveNodeReference(reference: string, context: ToolExecutionContext): string | undefined {
    if (!reference) {
      return undefined;
    }

    const cleaned = reference.replace(/^\[|\]$/g, '');

    const indexMatch = cleaned.match(/^(?:node[-_]?)(\d+)$/i);
    if (indexMatch) {
      const index = parseInt(indexMatch[1], 10);
      return context.createdNodes.get(index);
    }

    if (context.nodeIds.has(cleaned)) {
      return cleaned;
    }

    const lower = cleaned.toLowerCase();
    if (context.nodeIds.has(lower)) {
      return lower;
    }

    if (context.nodesByType.has(cleaned)) {
      return context.nodesByType.get(cleaned)![0];
    }

    if (context.nodesByType.has(lower)) {
      return context.nodesByType.get(lower)![0];
    }

    return undefined;
  }

  private async executeTools(toolCalls: any[], context: ToolExecutionContext): Promise<any[]> {
    const results: any[] = [];

    if (!toolCalls || toolCalls.length === 0) {
      console.log('No tool calls received from LLM');
      return results;
    }

    console.log(`Executing ${toolCalls.length} tool calls from LLM`);
    
    for (let i = 0; i < toolCalls.length; i++) {
      const call = toolCalls[i];
      
      try {
        console.log(`Executing tool: ${call.name}`, call.parameters);
        
        // Handle node creation and track IDs
        if (call.name === 'add_node') {
          const result = await this.toolInvoker.execute(call);
          if (result.success && result.data?.node) {
            const nodeId = result.data.node.id;
            const nodeType = result.data.node.type;
            const requestedType = call.parameters.type;
            const label = (result.data.node.data as any)?.label;

            const nodeIndex = context.nodeCounter++;
            context.createdNodes.set(nodeIndex, nodeId);
            this.registerNodeReferences(context, nodeId, nodeType, requestedType, label);

            console.log(`Created node ${nodeId} (global index: ${nodeIndex}, type: ${nodeType})`);
          }
          results.push(result);
        }
        // Handle connections with reference resolution
        else if (call.name === 'connect_nodes') {
          const params = { ...call.parameters };

          if (params.sourceId) {
            const resolved = this.resolveNodeReference(params.sourceId, context);
            if (resolved) {
              console.log(`Resolved source reference ${call.parameters.sourceId} to ${resolved}`);
              params.sourceId = resolved;
            }
          }

          if (params.targetId) {
            const resolved = this.resolveNodeReference(params.targetId, context);
            if (resolved) {
              console.log(`Resolved target reference ${call.parameters.targetId} to ${resolved}`);
              params.targetId = resolved;
            }
          }

          const result = await this.toolInvoker.execute({
            name: call.name,
            parameters: params,
          });
          results.push(result);
        }
        else if (call.name === 'disconnect_nodes') {
          const params = { ...call.parameters };

          if (params.sourceId) {
            const resolved = this.resolveNodeReference(params.sourceId, context);
            if (resolved) {
              console.log(`Resolved source reference ${call.parameters.sourceId} to ${resolved}`);
              params.sourceId = resolved;
            }
          }

          if (params.targetId) {
            const resolved = this.resolveNodeReference(params.targetId, context);
            if (resolved) {
              console.log(`Resolved target reference ${call.parameters.targetId} to ${resolved}`);
              params.targetId = resolved;
            }
          }

          const result = await this.toolInvoker.execute({
            name: call.name,
            parameters: params,
          });
          results.push(result);
        }
        // Handle other tools normally
        else {
          const result = await this.toolInvoker.execute(call);
          results.push(result);
        }
      } catch (error) {
        console.error(`Tool execution failed for ${call.name}:`, error);
        results.push({ error: (error as Error).message });
      }
    }

    return results;
  }

  private generateSuggestions(toolResults: any[]): CopilotSuggestion[] {
    const suggestions: CopilotSuggestion[] = [];

    toolResults.forEach((result, index) => {
      if (!result.error) {
        suggestions.push({
          id: `suggestion-${Date.now()}-${index}`,
          type: result.type,
          description: result.description,
          data: result.data,
          confidence: result.confidence || 0.8,
        });
      }
    });

    return suggestions;
  }

  private async createPreview(
    suggestions: CopilotSuggestion[],
    context?: CopilotRequest['context']
  ): Promise<WorkflowPreview> {
    const currentNodes = context?.nodes || [];
    const currentEdges = context?.edges || [];

    console.log('Creating preview with:', {
      currentNodesCount: currentNodes.length,
      currentEdgesCount: currentEdges.length,
      suggestionsCount: suggestions.length
    });

    // Clone current state
    let previewNodes = [...currentNodes];
    let previewEdges = [...currentEdges];

    const diff = {
      added: [] as string[],
      removed: [] as string[],
      modified: [] as string[],
    };

    // Apply suggestions to create preview
    for (const suggestion of suggestions) {
      console.log('Applying suggestion:', suggestion.type, suggestion.data);

      switch (suggestion.type) {
        case 'add_node':
          previewNodes.push(suggestion.data.node);
          diff.added.push(suggestion.data.node.id);
          console.log('Added node:', suggestion.data.node.id, 'Total nodes:', previewNodes.length);
          break;

        case 'remove_node':
          previewNodes = previewNodes.filter(n => n.id !== suggestion.data.nodeId);
          diff.removed.push(suggestion.data.nodeId);
          break;

        case 'update_node':
          const nodeIndex = previewNodes.findIndex(n => n.id === suggestion.data.nodeId);
          if (nodeIndex >= 0) {
            previewNodes[nodeIndex] = { ...previewNodes[nodeIndex], ...suggestion.data.updates };
            diff.modified.push(suggestion.data.nodeId);
          }
          break;

        case 'connect_nodes':
          previewEdges.push(suggestion.data.edge);
          diff.added.push(suggestion.data.edge.id);
          console.log('Added edge:', suggestion.data.edge.id, 'Total edges:', previewEdges.length);
          break;

        case 'disconnect_nodes':
          previewEdges = previewEdges.filter(e => e.id !== suggestion.data.edgeId);
          diff.removed.push(suggestion.data.edgeId);
          break;
      }
    }

    console.log('Preview created:', {
      nodes: previewNodes.map(n => ({ id: n.id, type: n.type })),
      edges: previewEdges.map(e => ({ id: e.id, source: e.source, target: e.target })),
      diff
    });

    return {
      nodes: previewNodes,
      edges: previewEdges,
      diff,
    };
  }

  async applySuggestion(suggestionId: string): Promise<void> {
    const suggestion = this.memory.getSuggestion(suggestionId);
    if (!suggestion) {
      throw new Error('Suggestion not found');
    }

    await this.toolInvoker.apply(suggestion);
    this.memory.markSuggestionApplied(suggestionId);
  }

  async rejectSuggestion(suggestionId: string): Promise<void> {
    this.memory.markSuggestionRejected(suggestionId);
  }

  async fetchTemplates(keywords?: string[]): Promise<WorkflowTemplate[]> {
    return this.toolInvoker.fetchTemplates(keywords);
  }

  clearMemory(): void {
    this.memory.clear();
  }

  exportConversation(): any {
    return this.memory.export();
  }
}

export default CopilotOrchestratorService;
