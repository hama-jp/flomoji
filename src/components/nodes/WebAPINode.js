/**
 * Web API Node - 汎用的なREST API接続ノード
 * 
 * 任意のWeb APIと通信し、データの取得・送信を行うノード。
 * 認証、リトライ、タイムアウトなどの高度な機能をサポート。
 * 
 * @module WebAPINode
 */

import { createNodeDefinition } from './types.js';

/**
 * Web APIノードの実行関数
 * 
 * @param {Object} data - ノードの設定データ
 * @param {Object} inputs - 入力ポートから受け取ったデータ
 * @returns {Promise<Object>} 実行結果（output, error, response）
 */
export async function executeWebAPINode(data, inputs) {
  const {
    url = '',
    method = 'GET',
    headers = {},
    queryParams = {},
    pathParams = {},
    bodyType = 'json',
    body = '',
    timeout = 30000,
    responseType = 'auto',
    authentication = { type: 'none' },
    retryCount = 0,
    retryDelay = 1000
  } = data;

  // 入力ポートから動的にパラメータを取得（UIの設定より優先）
  const dynamicUrl = inputs.url || url;
  const dynamicHeaders = inputs.headers || headers;
  const dynamicBody = inputs.body || body;
  const dynamicQuery = inputs.query || queryParams;
  const dynamicPath = inputs.path || pathParams;

  if (!dynamicUrl || !dynamicUrl.trim()) {
    throw new Error('URLが指定されていません');
  }
  
  // URL形式の検証
  try {
    new URL(dynamicUrl);
  } catch (e) {
    throw new Error('URLが指定されていません');
  }

  // パスパラメータの置換（{param} または :param 形式に対応）
  let processedUrl = dynamicUrl;
  if (dynamicPath && typeof dynamicPath === 'object') {
    Object.entries(dynamicPath).forEach(([key, value]) => {
      processedUrl = processedUrl.replace(`{${key}}`, encodeURIComponent(value));
      processedUrl = processedUrl.replace(`:${key}`, encodeURIComponent(value));
    });
  }

  // クエリパラメータをURLに追加
  const urlObj = new URL(processedUrl);
  if (dynamicQuery && typeof dynamicQuery === 'object') {
    Object.entries(dynamicQuery).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.append(key, value);
      }
    });
  }

  // ヘッダーの処理（文字列の場合はJSONとしてパース）
  let processedHeaders = {};
  if (typeof dynamicHeaders === 'string') {
    try {
      processedHeaders = JSON.parse(dynamicHeaders);
    } catch (e) {
      console.warn('ヘッダーのパースに失敗、文字列として処理します');
    }
  } else if (typeof dynamicHeaders === 'object') {
    processedHeaders = { ...dynamicHeaders };
  }

  // 認証情報をヘッダーまたはクエリパラメータに追加
  if (authentication.type === 'bearer' && authentication.token) {
    processedHeaders['Authorization'] = `Bearer ${authentication.token}`;
  } else if (authentication.type === 'apikey') {
    if (authentication.headerName) {
      processedHeaders[authentication.headerName] = authentication.apiKey;
    } else {
      urlObj.searchParams.append(authentication.paramName || 'api_key', authentication.apiKey);
    }
  } else if (authentication.type === 'basic' && authentication.username) {
    const credentials = btoa(`${authentication.username}:${authentication.password || ''}`);
    processedHeaders['Authorization'] = `Basic ${credentials}`;
  }

  // リクエストボディの処理（GET/HEAD以外のメソッドで使用）
  let processedBody;
  if (method !== 'GET' && method !== 'HEAD' && dynamicBody) {
    switch (bodyType) {
      case 'json':
        if (typeof dynamicBody === 'object') {
          processedBody = JSON.stringify(dynamicBody);
          processedHeaders['Content-Type'] = processedHeaders['Content-Type'] || 'application/json';
        } else if (typeof dynamicBody === 'string') {
          try {
            JSON.parse(dynamicBody); // 検証のみ
            processedBody = dynamicBody;
            processedHeaders['Content-Type'] = processedHeaders['Content-Type'] || 'application/json';
          } catch {
            processedBody = JSON.stringify(dynamicBody);
            processedHeaders['Content-Type'] = processedHeaders['Content-Type'] || 'application/json';
          }
        }
        break;
      case 'form':
        if (typeof dynamicBody === 'object') {
          const formData = new URLSearchParams();
          Object.entries(dynamicBody).forEach(([key, value]) => {
            formData.append(key, value);
          });
          processedBody = formData.toString();
          processedHeaders['Content-Type'] = processedHeaders['Content-Type'] || 'application/x-www-form-urlencoded';
        } else {
          processedBody = dynamicBody;
          processedHeaders['Content-Type'] = processedHeaders['Content-Type'] || 'application/x-www-form-urlencoded';
        }
        break;
      case 'xml':
        processedBody = dynamicBody;
        processedHeaders['Content-Type'] = processedHeaders['Content-Type'] || 'application/xml';
        break;
      case 'text':
      default:
        processedBody = dynamicBody;
        processedHeaders['Content-Type'] = processedHeaders['Content-Type'] || 'text/plain';
        break;
    }
  }

  // リトライ機能付きでHTTPリクエストを実行
  let lastError;
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    if (attempt > 0) {
      console.log(`リトライ ${attempt}/${retryCount} - ${retryDelay}ms待機中...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestOptions = {
      method,
      headers: processedHeaders,
      signal: controller.signal
    };

    if (processedBody) {
      requestOptions.body = processedBody;
    }

    try {
      console.log('WebAPI Request:', {
        url: urlObj.toString(),
        method,
        headers: processedHeaders,
        body: processedBody ? '(body provided)' : '(no body)'
      });

      const response = await fetch(urlObj.toString(), requestOptions);
      clearTimeout(timeoutId);

      // レスポンスボディを適切な形式で処理
      let responseData;
      const contentType = response.headers.get('content-type') || '';
      
      if (responseType === 'auto') {
        if (contentType.includes('application/json')) {
          responseData = await response.json();
        } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
          responseData = await response.text();
        } else if (contentType.includes('text/html')) {
          responseData = await response.text();
        } else {
          responseData = await response.text();
        }
      } else if (responseType === 'json') {
        responseData = await response.json();
      } else if (responseType === 'text') {
        responseData = await response.text();
      } else if (responseType === 'blob') {
        const blob = await response.blob();
        responseData = {
          type: blob.type,
          size: blob.size,
          data: 'Binary data (not displayed)'
        };
      }

      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        url: urlObj.toString()
      };

      if (!response.ok) {
        console.warn('WebAPI Request failed:', result);
        return {
          output: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          response: result
        };
      }

      return {
        output: responseData,
        error: null,
        response: result
      };

    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      if (error.name === 'AbortError') {
        lastError = new Error(`リクエストタイムアウト (${timeout}ms)`);
      }

      console.error(`WebAPI Request error (attempt ${attempt + 1}):`, error);

      if (attempt === retryCount) {
        throw new Error(`WebAPIエラー: ${lastError.message}`);
      }
    }
  }

  throw lastError;
}

// ノード定義
export const WebAPINode = createNodeDefinition(
  'Web API',
  '🔌',
  'purple',
  ['url', 'headers', 'body', 'query', 'path'],
  ['output', 'error', 'response'],
  {
    url: '',
    method: 'GET',
    headers: {},
    queryParams: {},
    pathParams: {},
    bodyType: 'json',
    body: '',
    timeout: 30000,
    responseType: 'auto',
    authentication: { type: 'none' },
    retryCount: 0,
    retryDelay: 1000
  },
  executeWebAPINode,
  {
    description: 'Generic Web API connector with flexible configuration for any REST API',
    category: 'web-integration',
    configUI: {
      authentication: {
        type: 'select',
        options: [
          { value: 'none', label: 'なし' },
          { value: 'bearer', label: 'Bearer Token' },
          { value: 'apikey', label: 'API Key' },
          { value: 'basic', label: 'Basic認証' }
        ]
      },
      method: {
        type: 'select',
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
      },
      bodyType: {
        type: 'select',
        options: [
          { value: 'json', label: 'JSON' },
          { value: 'form', label: 'Form Data' },
          { value: 'xml', label: 'XML' },
          { value: 'text', label: 'Text' }
        ]
      },
      responseType: {
        type: 'select',
        options: [
          { value: 'auto', label: '自動検出' },
          { value: 'json', label: 'JSON' },
          { value: 'text', label: 'テキスト' },
          { value: 'blob', label: 'バイナリ' }
        ]
      }
    }
  }
);

export default WebAPINode;