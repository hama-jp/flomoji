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
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 1024,
        })
      );
    }, apiKey);
  });

  test('suggests a basic workflow for an LLM request', async ({ page }) => {
    test.info().setTimeout(120_000);
    await page.goto('/');

    const copilotButton = page.locator('button:has-text("Copilot")');
    await expect(copilotButton).toBeVisible();
    await copilotButton.click();
    await expect(page.locator('h2:has-text("Workflow Copilot")').first()).toBeVisible();

    const inputArea = page.locator('textarea[placeholder="Ask me to create or improve your workflow..."]');
    await inputArea.fill('Create a workflow that uses an LLM to summarise text');
    const responsePromise = page.waitForResponse((response) => {
      return (
        response.url().includes('/v1/chat/completions') &&
        response.request().method() === 'POST'
      );
    });
    await inputArea.press('Enter');
    await responsePromise;

    await expect(page.getByText('Here is a plan for your workflow.')).toBeVisible();

    const suggestionList = page.locator('[data-testid="copilot-suggestions"]');
    await expect(suggestionList.locator('text=/Add input node/i')).toBeVisible();
    await expect(suggestionList.locator('text=/Add llm node/i')).toBeVisible();
    await expect(suggestionList.locator('text=/Add output node/i')).toBeVisible();

    await expect(suggestionList.locator('text=/Connect .* to .*/i').first()).toBeVisible();
  });
});
