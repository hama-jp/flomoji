/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { executeHTTPRequestNode } from './HTTPRequestNode';
import StorageService from '../../services/storageService';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('HTTPRequestNode templates', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    localStorageMock.clear();
  });

  it('should inject the current LLM API key into the OpenAI template and use POST', async () => {
    StorageService.setSettings({
      apiKey: 'sk-test-key'
    });

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        entries: () => [['content-type', 'application/json']],
        get: () => 'application/json'
      },
      json: async () => ({ ok: true }),
      text: async () => ''
    });

    const result = await executeHTTPRequestNode(
      {
        id: 'http-1',
        type: 'http_request',
        position: { x: 0, y: 0 },
        data: {
          useTemplate: true,
          template: 'openai-completion'
        }
      },
      {
        query: 'hello world'
      }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test-key',
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining('"model":"gpt-5-nano"')
      })
    );
    expect(result.error).toBeNull();
    expect(result.response).toEqual({ ok: true });
  });

  it('should fail fast when required Google template settings are missing', async () => {
    await expect(
      executeHTTPRequestNode(
        {
          id: 'http-1',
          type: 'http_request',
          position: { x: 0, y: 0 },
          data: {
            useTemplate: true,
            template: 'google-search'
          }
        },
        {
          query: 'flomoji'
        }
      )
    ).rejects.toThrow('Google Search API Key が設定されていません');
  });
});
