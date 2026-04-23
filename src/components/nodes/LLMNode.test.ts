import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/llmService', () => ({
  default: {
    sendMessage: vi.fn(),
    loadSettings: vi.fn(() => ({
      apiKey: 'sk-test',
      baseUrl: '',
      maxTokens: 2048,
    })),
  },
}));

import llmService from '../../services/llmService';
import { buildFinalPrompt, LLMNode } from './LLMNode';

describe('LLMNode', () => {
  beforeEach(() => {
    vi.mocked(llmService.sendMessage).mockReset();
    vi.mocked(llmService.loadSettings).mockClear();
  });

  it('builds a final prompt with prefix and serialized structured inputs', () => {
    const prompt = buildFinalPrompt(
      [
        [{ title: 'OpenAI update', url: 'https://openai.com' }],
        { totalResults: 1 },
      ],
      'Summarize these results'
    );

    expect(prompt).toContain('Summarize these results');
    expect(prompt).toContain('"title": "OpenAI update"');
    expect(prompt).toContain('"totalResults": 1');
  });

  it('sends serialized object inputs to the LLM service', async () => {
    vi.mocked(llmService.sendMessage).mockResolvedValue('digest');

    const result = await LLMNode.execute(
      {
        id: 'llm-1',
        type: 'llm',
        position: { x: 0, y: 0 },
        data: {
          prompt: 'Summarize into a digest',
          model: 'gpt-5-nano',
        },
      },
      {
        input: [{ title: 'OpenAI update' }],
      }
    );

    expect(result).toBe('digest');
    expect(llmService.sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('"title": "OpenAI update"'),
      null,
      expect.objectContaining({
        model: 'gpt-5-nano',
        provider: 'openai',
      })
    );
  });
});
