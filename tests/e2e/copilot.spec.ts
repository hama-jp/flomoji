import { test, expect } from '@playwright/test';

const OPENAI_COMPLETIONS_ROUTE = '**/v1/chat/completions';

test.describe('Workflow Copilot', () => {
  test.beforeEach(async ({ page }) => {
    const apiKey =
      process.env.PLAYWRIGHT_OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.VITE_OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'OPENAI API key not provided. Set PLAYWRIGHT_OPENAI_API_KEY or OPENAI_API_KEY before running this test.'
      );
    }

    await page.addInitScript((key) => {
      window.localStorage.setItem(
        'llm-agent-settings',
        JSON.stringify({
          provider: 'openai',
          apiKey: key,
          baseUrl: '',
          model: 'gpt-5-mini',
          temperature: 0.7,
          maxTokens: 1024,
        })
      );
    }, apiKey);
  });

  test('suggests a basic workflow for an LLM request', async ({ page }) => {
    test.info().setTimeout(120_000);

    // Mock the OpenAI API response
    await page.route(OPENAI_COMPLETIONS_ROUTE, async (route) => {
      const mockToolCalls = [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'add_node', arguments: JSON.stringify({ type: 'input', data: { label: 'Input Node' } }) },
        },
        {
          id: 'call_2',
          type: 'function',
          function: { name: 'add_node', arguments: JSON.stringify({ type: 'llm', data: { label: 'LLM Node' } }) },
        },
        {
          id: 'call_3',
          type: 'function',
          function: { name: 'add_node', arguments: JSON.stringify({ type: 'output', data: { label: 'Output Node' } }) },
        },
        {
          id: 'call_4',
          type: 'function',
          function: { name: 'connect_nodes', arguments: JSON.stringify({ sourceId: 'node-1', targetId: 'node-2' }) },
        },
      ];

      const json = {
        id: 'chatcmpl-mock-id',
        object: 'chat.completion',
        created: Date.now() / 1000,
        model: 'gpt-5-mini',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'I have devised a plan for your workflow.',
              tool_calls: mockToolCalls,
            },
            finish_reason: 'tool_calls',
          },
        ],
      };
      await route.fulfill({ json });
    });

    await page.goto('/');

    const copilotButton = page.locator('button:has-text("Copilot")');
    await expect(copilotButton).toBeVisible();
    await copilotButton.click();
    await expect(page.locator('h2:has-text("Workflow Copilot")').first()).toBeVisible();

    const inputArea = page.locator('textarea[placeholder="Ask me to create or improve your workflow..."]');
    await inputArea.fill('Create a workflow that uses an LLM to summarise text');
    await inputArea.press('Enter');

    // Assert that the plan is visible
    await expect(page.getByText(/plan/i).first()).toBeVisible();

    // Assert that all suggestions are rendered correctly
    const suggestionList = page.locator('[data-testid="copilot-suggestions"]');
    await expect(suggestionList.locator('text=/Add input node/i').first()).toBeVisible();
    await expect(suggestionList.locator('text=/Add llm node/i').first()).toBeVisible();
    await expect(suggestionList.locator('text=/Add output node/i').first()).toBeVisible();
    await expect(suggestionList.locator('text=/Connect .* to .*/i').first()).toBeVisible();
  });
});
