import { createNodeDefinition } from './types.js';
import StorageService from '../../services/storageService.js';

// キャッシュストレージ（メモリキャッシュ）
const searchCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1時間

// Web検索ノードの実行ロジック
export async function executeWebSearchNode(data, inputs) {
  const { 
    provider = 'google',
    apiKey,
    maxResults = 10,
    safeSearch = true,
    language = 'ja',
    cacheEnabled = true
  } = data;
  
  const query = inputs.query || data.query;
  
  if (!query || !query.trim()) {
    throw new Error('検索クエリが指定されていません');
  }
  
  // APIキーの取得（設定から取得するか、ノードデータから）
  const finalApiKey = apiKey || getApiKeyFromSettings(provider);
  
  if (!finalApiKey) {
    throw new Error(`${provider}のAPIキーが設定されていません。設定画面でAPIキーを入力してください。`);
  }
  
  // キャッシュチェック
  const cacheKey = `${provider}:${query}:${maxResults}:${language}`;
  if (cacheEnabled && searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Using cached search results for:', query);
      return cached.data;
    }
    searchCache.delete(cacheKey);
  }
  
  try {
    let results;
    
    switch (provider) {
      case 'google':
        results = await searchGoogle(query, finalApiKey, maxResults, language, safeSearch);
        break;
      case 'brave':
        results = await searchBrave(query, finalApiKey, maxResults, language, safeSearch);
        break;
      case 'bing':
        results = await searchBing(query, finalApiKey, maxResults, language, safeSearch);
        break;
      default:
        throw new Error(`未対応の検索プロバイダー: ${provider}`);
    }
    
    // 結果の正規化
    const normalizedResults = normalizeResults(results, provider);
    
    // レスポンス構造
    const response = {
      results: normalizedResults.results,
      metadata: {
        query,
        provider,
        totalResults: normalizedResults.totalResults,
        searchTime: normalizedResults.searchTime || 0,
        cached: false
      },
      error: null
    };
    
    // キャッシュに保存
    if (cacheEnabled) {
      searchCache.set(cacheKey, {
        timestamp: Date.now(),
        data: response
      });
    }
    
    return response;
    
  } catch (error) {
    console.error('Search error:', error);
    return {
      results: [],
      metadata: {
        query,
        provider,
        error: true
      },
      error: error.message
    };
  }
}

// Google Custom Search API
async function searchGoogle(query, apiKey, maxResults, language, safeSearch) {
  const searchEngineId = getSearchEngineId('google');
  if (!searchEngineId) {
    throw new Error('Google検索エンジンIDが設定されていません');
  }
  
  const params = new URLSearchParams({
    q: query,
    key: apiKey,
    cx: searchEngineId,
    num: Math.min(maxResults, 10), // Google APIは最大10件
    hl: language,
    safe: safeSearch ? 'active' : 'off'
  });
  
  const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Google API error: ${response.status}`);
  }
  
  return await response.json();
}

// Brave Search API
async function searchBrave(query, apiKey, maxResults, language, safeSearch) {
  const params = new URLSearchParams({
    q: query,
    count: Math.min(maxResults, 20), // Brave APIは最大20件
    search_lang: language,
    safesearch: safeSearch ? 'strict' : 'off'
  });
  
  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': apiKey
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Brave API error: ${response.status} - ${error}`);
  }
  
  return await response.json();
}

// Bing Search API
async function searchBing(query, apiKey, maxResults, language, safeSearch) {
  const params = new URLSearchParams({
    q: query,
    count: Math.min(maxResults, 50), // Bing APIは最大50件
    mkt: language === 'ja' ? 'ja-JP' : 'en-US',
    safeSearch: safeSearch ? 'Strict' : 'Off'
  });
  
  const response = await fetch(`https://api.bing.microsoft.com/v7.0/search?${params}`, {
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Bing API error: ${response.status}`);
  }
  
  return await response.json();
}

// 結果の正規化
function normalizeResults(rawResults, provider) {
  let results = [];
  let totalResults = 0;
  let searchTime = 0;
  
  switch (provider) {
    case 'google':
      results = (rawResults.items || []).map(item => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        thumbnail: item.pagemap?.cse_thumbnail?.[0]?.src || null
      }));
      totalResults = parseInt(rawResults.searchInformation?.totalResults || 0);
      searchTime = rawResults.searchInformation?.searchTime || 0;
      break;
      
    case 'brave':
      results = (rawResults.web?.results || []).map(item => ({
        title: item.title,
        url: item.url,
        snippet: item.description,
        thumbnail: item.thumbnail?.src || null
      }));
      totalResults = rawResults.web?.results?.length || 0;
      break;
      
    case 'bing':
      results = (rawResults.webPages?.value || []).map(item => ({
        title: item.name,
        url: item.url,
        snippet: item.snippet,
        thumbnail: null // Bingは基本APIでサムネイルを提供しない
      }));
      totalResults = rawResults.webPages?.totalEstimatedMatches || 0;
      break;
  }
  
  return { results, totalResults, searchTime };
}

// 設定からAPIキーを取得
function getApiKeyFromSettings(provider) {
  const settings = StorageService.getSettings({});
  return settings[`${provider}ApiKey`] || null;
}

// 検索エンジンIDを取得（Google用）
function getSearchEngineId(provider) {
  if (provider !== 'google') return null;
  const settings = StorageService.getSettings({});
  return settings.googleSearchEngineId || null;
}

// キャッシュをクリア
export function clearSearchCache() {
  searchCache.clear();
  console.log('Search cache cleared');
}

// ノード定義
export const WebSearchNode = createNodeDefinition(
  'Web Search',
  '🔍',
  'teal',
  ['query'],
  ['results', 'metadata', 'error'],
  {
    provider: 'google',
    apiKey: '',
    query: '',
    maxResults: 10,
    safeSearch: true,
    language: 'ja',
    cacheEnabled: true
  },
  executeWebSearchNode,
  {
    description: 'Search the web using Google, Brave, or Bing APIs. Returns normalized results.',
    category: 'web-integration'
  }
);

// 検索プロバイダーリスト
export const SEARCH_PROVIDERS = [
  { value: 'google', label: 'Google Search' },
  { value: 'brave', label: 'Brave Search' },
  { value: 'bing', label: 'Bing Search' }
];

export default WebSearchNode;