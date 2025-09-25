import StorageService from '../storageService';

interface LLMConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiEndpoint?: string;
  toolChoice?: 'auto' | 'required' | 'none';
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
  rawMessage?: any;
  conversation?: any[];
}

interface ToolCall {
  id: string;
  name: string;
  parameters: any;
}

export class LLMAdapter {
  private config: LLMConfig;
  private defaultModel = 'gpt-4o';
  private defaultTemperature = 0.7; // Default temperature for models that allow customization
  private defaultMaxTokens = 2048;

  constructor(config?: LLMConfig) {
    const settings = StorageService.getSettings();
    const model = config?.model || settings.model || this.defaultModel;
    
    // For models that only support temperature=1, force it to 1
    let temperature = config?.temperature || settings.temperature || this.defaultTemperature;
    if (this.requiresDefaultTemperature(model)) {
      temperature = 1;
    }
    
    const maxTokensSetting = config?.maxTokens ?? settings.maxTokens ?? this.defaultMaxTokens;
    const normalizedMaxTokens = this.clampMaxTokens(model, maxTokensSetting);

    this.config = {
      model,
      temperature,
      maxTokens: normalizedMaxTokens,
      apiKey: config?.apiKey || settings.apiKey || '',
      apiEndpoint: config?.apiEndpoint || settings.baseUrl || 'https://api.openai.com/v1/chat/completions',
      toolChoice: config?.toolChoice || 'auto',
    };
  }

  private requiresDefaultTemperature(model?: string): boolean {
    if (!model) {
      return false;
    }

    const fixedTemperatureModels = new Set([
      'gpt-4-turbo-preview',
      'gpt-4-1106-preview',
    ]);

    if (fixedTemperatureModels.has(model)) {
      return true;
    }

    return /^(gpt-5|o4)/i.test(model);
  }

  private getMaxTokensField(model?: string): 'max_tokens' | 'max_completion_tokens' {
    if (!model) {
      return 'max_tokens';
    }

    if (/^(gpt-5|o4)/i.test(model)) {
      return 'max_completion_tokens';
    }

    return 'max_tokens';
  }

  private clampMaxTokens(model: string | undefined, requested: number): number {
    if (!requested || requested <= 0) {
      return this.defaultMaxTokens;
    }

    const upperBound = /^(gpt-5|o4)/i.test(model || '') ? 8192 : 4096;
    return Math.max(1, Math.min(requested, upperBound));
  }

  private getApiKeyFromEnv(): string {
    // Get API key from settings storage
    const settings = StorageService.getSettings();
    return settings.apiKey || '';
  }

  async generate(prompt: string, options?: Partial<LLMConfig>): Promise<LLMResponse> {
    const conversation = this.createConversation(prompt);
    const response = await this.generateWithConversation(conversation, options);
    response.conversation = conversation;
    return response;
  }

  async generateWithConversation(
    conversation: any[],
    options?: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    const config = { ...this.config, ...options };
    config.maxTokens = this.clampMaxTokens(config.model, config.maxTokens ?? this.defaultMaxTokens);

    // Force temperature to 1 for models that don't support other values
    if (this.requiresDefaultTemperature(config.model)) {
      console.log('⚠️ Forcing temperature to 1.0 for', config.model);
      config.temperature = 1;
    }

    if (!config.apiKey) {
      throw new Error('OpenAI API key is required. Please set it in settings.');
    }

    try {
      return await this.sendRequest(conversation, config);
    } catch (error) {
      console.error('LLM Adapter Error:', error);
      throw error;
    }
  }

