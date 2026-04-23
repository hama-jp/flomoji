import { describe, expect, it } from 'vitest';

import { buildSearchQuery, mapFreshnessForProvider, normalizeSiteFilters } from './WebSearchNode';

describe('WebSearchNode helpers', () => {
  it('normalizes site filters from mixed input formats', () => {
    expect(
      normalizeSiteFilters('https://www.openai.com/blog\ntechcrunch.com, theverge.com/news')
    ).toEqual(['openai.com', 'techcrunch.com', 'theverge.com']);
  });

  it('builds a site-constrained search query', () => {
    expect(
      buildSearchQuery('AI regulation', ['openai.com', 'techcrunch.com'])
    ).toBe('AI regulation (site:openai.com OR site:techcrunch.com)');
  });

  it('maps freshness windows per provider', () => {
    expect(mapFreshnessForProvider('google', 3)).toEqual({ dateRestrict: 'd3' });
    expect(mapFreshnessForProvider('brave', 7)).toEqual({ freshness: 'pw' });
    expect(mapFreshnessForProvider('bing', 30)).toEqual({ freshness: 'Month' });
  });
});
