import StorageService from '../../services/storageService';
import { createNodeDefinition } from './types';
import type { WorkflowNode, NodeInputs, INodeExecutionContext, NodeOutput } from '../../types';
import type { WebSearchNodeData } from '../../types/nodeData';

// キャッシュストレージ（メモリキャッシュ）
const searchCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1時間

const DOMAIN_SEPARATOR = /[\n,]+/;

function sanitizeSiteFilter(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '');
}

export function normalizeSiteFilters(siteFilters?: string | string[]): string[] {
  if (!siteFilters) {
    return [];
  }

  const rawValues = Array.isArray(siteFilters)
    ? siteFilters
    : siteFilters.split(DOMAIN_SEPARATOR);

  return rawValues
    .map(sanitizeSiteFilter)
    .filter(Boolean);
}

export function buildSearchQuery(query: string, siteFilters?: string | string[]): string {
  const baseQuery = query.trim();
  const normalizedSites = normalizeSiteFilters(siteFilters);

  if (normalizedSites.length === 0) {
    return baseQuery;
  }

  const siteClause = normalizedSites.map((site) => `site:${site}`).join(' OR ');
  return `${baseQuery} (${siteClause})`;
}

export function mapFreshnessForProvider(provider: string, freshnessDays?: number): Record<string, string> {
  if (!freshnessDays || freshnessDays < 1) {
    return {};
  }

  switch (provider) {
    case 'google':
      return { dateRestrict: `d${freshnessDays}` };
    case 'brave':
      if (freshnessDays <= 1) return { freshness: 'pd' };
      if (freshnessDays <= 7) return { freshness: 'pw' };
      if (freshnessDays <= 31) return { freshness: 'pm' };
      return { freshness: 'py' };
    case 'bing':
      if (freshnessDays <= 1) return { freshness: 'Day' };
      if (freshnessDays <= 7) return { freshness: 'Week' };
      return { freshness: 'Month' };
    default:
      return {};
  }
}

