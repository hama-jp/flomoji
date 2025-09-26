import { Node, Edge } from '@xyflow/react';
import { CopilotIntent, CopilotRequest } from './CopilotOrchestratorService';
import { nodeTypes as copilotNodeCatalog } from '../../constants/nodeTypes';

export interface PromptContext {
  intent: CopilotIntent;
  request: CopilotRequest;
  memory: any;
}

export class PromptBuilder {
  private readonly systemPrompt = `You are an AI assistant specialized in creating and optimizing workflow graphs.
You help users build workflows using a node-based visual programming interface called Flomoji.

SYSTEM ARCHITECTURE:
- This is a React Flow-based workflow builder
- Nodes are visual components that process data
- Edges connect nodes to create data flow
- Each node has specific input/output handles for connections

You must follow this structured thinking process:
1.  **Analyze the Request**: Understand what the user wants to achieve.
2.  **Outline a Plan**: Create a high-level, step-by-step plan to build the workflow. Explain this plan in natural language.
3.  **Define Nodes**: List all the nodes required for the workflow, specifying their type and purpose.
4.  **Implement with Tools**: Use the available tool calls ('add_node', 'connect_nodes', etc.) to create the nodes and connect them as planned.

Failure to follow this process may result in an incomplete or incorrect workflow.

**IMPORTANT NODE TYPES** (use exact type names):
1. "input" - Input Node: Accepts user input (no inputs, has 'output' handle)
2. "output" - Output Node: Displays results (has 'input' handle, no outputs)
3. "llm" - LLM Node: Processes text with AI (input→output)
4. "text" - Text Node: Static text (no inputs, has 'output')
5. "http_request" - HTTP Request: Makes API calls (input→output, error)
6. "text_combiner" - Text Combiner: Combines text (input1, input2→output)
7. "if" - If Condition: Branching logic (condition, input→true, false)
8. "while" - While Loop: Loops (condition, input→output, done)
9. "code_execution" - Code Execution: Runs JavaScript (input→output, error)
10. "timestamp" - Timestamp: Current time (no inputs→timestamp)
11. "variable_set" - Variable Set: Stores variables (input→output)
12. "web_search" - Web Search: Searches web (query→results)

Available node types and their descriptions:
${this.getNodeCatalog()}

REQUIRED: Use function calling tools to create workflows:

1. add_node - MUST provide:
   - type: exact node type from list above (e.g., "input", "output", "llm")
   - position: {x: number, y: number} - spacing ~300px horizontally
   - data: {label: string, ...other properties}

2. connect_nodes - MUST provide:
   - sourceId: ID of source node
   - sourceHandle: handle name (e.g., "output", "true", "false")
   - targetId: ID of target node
   - targetHandle: handle name (e.g., "input", "condition")

3. disconnect_nodes - MUST provide either:
   - edgeId: ID of the edge to remove (preferred, see workflow listing), OR
   - sourceId + targetId with optional handle names to identify the edge

EXAMPLE for simple input→output workflow:
1. Call add_node with type:"input", position:{x:100,y:100}, data:{label:"Input"}
2. Call add_node with type:"output", position:{x:400,y:100}, data:{label:"Output"}
3. Call connect_nodes with sourceId:"[input-id]", sourceHandle:"output", targetId:"[output-id]", targetHandle:"input"

CRITICAL RULES:
- MUST use function calls - do NOT just describe what you would do
- Use exact node type names from the list above
- Node IDs are auto-generated, use the returned IDs for connections
- Always provide position and data.label for nodes
- Connect nodes using their specific handle names
- When restructuring, remove obsolete edges with disconnect_nodes before adding new connections to avoid duplicate paths
- For Japanese users, respond in Japanese but use English for node types

4. run_workflow - MUST provide:
   - workflowId: The ID of the workflow to execute.
   - inputs: An object where keys are the names of the sub-workflow's input nodes and values are the data to pass.
`;

