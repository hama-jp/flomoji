import StorageService from '../storageService';

interface LLMConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiEndpoint?: string;
}

interface LLMResponse {
  text?: string;
  intent?: string;
  explanation?: string;
  toolCalls: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ToolCall {
  id: string;
  name: string;
  parameters: any;
}

export class LLMAdapter {
  private config: LLMConfig;
  private defaultModel = 'gpt-5';
  private defaultTemperature = 1; // GPT-5 only supports temperature 1
  private defaultMaxTokens = 2000;

  constructor(config?: LLMConfig) {
    const settings = StorageService.getSettings();
    this.config = {
      model: config?.model || this.defaultModel,
      temperature: config?.temperature || settings.temperature || this.defaultTemperature,
      maxTokens: config?.maxTokens || settings.maxTokens || this.defaultMaxTokens,
      apiKey: config?.apiKey || settings.apiKey || '',
      apiEndpoint: config?.apiEndpoint || settings.baseUrl || 'https://api.openai.com/v1/chat/completions',
    };
  }

  private getApiKeyFromEnv(): string {
    // Get API key from settings storage
    const settings = StorageService.getSettings();
    return settings.apiKey || '';
  }

  async generate(prompt: string, options?: Partial<LLMConfig>): Promise<LLMResponse> {
    const config = { ...this.config, ...options };

    if (!config.apiKey) {
      throw new Error('OpenAI API key is required. Please set it in settings.');
    }

    try {
      const messages = this.buildMessages(prompt);
      const tools = this.getAvailableTools();

      // Build request body - only include temperature if it's not 1 (but GPT-5 only supports 1)
      const requestBody: any = {
        model: config.model,
        messages,
        tools,
        tool_choice: 'auto',
        max_completion_tokens: config.maxTokens,
      };

      // For GPT-5 models, only include temperature if it's exactly 1
      // Otherwise omit it to use the default
      if (config.model?.startsWith('gpt-5')) {
        // Don't include temperature for GPT-5 models as they only support default (1)
      } else {
        requestBody.temperature = config.temperature;
      }

      const response = await fetch(config.apiEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`LLM API Error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error('LLM Adapter Error:', error);
      throw error;
    }
  }

  private buildMessages(prompt: string): any[] {
    return [
      {
        role: 'system',
        content: 'You are a helpful workflow automation assistant.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];
  }

  private getAvailableTools(): any[] {
    return [
      {
        type: 'function',
        function: {
          name: 'add_node',
          description: 'Add a new node to the workflow',
          parameters: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                description: 'The type of node to add',
              },
              data: {
                type: 'object',
                description: 'Node configuration data',
              },
              position: {
                type: 'object',
                properties: {
                  x: { type: 'number' },
                  y: { type: 'number' },
                },
                required: ['x', 'y'],
              },
            },
            required: ['type', 'data', 'position'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'connect_nodes',
          description: 'Connect two nodes with an edge',
          parameters: {
            type: 'object',
            properties: {
              sourceId: {
                type: 'string',
                description: 'Source node ID',
              },
              sourceHandle: {
                type: 'string',
                description: 'Source handle name',
              },
              targetId: {
                type: 'string',
                description: 'Target node ID',
              },
              targetHandle: {
                type: 'string',
                description: 'Target handle name',
              },
            },
            required: ['sourceId', 'sourceHandle', 'targetId', 'targetHandle'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_node',
          description: 'Update node properties',
          parameters: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Node ID to update',
              },
              dataPatch: {
                type: 'object',
                description: 'Properties to update',
              },
            },
            required: ['id', 'dataPatch'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'delete_node',
          description: 'Remove a node from the workflow',
          parameters: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Node ID to delete',
              },
            },
            required: ['id'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'run_workflow',
          description: 'Execute the workflow in preview or dry-run mode',
          parameters: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                enum: ['preview', 'dry-run'],
                description: 'Execution mode',
              },
            },
            required: ['mode'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'fetch_template',
          description: 'Search for workflow templates',
          parameters: {
            type: 'object',
            properties: {
              keywords: {
                type: 'array',
                items: { type: 'string' },
                description: 'Keywords to search for',
              },
            },
          },
        },
      },
    ];
  }

  private parseResponse(data: any): LLMResponse {
    const message = data.choices[0]?.message;

    const toolCalls: ToolCall[] = [];
    if (message?.tool_calls) {
      message.tool_calls.forEach((call: any) => {
        toolCalls.push({
          id: call.id,
          name: call.function.name,
          parameters: JSON.parse(call.function.arguments),
        });
      });
    }

    // Try to extract intent from the message content
    let intent: string | undefined;
    const content = message?.content || '';

    const intentPatterns = [
      { pattern: /CREATE_FLOW/i, intent: 'CREATE_FLOW' },
      { pattern: /IMPROVE_FLOW/i, intent: 'IMPROVE_FLOW' },
      { pattern: /EXPLAIN/i, intent: 'EXPLAIN' },
      { pattern: /DEBUG/i, intent: 'DEBUG' },
      { pattern: /OPTIMIZE/i, intent: 'OPTIMIZE' },
    ];

    for (const { pattern, intent: detectedIntent } of intentPatterns) {
      if (pattern.test(content)) {
        intent = detectedIntent;
        break;
      }
    }

    return {
      text: content,
      intent,
      explanation: content,
      toolCalls,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  async generateStream(
    prompt: string,
    onChunk: (chunk: string) => void,
    options?: Partial<LLMConfig>
  ): Promise<void> {
    const config = { ...this.config, ...options };

    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const messages = this.buildMessages(prompt);

    const requestBody: any = {
      model: config.model,
      messages,
      stream: true,
    };

    // Handle parameters based on model
    if (config.model?.startsWith('gpt-5')) {
      requestBody.max_completion_tokens = config.maxTokens;
      // Don't include temperature for GPT-5
    } else {
      requestBody.max_tokens = config.maxTokens;
      requestBody.temperature = config.temperature;
    }

    const response = await fetch(config.apiEndpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`LLM API Error: ${response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): LLMConfig {
    return { ...this.config };
  }
}