import { Node, Edge } from '@xyflow/react';
import { PromptBuilder } from './PromptBuilder';
import { LLMAdapter } from './LLMAdapter';
import { ToolInvoker } from './ToolInvoker';
import { CopilotMemory } from './CopilotMemory';
import { WorkflowTemplate } from '../../types/workflow';
import StorageService from '../storageService';

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
      model: settings.model || 'gpt-5'
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

      // Get LLM response with tool calls
      const llmResponse = await this.llmAdapter.generate(prompt);

      // Execute tool calls
      const toolResults = await this.executeTools(llmResponse.toolCalls);

      // Generate suggestions based on results
      const suggestions = this.generateSuggestions(toolResults);

      // Create preview if needed
      const preview = await this.createPreview(suggestions, request.context);

      // Save response to memory
      this.memory.addConversation({
        type: 'assistant',
        message: llmResponse.explanation || '',
        suggestions,
        timestamp: new Date(),
      });

      return {
        intent,
        suggestions,
        explanation: llmResponse.explanation,
        preview,
      };
    } catch (error) {
      console.error('Copilot Orchestrator Error:', error);
      throw new Error('Failed to process copilot request');
    }
  }

  private async detectIntent(request: CopilotRequest): Promise<CopilotIntent> {
    const intentPrompt = this.promptBuilder.buildIntentDetection(request);
    const response = await this.llmAdapter.generate(intentPrompt);

    const intents: CopilotIntent[] = ['CREATE_FLOW', 'IMPROVE_FLOW', 'EXPLAIN', 'DEBUG', 'OPTIMIZE'];
    
    // Try to get intent from the response
    let detectedIntent = response.intent as CopilotIntent;
    
    // If not found in intent field, try to extract from text
    if (!detectedIntent && response.text) {
      for (const intent of intents) {
        if (response.text.includes(intent)) {
          detectedIntent = intent;
          break;
        }
      }
    }

    // Default to CREATE_FLOW for workflow creation requests
    if (!detectedIntent && request.message.toLowerCase().includes('create')) {
      detectedIntent = 'CREATE_FLOW';
    }

    return intents.includes(detectedIntent) ? detectedIntent : 'CREATE_FLOW';
  }

  private async executeTools(toolCalls: any[]): Promise<any[]> {
    const results = [];

    for (const call of toolCalls) {
      try {
        const result = await this.toolInvoker.execute(call);
        results.push(result);
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
      switch (suggestion.type) {
        case 'add_node':
          previewNodes.push(suggestion.data.node);
          diff.added.push(suggestion.data.node.id);
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
          break;

        case 'disconnect_nodes':
          previewEdges = previewEdges.filter(e => e.id !== suggestion.data.edgeId);
          diff.removed.push(suggestion.data.edgeId);
          break;
      }
    }

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