  private getNodeCatalog(): string {
    if (!Array.isArray(copilotNodeCatalog) || copilotNodeCatalog.length === 0) {
      return 'No node types available';
    }

    return copilotNodeCatalog.map(node => {
      const inputs = node.inputs.length > 0 ? node.inputs.join(', ') : 'none';
      const outputs = node.outputs.length > 0 ? node.outputs.join(', ') : 'none';
      return `- ${node.type}: ${node.description}
  Category: ${node.category}
  Inputs: ${inputs}
  Outputs: ${outputs}`;
    }).join('\n');
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
    const nodeCount = request.context?.nodes?.length ?? 0;
    const edgeCount = request.context?.edges?.length ?? 0;

    return `You are an intent classifier for the flomoji workflow copilot.
Choose the best matching intent label for the user's latest request.

USER REQUEST (Japanese text is possible):
"""
${request.message}
"""

CURRENT WORKFLOW SUMMARY:
- node_count: ${nodeCount}
- edge_count: ${edgeCount}

Allowed intent labels:
1. CREATE_FLOW  – ユーザーが新しいワークフローやノード追加を求めている
2. IMPROVE_FLOW – 既存フローの改善や最適化を求めている
3. EXPLAIN      – 仕組みの説明や理解を求めている
4. DEBUG        – バグ修正や問題解決を求めている
5. OPTIMIZE     – パフォーマンスや効率化を求めている
6. UNKNOWN      – 上記に明確に当てはまらない

Respond in JSON with the shape:
{
  "intent": "CREATE_FLOW",
  "confidence": 0.0,
  "reasons": ["short justification in Japanese or English"]
}

Use lowercase for array items if you need multiple reasons. Confidence is from 0 to 1.
Only output valid JSON, no commentary.`;
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
      const edgeId = edge.id || '(edge-without-id)';
      const sourceHandle = edge.sourceHandle ?? 'output';
      const targetHandle = edge.targetHandle ?? 'input';
      formatted += `  - ${edgeId}: ${edge.source}:${sourceHandle} -> ${edge.target}:${targetHandle}\n`;
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

IMPORTANT: You MUST call the function tools to create the workflow. Do NOT just describe it.
You MUST make ALL the necessary function calls to create a complete workflow.

For workflows, follow this pattern:
1. First, create ALL nodes that are needed
2. Then, create ALL connections between the nodes

CONNECTION REFERENCES:
- You can use "node-1", "node-2", etc. to refer to the 1st, 2nd node created
- You can use the node type like "input", "llm", "output" to refer to nodes by type
- The system will automatically resolve these references to actual node IDs

Example for input→LLM→output workflow:
Make ALL these function calls:

1. Call add_node for the input node:
   {
     "type": "input",
     "position": {"x": 100, "y": 100},
     "data": {"label": "Input", "inputType": "text"}
   }

2. Call add_node for the LLM node:
   {
     "type": "llm",
     "position": {"x": 400, "y": 100},
     "data": {"label": "LLM Processing", "model": "gpt-4", "prompt": "Process the input: {{input}}"}
   }

3. Call add_node for the output node:
   {
     "type": "output",
     "position": {"x": 700, "y": 100},
     "data": {"label": "Output"}
   }

4. Call connect_nodes to connect input to LLM:
   {
     "sourceId": "node-1",
     "sourceHandle": "output",
     "targetId": "node-2",
     "targetHandle": "input"
   }

5. Call connect_nodes to connect LLM to output:
   {
     "sourceId": "node-2",
     "sourceHandle": "output",
     "targetId": "node-3",
     "targetHandle": "input"
   }

Alternative: You can also use type names:
4. Call connect_nodes: {"sourceId": "input", "sourceHandle": "output", "targetId": "llm", "targetHandle": "input"}
5. Call connect_nodes: {"sourceId": "llm", "sourceHandle": "output", "targetId": "output", "targetHandle": "input"}

If an existing connection no longer fits the new design, call disconnect_nodes first (prefer providing the edgeId listed in the workflow context) and then add the updated connections.

CRITICAL: 
- Make ALL function calls needed for a complete workflow
- Create all nodes first, then all connections
- The system expects multiple tool calls in a single response
- Use simple references like "node-1" or "input" for connections

Example for a conditional workflow (e.g., "if input contains 'error', search web, otherwise use LLM"):
1.  **Plan**:
    - Start with an input node.
    - Use an 'if' node to check for the word "error".
    - If true, connect to a 'web_search' node.
    - If false, connect to an 'llm' node.
    - Connect both search and LLM results to a final output node.
2.  **Nodes**:
    - 'input': To receive the initial text.
    - 'if': To perform the conditional check.
    - 'web_search': To search the web if "error" is present.
    - 'llm': To process the text if no error is found.
    - 'output': To display the final result.
3.  **Tool Calls**:
    - 'add_node' for 'input' (node-1)
    - 'add_node' for 'if' (node-2)
    - 'add_node' for 'web_search' (node-3)
    - 'add_node' for 'llm' (node-4)
    - 'add_node' for 'output' (node-5)
    - 'connect_nodes' from 'input' (output) to 'if' (input)
    - 'connect_nodes' from 'if' (true) to 'web_search' (query)
    - 'connect_nodes' from 'if' (false) to 'llm' (input)
    - 'connect_nodes' from 'web_search' (results) to 'output' (input)
    - 'connect_nodes' from 'llm' (output) to 'output' (input)`,

      IMPROVE_FLOW: `Analyze the existing workflow and suggest improvements.
Look for redundant nodes, missing connections, or inefficiencies.
Suggest better node types if applicable.
Remove or reconnect edges and nodes as needed using disconnect_nodes / delete_node before wiring new paths.
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
