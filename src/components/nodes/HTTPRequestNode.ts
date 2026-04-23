import StorageService from '../../services/storageService';
import { createNodeDefinition } from './types';
import type { WorkflowNode, NodeInputs, INodeExecutionContext, NodeOutput } from '../../types';
import type { HTTPRequestNodeData } from '../../types/nodeData';

// HTTPリクエストノードの実行ロジック
export async function executeHTTPRequestNode(node: WorkflowNode, inputs: NodeInputs): Promise<NodeOutput> {
  const data = node.data as HTTPRequestNodeData;
  const { method = 'GET', url, headers = {}, timeout = 30000, useTemplate, template } = data;
  
  // テンプレート使用時の処理
  let finalMethod = method;
  let finalUrl = url;
  let finalHeaders = headers;
  let body = inputs.body || data.body;
  
  if (useTemplate && template) {
    const templateConfig = getTemplateConfig(template || '', (inputs.query as string) || '');
    finalMethod = templateConfig.method || finalMethod;
    finalUrl = templateConfig.url;
    finalHeaders = { ...templateConfig.headers, ...(typeof headers === 'object' && headers !== null ? headers : {}) };
    body = templateConfig.body || body;
  }
  
  // URL検証
  if (!finalUrl || !finalUrl.trim()) {
    throw new Error('URLが指定されていません');
  }
  
  try {
    new URL(finalUrl);
  } catch (e: any) {
    throw new Error(`無効なURL: ${finalUrl}`);
  }
  
  // ヘッダーの処理
  let processedHeaders = {};
  if (typeof finalHeaders === 'string') {
    try {
      processedHeaders = JSON.parse(finalHeaders);
    } catch (e: any) {
      throw new Error('ヘッダーのJSON形式が不正です');
    }
  } else if (typeof finalHeaders === 'object') {
    processedHeaders = finalHeaders;
  }
  
  // リクエストオプション
  const requestOptions: any = {
    method: finalMethod,
    headers: processedHeaders,
  };
  
  // ボディの処理（GET以外）
  if (finalMethod !== 'GET' && body) {
    if (typeof body === 'object') {
      requestOptions.body = JSON.stringify(body);
      const headers = processedHeaders as Record<string, string>;
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    } else {
      requestOptions.body = body;
    }
  }
  
  // タイムアウト処理
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  requestOptions.signal = controller.signal;
  
  try {
    console.log('HTTP Request:', { url: finalUrl, ...requestOptions });
    
    const response = await fetch(finalUrl, requestOptions);
    clearTimeout(timeoutId);
    
    const responseData: any = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    };
    
    // レスポンスボディの処理
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData.body = await response.json();
    } else {
      responseData.body = await response.text();
    }
    
    if (!response.ok) {
      console.warn('HTTP Request failed:', responseData);
      return {
        response: null,
        error: `HTTP ${response.status}: ${response.statusText}`,
        metadata: responseData
      };
    }
    
    return {
      response: responseData.body,
      error: null,
      metadata: {
        status: responseData.status,
        headers: responseData.headers
      }
    };
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`リクエストタイムアウト (${timeout}ms)`);
    }
    
    throw new Error(`HTTPリクエストエラー: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// テンプレート設定を取得
type HTTPTemplateConfig = {
  method?: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  description: string;
};

function requireSetting(value: string | undefined, label: string): string {
  if (!value || !value.trim()) {
    throw new Error(`${label} が設定されていません。設定画面で値を保存してください。`);
  }

  return value;
}

function getTemplateConfig(templateName: string, query: string): HTTPTemplateConfig {
  const settings = StorageService.getSettings({});

  switch (templateName) {
    case 'google-search': {
      const apiKey = requireSetting(settings.googleApiKey, 'Google Search API Key');
      const searchEngineId = requireSetting(settings.googleSearchEngineId, 'Google Search Engine ID');

      return {
        method: 'GET',
        url: `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(searchEngineId)}`,
        headers: {
          'Accept': 'application/json'
        },
        description: 'Google Custom Search API'
      };
    }

    case 'brave-search': {
      const apiKey = requireSetting(settings.braveApiKey, 'Brave Search API Key');

      return {
        method: 'GET',
        url: `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey
        },
        description: 'Brave Search API'
      };
    }

    case 'bing-search': {
      const apiKey = requireSetting(settings.bingApiKey, 'Bing Search API Key');

      return {
        method: 'GET',
        url: `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=10`,
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Accept': 'application/json'
        },
        description: 'Bing Search API'
      };
    }

    case 'openai-completion': {
      const apiKey = requireSetting(settings.apiKey, 'Current LLM API Key');

      return {
        method: 'POST',
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: {
          model: 'gpt-5-nano',
          messages: [{ role: 'user', content: query }],
          temperature: 0.7
        },
        description: 'OpenAI Chat Completion'
      };
    }

    case 'anthropic-completion': {
      const apiKey = requireSetting(settings.apiKey, 'Current LLM API Key');

      return {
        method: 'POST',
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{ role: 'user', content: query }]
        },
        description: 'Anthropic Claude API'
      };
    }

    default:
      throw new Error(`未知のテンプレート: ${templateName}`);
  }
}

// ノード定義
export const HTTPRequestNode = createNodeDefinition(
  'HTTP Request',
  '🌐',
  'blue',
  ['body', 'query'], // オプショナル入力
  ['response', 'error', 'metadata'],
  {
    method: 'GET',
    url: '',
    headers: '{}',
    body: '',
    timeout: 30000,
    useTemplate: false,
    template: null
  },
  executeHTTPRequestNode,
  {
    description: 'Send HTTP requests to any API endpoint. Supports templates for common APIs.',
    category: 'web-integration',
    outputMapping: {
      response: 'response',
      error: 'error',
      metadata: 'metadata'
    }
  }
);

// テンプレートリストを公開
export const HTTP_TEMPLATES = [
  { value: 'google-search', label: 'Google Search API' },
  { value: 'brave-search', label: 'Brave Search API' },
  { value: 'bing-search', label: 'Bing Search API' },
  { value: 'openai-completion', label: 'OpenAI Chat' },
  { value: 'anthropic-completion', label: 'Anthropic Claude' }
];

export default HTTPRequestNode;