  createConversation(prompt: string): any[] {
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

  private async sendRequest(
    conversation: any[],
    config: LLMConfig
  ): Promise<LLMResponse> {
    const tools = this.getAvailableTools();

    const lastMessage = conversation[conversation.length - 1];
    const messagePreview = typeof lastMessage?.content === 'string'
      ? lastMessage.content
      : JSON.stringify(lastMessage?.content);

    console.log('🚀 LLM Request:', {
      model: config.model,
      temperature: config.temperature,
      messageLength: conversation.length,
      promptPreview: `${messagePreview?.substring(0, 200) || ''}...`,
      toolsCount: tools.length,
      tool_choice: config.toolChoice ?? 'auto',
      parallel_tool_calls: true
    });

    const toolChoice = config.toolChoice ?? 'auto';
    const requestBody: any = {
      model: config.model,
      messages: conversation,
    };

    if (toolChoice !== 'none' && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = toolChoice;
      requestBody.parallel_tool_calls = true;
    }

    if (config.maxTokens !== undefined) {
      const maxTokensField = this.getMaxTokensField(config.model);
      const capped = this.clampMaxTokens(config.model, config.maxTokens);
      requestBody[maxTokensField] = capped;
      console.log('🧮 Using max tokens:', capped, 'via', maxTokensField);
    }

    if (this.requiresDefaultTemperature(config.model)) {
      console.log('📝 Omitting temperature from request for', config.model);
    } else {
      requestBody.temperature = config.temperature;
      console.log('📝 Using temperature:', config.temperature, 'for', config.model);
    }

    console.log('📤 Sending to OpenAI API:', config.apiEndpoint);

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
      console.error('❌ LLM API Error Response:', error);
      throw new Error(`LLM API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ LLM Raw Response received');
    const parsed = this.parseResponse(data);
    parsed.rawMessage = data.choices?.[0]?.message;
    parsed.conversation = conversation;
    return parsed;
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
          name: 'disconnect_nodes',
          description: 'Disconnect two nodes by removing the edge between them',
          parameters: {
            type: 'object',
            properties: {
              edgeId: {
                type: 'string',
                description: 'ID of the edge to remove',
              },
              sourceId: {
                type: 'string',
                description: 'Source node ID or reference',
              },
              sourceHandle: {
                type: 'string',
                description: 'Source handle name (optional)',
              },
              targetId: {
                type: 'string',
                description: 'Target node ID or reference',
              },
              targetHandle: {
                type: 'string',
                description: 'Target handle name (optional)',
              },
            },
            required: [],
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
    console.log('📊 Parsing LLM Response...');
    
    const message = data.choices[0]?.message;

    const toolCalls: ToolCall[] = [];
    if (message?.tool_calls) {
      console.log(`🔧 Found ${message.tool_calls.length} tool calls in response`);
      
      message.tool_calls.forEach((call: any, index: number) => {
        try {
          const toolCall = {
            id: call.id,
            name: call.function.name,
            parameters: JSON.parse(call.function.arguments),
          };
          console.log(`  Tool ${index + 1}: ${toolCall.name}`, toolCall.parameters);
          toolCalls.push(toolCall);
        } catch (error) {
          console.error(`  ❌ Failed to parse tool call ${index + 1}:`, error, call);
        }
      });
      
      console.log('✅ Successfully parsed all tool calls');
    } else {
      console.log('⚠️ No tool calls found in LLM response');
      console.log('Message content:', message?.content || 'No content');
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

    const response = {
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

    console.log('📝 Final parsed response:', {
      hasText: !!response.text,
      intent: response.intent,
      toolCallsCount: response.toolCalls.length,
      usage: response.usage
    });

    return response;
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

    const messages = this.createConversation(prompt);

    const requestBody: any = {
      model: config.model,
      messages,
      stream: true,
    };

    // Handle parameters based on model
    if (config.maxTokens !== undefined) {
      const maxTokensField = this.getMaxTokensField(config.model);
      const capped = this.clampMaxTokens(config.model, config.maxTokens);
      requestBody[maxTokensField] = capped;
      console.log('🧮 (stream) Using max tokens:', capped, 'via', maxTokensField);
    }
    
    // Only include temperature if the model supports it
    if (this.requiresDefaultTemperature(config.model)) {
      // These models only support temperature=1, so omit it to use default
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
    const newConfig = { ...this.config, ...config };
    
    // Force temperature to 1 for models that don't support other values
    if (this.requiresDefaultTemperature(newConfig.model)) {
      newConfig.temperature = 1;
    }

    newConfig.maxTokens = this.clampMaxTokens(newConfig.model, newConfig.maxTokens ?? this.defaultMaxTokens);
    
    this.config = newConfig;
  }

  getConfig(): LLMConfig {
    return { ...this.config };
  }
}
