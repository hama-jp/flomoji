/**
 * API Template configurations
 * Note: API keys should be configured in Settings, not hardcoded here
 */

export interface APITemplate {
  url: string;
  headers: Record<string, string>;
  body?: any;
  description: string;
  requiredKeys?: string[];
}

export const API_TEMPLATES: Record<string, (query: string, apiKey?: string) => APITemplate> = {
  'google-search': (query: string, apiKey?: string) => ({
    url: `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey || '{API_KEY}'}&cx={SEARCH_ENGINE_ID}`,
    headers: {
      'Accept': 'application/json'
    },
    description: 'Google Custom Search API',
    requiredKeys: ['API_KEY', 'SEARCH_ENGINE_ID']
  }),
  
  'brave-search': (query: string, apiKey?: string) => ({
    url: `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': apiKey || '{API_KEY}'
    },
    description: 'Brave Search API',
    requiredKeys: ['API_KEY']
  }),
  
  'bing-search': (query: string, apiKey?: string) => ({
    url: `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=10`,
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey || '{API_KEY}',
      'Accept': 'application/json'
    },
    description: 'Bing Search API',
    requiredKeys: ['API_KEY']
  }),
  
  'openai-completion': (query: string, apiKey?: string) => ({
    url: 'https://api.openai.com/v1/chat/completions',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey || '{API_KEY}'}`
    },
    body: {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: query }],
      temperature: 0.7
    },
    description: 'OpenAI Chat Completion',
    requiredKeys: ['API_KEY']
  }),
  
  'anthropic-completion': (query: string, apiKey?: string) => ({
    url: 'https://api.anthropic.com/v1/messages',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey || '{API_KEY}',
      'anthropic-version': '2023-06-01'
    },
    body: {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [{ role: 'user', content: query }]
    },
    description: 'Anthropic Claude API',
    requiredKeys: ['API_KEY']
  })
};

/**
 * Check if template has all required keys configured
 */
export function validateTemplateKeys(
  template: APITemplate,
  providedKeys: Record<string, string>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (template.requiredKeys) {
    for (const key of template.requiredKeys) {
      if (!providedKeys[key]) {
        missing.push(key);
      }
    }
  }
  
  // Check for placeholder keys in the template
  const placeholderPattern = /\{([A-Z_]+)\}/g;
  const urlPlaceholders = template.url.match(placeholderPattern) || [];
  const headerPlaceholders = Object.values(template.headers).join(' ').match(placeholderPattern) || [];
  
  const allPlaceholders = [...new Set([...urlPlaceholders, ...headerPlaceholders])];
  
  for (const placeholder of allPlaceholders) {
    const key = placeholder.slice(1, -1); // Remove { and }
    if (!providedKeys[key] && !missing.includes(key)) {
      missing.push(key);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}