// Web検索ノードの実行ロジック
export async function executeWebSearchNode(node: WorkflowNode, inputs: NodeInputs): Promise<NodeOutput> {
  const data = node.data as WebSearchNodeData;
  const { 
    provider = 'google',
    apiKey,
    maxResults = 10,
    safeSearch = true,
    language = 'ja',
    cacheEnabled = true,
    siteFilters,
    freshnessDays
  } = data;
  
  const rawQuery = inputs.query ?? data.query ?? '';
  const query = typeof rawQuery === 'string' ? rawQuery : String(rawQuery);
  
  if (!query || !query.trim()) {
    throw new Error('検索クエリが指定されていません');
  }
  
  // APIキーの取得（設定から取得するか、ノードデータから）
  const finalApiKey = apiKey || getApiKeyFromSettings(provider);
  
  if (!finalApiKey) {
    throw new Error(`${provider}のAPIキーが設定されていません。設定画面でAPIキーを入力してください。`);
  }

  const normalizedSites = normalizeSiteFilters(siteFilters);
  const effectiveQuery = buildSearchQuery(query, normalizedSites);
  
  // キャッシュチェック
  const cacheKey = `${provider}:${effectiveQuery}:${maxResults}:${language}:${freshnessDays || 'all'}`;
  if (cacheEnabled && searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Using cached search results for:', effectiveQuery);
      return cached.data;
    }
    searchCache.delete(cacheKey);
  }
  
  try {
    let results;
    
    switch (provider) {
      case 'google':
        results = await searchGoogle(effectiveQuery, finalApiKey, maxResults, language, safeSearch, freshnessDays);
        break;
      case 'brave':
        results = await searchBrave(effectiveQuery, finalApiKey, maxResults, language, safeSearch, freshnessDays);
        break;
      case 'bing':
        results = await searchBing(effectiveQuery, finalApiKey, maxResults, language, safeSearch, freshnessDays);
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
        effectiveQuery,
        provider,
        totalResults: normalizedResults.totalResults,
        searchTime: normalizedResults.searchTime || 0,
        siteFilters: normalizedSites,
        freshnessDays: freshnessDays || null,
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
    
  } catch (error: any) {
    console.error('Search error:', error);
    return {
      results: [],
      metadata: {
        query,
        effectiveQuery,
        provider,
        siteFilters: normalizedSites,
        freshnessDays: freshnessDays || null,
        error: true
      },
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Google Custom Search API
async function searchGoogle(query: string, apiKey: string, maxResults: number, language: string, safeSearch: boolean, freshnessDays?: number): Promise<any> {
  const searchEngineId = getSearchEngineId('google');
  if (!searchEngineId) {
    throw new Error('Google検索エンジンIDが設定されていません');
  }
  
  const params = new URLSearchParams({
    q: query,
    key: apiKey,
    cx: searchEngineId,
    num: Math.min(maxResults, 10).toString(), // Google APIは最大10件
    hl: language,
    safe: safeSearch ? 'active' : 'off'
  });

  const freshnessOptions = mapFreshnessForProvider('google', freshnessDays);
  if (freshnessOptions.dateRestrict) {
    params.set('dateRestrict', freshnessOptions.dateRestrict);
  }
  
  const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Google API error: ${response.status}`);
  }
  
  return await response.json();
}

// Brave Search API
async function searchBrave(query: string, apiKey: string, maxResults: number, language: string, safeSearch: boolean, freshnessDays?: number): Promise<any> {
  const params = new URLSearchParams({
    q: query,
    count: Math.min(maxResults, 20).toString(), // Brave APIは最大20件
    search_lang: language,
    safesearch: safeSearch ? 'strict' : 'off'
  });

  const freshnessOptions = mapFreshnessForProvider('brave', freshnessDays);
  if (freshnessOptions.freshness) {
    params.set('freshness', freshnessOptions.freshness);
  }
  
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
async function searchBing(query: string, apiKey: string, maxResults: number, language: string, safeSearch: boolean, freshnessDays?: number): Promise<any> {
  const params = new URLSearchParams({
    q: query,
    count: Math.min(maxResults, 50).toString(), // Bing APIは最大50件
    mkt: language === 'ja' ? 'ja-JP' : 'en-US',
    safeSearch: safeSearch ? 'Strict' : 'Off'
  });

  const freshnessOptions = mapFreshnessForProvider('bing', freshnessDays);
  if (freshnessOptions.freshness) {
    params.set('freshness', freshnessOptions.freshness);
  }
  
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
function normalizeResults(rawResults: any, provider: string): any {
  let results = [];
  let totalResults = 0;
  let searchTime = 0;
  
  switch (provider) {
    case 'google':
      results = (rawResults.items || []).map((item: any) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        thumbnail: item.pagemap?.cse_thumbnail?.[0]?.src || null
      }));
      totalResults = parseInt(rawResults.searchInformation?.totalResults || 0);
      searchTime = rawResults.searchInformation?.searchTime || 0;
      break;
      
    case 'brave':
      results = (rawResults.web?.results || []).map((item: any) => ({
        title: item.title,
        url: item.url,
        snippet: item.description,
        thumbnail: item.thumbnail?.src || null
      }));
      totalResults = rawResults.web?.results?.length || 0;
      break;
      
    case 'bing':
      results = (rawResults.webPages?.value || []).map((item: any) => ({
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
function getApiKeyFromSettings(provider: string): string | null {
  const settings = StorageService.getSettings({});
  const keyMap: Record<string, keyof typeof settings> = {
    google: 'googleApiKey',
    brave: 'braveApiKey',
    bing: 'bingApiKey'
  };
  const key = keyMap[provider];
  return key ? (settings[key] as string | undefined) || null : null;
}

// 検索エンジンIDを取得（Google用）
function getSearchEngineId(provider: string): string | null {
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
    cacheEnabled: true,
    siteFilters: '',
    freshnessDays: 3
  },
  executeWebSearchNode,
  {
    description: 'Search the web using Google, Brave, or Bing APIs with optional site filters and recency windows. Returns normalized results.',
    category: 'web-integration',
    outputMapping: {
      results: 'results',
      metadata: 'metadata',
      error: 'error'
    }
  }
);

// 検索プロバイダーリスト
export const SEARCH_PROVIDERS = [
  { value: 'google', label: 'Google Search' },
  { value: 'brave', label: 'Brave Search' },
  { value: 'bing', label: 'Bing Search' }
];

export default WebSearchNode;
