import { createNodeDefinition } from './types.js';

// HTTPリクエストノードの実行ロジック
export async function executeHTTPRequestNode(data, inputs) {
  const { method = 'GET', url, headers = {}, timeout = 30000, useTemplate, template } = data;
  
  // テンプレート使用時の処理
  let finalUrl = url;
  let finalHeaders = headers;
  let body = inputs.body || data.body;
  
  if (useTemplate && template) {
    const templateConfig = getTemplateConfig(template, inputs.query || '');
    finalUrl = templateConfig.url;
    finalHeaders = { ...templateConfig.headers, ...headers };
    body = templateConfig.body || body;
  }
  
  // URL検証
  if (!finalUrl || !finalUrl.trim()) {
    throw new Error('URLが指定されていません');
  }
  
  try {
    new URL(finalUrl);
  } catch (e) {
    throw new Error(`無効なURL: ${finalUrl}`);
  }
  
  // ヘッダーの処理
  let processedHeaders = {};
  if (typeof finalHeaders === 'string') {
    try {
      processedHeaders = JSON.parse(finalHeaders);
    } catch (e) {
      throw new Error('ヘッダーのJSON形式が不正です');
    }
  } else if (typeof finalHeaders === 'object') {
    processedHeaders = finalHeaders;
  }
  
  // リクエストオプション
  const requestOptions = {
    method,
    headers: processedHeaders,
  };
  
  // ボディの処理（GET以外）
  if (method !== 'GET' && body) {
    if (typeof body === 'object') {
      requestOptions.body = JSON.stringify(body);
      if (!processedHeaders['Content-Type']) {
        processedHeaders['Content-Type'] = 'application/json';
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
    
    const responseData = {
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
        details: responseData
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
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`リクエストタイムアウト (${timeout}ms)`);
    }
    
    throw new Error(`HTTPリクエストエラー: ${error.message}`);
  }
}

// テンプレート設定を取得
function getTemplateConfig(templateName, query) {
  const templates = {
    'google-search': {
      url: `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=YOUR_API_KEY&cx=YOUR_SEARCH_ENGINE_ID`,
      headers: {
        'Accept': 'application/json'
      },
      description: 'Google Custom Search API'
    },
    'brave-search': {
      url: `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': 'YOUR_API_KEY'
      },
      description: 'Brave Search API'
    },
    'bing-search': {
      url: `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=10`,
      headers: {
        'Ocp-Apim-Subscription-Key': 'YOUR_API_KEY',
        'Accept': 'application/json'
      },
      description: 'Bing Search API'
    },
    'openai-completion': {
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
      },
      body: {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: query }],
        temperature: 0.7
      },
      description: 'OpenAI Chat Completion'
    },
    'anthropic-completion': {
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_API_KEY',
        'anthropic-version': '2023-06-01'
      },
      body: {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: [{ role: 'user', content: query }]
      },
      description: 'Anthropic Claude API'
    }
  };
  
  const template = templates[templateName];
  if (!template) {
    throw new Error(`未知のテンプレート: ${templateName}`);
  }
  
  return template;
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
    category: 'web-integration'
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