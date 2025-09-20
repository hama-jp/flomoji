import { Node, Edge } from '@xyflow/react';
import { CopilotIntent, CopilotRequest } from './CopilotOrchestratorService';
import { nodeTypes } from '../../constants/nodeTypes';

export interface PromptContext {
  intent: CopilotIntent;
  request: CopilotRequest;
  memory: any;
}

export class PromptBuilder {
  private readonly systemPrompt = `You are an AI assistant specialized in creating and optimizing workflow graphs.
You help users build workflows using a node-based visual programming interface.

Available node types and their descriptions:
${this.getNodeCatalog()}

You MUST use the function calling tools to create workflows. When a user asks to create a workflow:
1. Use add_node to create the necessary nodes
2. Use connect_nodes to link them together
3. Position nodes logically (x increases left-to-right, y increases top-to-bottom)

Example positions for a simple workflow:
- First node: {x: 100, y: 100}
- Second node: {x: 400, y: 100}
- Third node: {x: 700, y: 100}

Available tools (YOU MUST USE THESE):
1. add_node({ type, data, position }): Add a new node to the workflow
2. connect_nodes({ sourceId, sourceHandle, targetId, targetHandle }): Connect two nodes
3. update_node({ id, dataPatch }): Update node properties
4. delete_node({ id }): Remove a node from the workflow
5. run_workflow({ mode }): Execute workflow in preview or dry-run mode
6. fetch_template({ keywords }): Search for workflow templates

Rules:
- ALWAYS use function calls to create workflows, don't just describe them
- Start simple - create 2-3 nodes for basic workflows
- Position nodes with reasonable spacing (300px apart horizontally)
- Connect nodes properly using their handles
- Provide brief explanations alongside your actions`;

  private getNodeCatalog(): string {
    const catalog = Object.entries(nodeTypes).map(([key, config]) => {
      return `- ${key}: ${config.description || 'No description available'}
  Inputs: ${config.inputs?.join(', ') || 'none'}
  Outputs: ${config.outputs?.join(', ') || 'none'}`;
    }).join('\n');

    return catalog || 'No node types available';
  }

  build(context: PromptContext): string {
    const { intent, request, memory } = context;

    let prompt = this.systemPrompt + '\n\n';

    // Add current workflow context
    if (request.context?.nodes && request.context.nodes.length > 0) {
      prompt += 'Current Workflow Structure:\n';
      prompt += this.formatWorkflow(request.context.nodes, request.context.edges || []);
      prompt += '\n\n';
    }

    // Add memory context
    if (memory?.recentConversations) {
      prompt += 'Recent Conversation Context:\n';
      prompt += this.formatConversations(memory.recentConversations);
      prompt += '\n\n';
    }

    // Add execution logs if debugging
    if (intent === 'DEBUG' && request.context?.executionLogs) {
      prompt += 'Execution Logs:\n';
      prompt += this.formatExecutionLogs(request.context.executionLogs);
      prompt += '\n\n';
    }

    // Add intent-specific instructions
    prompt += this.getIntentInstructions(intent);
    prompt += '\n\n';

    // Add user request
    prompt += `User Request: ${request.message}\n`;

    // Add tool usage instructions
    prompt += '\nUse the available function tools to fulfill this request. ';
    prompt += 'Call the appropriate functions to create nodes, connect them, or modify the workflow as needed. ';
    prompt += 'Provide a brief explanation of what you are doing.\n';

    return prompt;
  }

  buildIntentDetection(request: CopilotRequest): string {
    return `Analyze the following user request and determine the intent.

User Request: ${request.message}

${request.context?.nodes ? `Current workflow has ${request.context.nodes.length} nodes.` : 'No existing workflow.'}

Possible intents:
- CREATE_FLOW: User wants to create a new workflow from scratch or add nodes to build a workflow
- IMPROVE_FLOW: User wants to optimize or enhance existing workflow
- EXPLAIN: User wants explanation of workflow or nodes
- DEBUG: User needs help fixing errors or issues
- OPTIMIZE: User wants to improve performance or efficiency

Based on the user request, the intent is clearly: CREATE_FLOW

Respond with: "The intent is CREATE_FLOW" (or the appropriate intent).`;
  }

  private formatWorkflow(nodes: Node[], edges: Edge[]): string {
    let formatted = `Nodes (${nodes.length}):\n`;

    nodes.forEach(node => {
      formatted += `  - ${node.id} [${node.type}]: ${node.data?.label || 'Unnamed'}\n`;
      if (node.data) {
        const dataKeys = Object.keys(node.data).filter(k => k !== 'label');
        if (dataKeys.length > 0) {
          formatted += `    Data: ${dataKeys.join(', ')}\n`;
        }
      }
    });

    formatted += `\nEdges (${edges.length}):\n`;
    edges.forEach(edge => {
      formatted += `  - ${edge.source}:${edge.sourceHandle} -> ${edge.target}:${edge.targetHandle}\n`;
    });

    return formatted;
  }

  private formatConversations(conversations: any[]): string {
    return conversations.slice(-5).map(conv => {
      return `[${conv.type}]: ${conv.message}`;
    }).join('\n');
  }

  private formatExecutionLogs(logs: any[]): string {
    return logs.slice(-10).map(log => {
      return `[${log.level}] ${log.nodeId}: ${log.message}`;
    }).join('\n');
  }

  private getIntentInstructions(intent: CopilotIntent): string {
    const instructions: Record<CopilotIntent, string> = {
      CREATE_FLOW: `Create a new workflow based on the user's requirements.
YOU MUST use the function calling tools to actually create nodes and connections.
For a simple workflow:
1. Call add_node to create an InputNode at position {x: 100, y: 100}
2. Call add_node to create a processing node (e.g., LLMNode) at position {x: 400, y: 100}
3. Call add_node to create an OutputNode at position {x: 700, y: 100}
4. Call connect_nodes to link them together
DO NOT just describe what you would do - actually call the functions!`,

      IMPROVE_FLOW: `Analyze the existing workflow and suggest improvements.
Look for redundant nodes, missing connections, or inefficiencies.
Suggest better node types if applicable.
Maintain backward compatibility unless explicitly asked to break it.`,

      EXPLAIN: `Explain the workflow or specific nodes clearly.
Describe data flow and transformations.
Highlight important configurations.
Use simple language and examples.`,

      DEBUG: `Identify the issue based on execution logs and workflow structure.
Suggest specific fixes for errors.
Check for common problems like missing connections or invalid configurations.
Provide step-by-step debugging guidance.`,

      OPTIMIZE: `Analyze workflow performance and efficiency.
Identify bottlenecks or redundant operations.
Suggest parallel processing where possible.
Recommend caching or batching strategies.`,

      UNKNOWN: `Try to understand the user's request and provide helpful guidance.
Ask for clarification if needed.
Suggest relevant actions based on context.`,
    };

    return instructions[intent] || instructions.UNKNOWN;
  }

  buildToolCallPrompt(toolName: string, parameters: any): string {
    return JSON.stringify({
      tool: toolName,
      parameters,
      timestamp: new Date().toISOString(),
    }, null, 2);
  }

  buildValidationPrompt(workflow: { nodes: Node[], edges: Edge[] }): string {
    return `Validate the following workflow structure:

${this.formatWorkflow(workflow.nodes, workflow.edges)}

Check for:
1. Disconnected nodes
2. Invalid connections (type mismatches)
3. Missing required configurations
4. Circular dependencies
5. Performance issues

Provide validation results and suggestions for fixes.`;
  }
}