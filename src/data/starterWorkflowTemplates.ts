import type { Workflow } from '../types';

export interface StarterWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  setupLabel: string;
  highlights: string[];
  icon: string;
  workflow: Pick<Workflow, 'name' | 'description' | 'flow'>;
}

export const starterWorkflowTemplates: StarterWorkflowTemplate[] = [
  {
    id: 'prompt-assistant',
    name: 'Prompt Assistant',
    description: 'Take one text input, send it to the configured LLM, and download the answer.',
    setupLabel: 'Requires LLM API key',
    highlights: ['Fastest way to test your model setup', 'Good default for drafting and rewriting'],
    icon: '🤖',
    workflow: {
      name: 'Prompt Assistant',
      description: 'Simple input to LLM to output workflow.',
      flow: {
        nodes: [
          {
            id: 'input_prompt',
            type: 'input',
            position: { x: 120, y: 180 },
            data: {
              label: 'Prompt',
              value: 'Summarize this note into three clear bullet points.',
              inputType: 'text',
              width: 220,
              height: 160
            }
          },
          {
            id: 'llm_response',
            type: 'llm',
            position: { x: 450, y: 160 },
            data: {
              label: 'Generate Response',
              systemPrompt: 'You are a practical writing assistant. Produce concise, readable output.',
              prompt: 'Respond to the following request:',
              temperature: 0.5,
              model: 'gpt-5-nano',
              width: 300,
              height: 220
            }
          },
          {
            id: 'output_response',
            type: 'output',
            position: { x: 820, y: 180 },
            data: {
              label: 'Result',
              format: 'markdown',
              title: 'LLM Response',
              fileName: 'prompt-assistant-result',
              width: 240,
              height: 180
            }
          }
        ],
        edges: [
          {
            id: 'conn_prompt_to_llm',
            source: 'input_prompt',
            target: 'llm_response',
            sourceHandle: '0',
            targetHandle: '0'
          },
          {
            id: 'conn_llm_to_output',
            source: 'llm_response',
            target: 'output_response',
            sourceHandle: '0',
            targetHandle: '0'
          }
        ],
        viewport: { x: 0, y: 0, zoom: 0.9 }
      }
    }
  },
  {
    id: 'ai-writing-assistant',
    name: 'Writing Assistant',
    description: 'Turn a topic and keywords into an outline, then expand it into a full article.',
    setupLabel: 'Requires LLM API key',
    highlights: ['Shows multi-step chaining', 'Useful for blog drafts and briefing docs'],
    icon: '✍️',
    workflow: {
      name: 'Writing Assistant',
      description: 'Two-step article drafting workflow.',
      flow: {
        nodes: [
          {
            id: 'input_topic',
            type: 'input',
            position: { x: 50, y: 100 },
            data: {
              label: 'Article Topic',
              value: 'The Future of Web Development',
              inputType: 'text',
              width: 200,
              height: 150
            }
          },
          {
            id: 'input_keywords',
            type: 'input',
            position: { x: 50, y: 300 },
            data: {
              label: 'Keywords',
              value: 'React, TypeScript, AI, automation',
              inputType: 'text',
              width: 200,
              height: 150
            }
          },
          {
            id: 'combiner_outline',
            type: 'text_combiner',
            position: { x: 320, y: 200 },
            data: {
              label: 'Create Outline Request',
              separator: '\n\nKeywords: ',
              width: 220,
              height: 180
            }
          },
          {
            id: 'llm_outline',
            type: 'llm',
            position: { x: 600, y: 200 },
            data: {
              label: 'Generate Outline',
              systemPrompt: 'You are a professional content writer. Create detailed article outlines with engaging titles, clear structure, and comprehensive sections.',
              prompt: 'Create a detailed article outline for the following topic and keywords:',
              temperature: 0.7,
              model: 'gpt-5-nano',
              width: 320,
              height: 240
            }
          },
          {
            id: 'llm_content',
            type: 'llm',
            position: { x: 980, y: 200 },
            data: {
              label: 'Write Article',
              systemPrompt: 'You are an expert technical writer. Transform the provided outline into a well-structured, informative article. Use clear explanations, practical examples, and engaging language suitable for developers.',
              prompt: 'Based on this outline, write a comprehensive article:',
              temperature: 0.8,
              model: 'gpt-5-nano',
              width: 320,
              height: 240
            }
          },
          {
            id: 'output_article',
            type: 'output',
            position: { x: 1350, y: 225 },
            data: {
              label: 'Final Article',
              format: 'markdown',
              title: 'Generated Article',
              fileName: 'writing-assistant-article',
              width: 250,
              height: 180
            }
          }
        ],
        edges: [
          { id: 'conn_1', source: 'input_topic', target: 'combiner_outline', sourceHandle: '0', targetHandle: '0' },
          { id: 'conn_2', source: 'input_keywords', target: 'combiner_outline', sourceHandle: '0', targetHandle: '1' },
          { id: 'conn_3', source: 'combiner_outline', target: 'llm_outline', sourceHandle: '0', targetHandle: '0' },
          { id: 'conn_4', source: 'llm_outline', target: 'llm_content', sourceHandle: '0', targetHandle: '0' },
          { id: 'conn_5', source: 'llm_content', target: 'output_article', sourceHandle: '0', targetHandle: '0' }
        ],
        viewport: { x: 0, y: 0, zoom: 0.8 }
      }
    }
  },
  {
    id: 'news-monitor-digest',
    name: 'News Monitor Digest',
    description: 'Search recent coverage from selected sites and turn it into a scheduled morning digest.',
    setupLabel: 'Requires search + LLM API keys',
    highlights: ['Weekday schedule node included', 'Site filters and recent-days search are preconfigured'],
    icon: '🗞️',
    workflow: {
      name: 'News Monitor Digest',
      description: 'Collect recent articles and summarize them into a daily research digest.',
      flow: {
        nodes: [
          {
            id: 'schedule_digest',
            type: 'schedule',
            position: { x: 40, y: 170 },
            data: {
              label: 'Weekday Schedule',
              cronExpression: '0 8 * * 1-5',
              scheduleName: 'Weekday News Digest',
              enabled: false,
              timeoutMinutes: 20,
              timezone: 'Asia/Tokyo',
              width: 240,
              height: 180
            }
          },
          {
            id: 'input_topic',
            type: 'input',
            position: { x: 320, y: 170 },
            data: {
              label: 'Research Topic',
              value: '生成AI OR LLM OR AI agent',
              inputType: 'text',
              width: 240,
              height: 170
            }
          },
          {
            id: 'search_news',
            type: 'web_search',
            position: { x: 650, y: 145 },
            data: {
              label: 'Search Latest Coverage',
              provider: 'brave',
              query: '',
              maxResults: 8,
              safeSearch: true,
              language: 'ja',
              cacheEnabled: true,
              siteFilters: 'openai.com\ntechcrunch.com\ntheverge.com',
              freshnessDays: 3,
              width: 320,
              height: 280
            }
          },
          {
            id: 'llm_digest',
            type: 'llm',
            position: { x: 1030, y: 145 },
            data: {
              label: 'Summarize Digest',
              prompt: 'Create a concise markdown research digest from the search results. For each important item, include the source, what happened, why it matters, and one follow-up angle to watch next.',
              systemPrompt: 'You are a practical research analyst. Write compact, source-aware digests in Japanese and avoid repeating the same article.',
              temperature: 0.3,
              model: 'gpt-5-nano',
              width: 320,
              height: 260
            }
          },
          {
            id: 'output_digest',
            type: 'output',
            position: { x: 1400, y: 180 },
            data: {
              label: 'Digest Output',
              format: 'markdown',
              title: 'Daily News Digest',
              fileName: 'daily-news-digest',
              width: 250,
              height: 180
            }
          }
        ],
        edges: [
          {
            id: 'conn_news_topic',
            source: 'input_topic',
            target: 'search_news',
            sourceHandle: '0',
            targetHandle: 'query'
          },
          {
            id: 'conn_news_results',
            source: 'search_news',
            target: 'llm_digest',
            sourceHandle: 'results',
            targetHandle: '0'
          },
          {
            id: 'conn_news_digest_output',
            source: 'llm_digest',
            target: 'output_digest',
            sourceHandle: '0',
            targetHandle: '0'
          }
        ],
        viewport: { x: 0, y: 0, zoom: 0.8 }
      }
    }
  },
  {
    id: 'site-watch-briefing',
    name: 'Site Watch Briefing',
    description: 'Track a specific company or product across target domains and produce a briefing note.',
    setupLabel: 'Requires search + LLM API keys',
    highlights: ['Useful for competitor or product watch', 'Ready to narrow searches to specific domains'],
    icon: '📡',
    workflow: {
      name: 'Site Watch Briefing',
      description: 'Monitor specific domains for product or company updates.',
      flow: {
        nodes: [
          {
            id: 'schedule_site_watch',
            type: 'schedule',
            position: { x: 60, y: 200 },
            data: {
              label: 'Daily Schedule',
              cronExpression: '0 12 * * 1-5',
              scheduleName: 'Site Watch Briefing',
              enabled: false,
              timeoutMinutes: 20,
              timezone: 'Asia/Tokyo',
              width: 240,
              height: 180
            }
          },
          {
            id: 'input_watch_query',
            type: 'input',
            position: { x: 340, y: 200 },
            data: {
              label: 'Watch Query',
              value: 'OpenAI launches OR ChatGPT update OR GPT-5',
              inputType: 'text',
              width: 240,
              height: 170
            }
          },
          {
            id: 'search_site_watch',
            type: 'web_search',
            position: { x: 670, y: 175 },
            data: {
              label: 'Search Target Sites',
              provider: 'brave',
              query: '',
              maxResults: 6,
              safeSearch: true,
              language: 'en',
              cacheEnabled: true,
              siteFilters: 'openai.com\nhelp.openai.com\nplatform.openai.com',
              freshnessDays: 7,
              width: 320,
              height: 280
            }
          },
          {
            id: 'llm_site_watch',
            type: 'llm',
            position: { x: 1050, y: 175 },
            data: {
              label: 'Generate Briefing',
              prompt: 'Turn these search results into a briefing note. Use sections for Changes, Evidence, Potential Impact, and Next Checks. Include source names and links in markdown.',
              systemPrompt: 'You write concise briefing notes for product and competitive monitoring. Be factual, avoid hype, and make the next action obvious.',
              temperature: 0.2,
              model: 'gpt-5-nano',
              width: 320,
              height: 260
            }
          },
          {
            id: 'output_site_watch',
            type: 'output',
            position: { x: 1420, y: 210 },
            data: {
              label: 'Briefing Output',
              format: 'markdown',
              title: 'Site Watch Briefing',
              fileName: 'site-watch-briefing',
              width: 250,
              height: 180
            }
          }
        ],
        edges: [
          {
            id: 'conn_watch_query',
            source: 'input_watch_query',
            target: 'search_site_watch',
            sourceHandle: '0',
            targetHandle: 'query'
          },
          {
            id: 'conn_watch_results',
            source: 'search_site_watch',
            target: 'llm_site_watch',
            sourceHandle: 'results',
            targetHandle: '0'
          },
          {
            id: 'conn_watch_output',
            source: 'llm_site_watch',
            target: 'output_site_watch',
            sourceHandle: '0',
            targetHandle: '0'
          }
        ],
        viewport: { x: 0, y: 0, zoom: 0.78 }
      }
    }
  },
  {
    id: 'simple-input-output',
    name: 'Simple Input/Output',
    description: 'Start with the smallest possible workflow and verify that data moves through the graph.',
    setupLabel: 'No API key required',
    highlights: ['Good for learning the editor', 'Works fully offline'],
    icon: '🌱',
    workflow: {
      name: 'Simple Input/Output',
      description: 'Minimal starter workflow.',
      flow: {
        nodes: [
          {
            id: 'input_1',
            type: 'input',
            position: { x: 100, y: 150 },
            data: {
              label: 'Input',
              value: 'Hello, World!',
              inputType: 'text',
              width: 180,
              height: 168
            }
          },
          {
            id: 'output_1',
            type: 'output',
            position: { x: 400, y: 150 },
            data: {
              label: 'Output',
              format: 'text',
              title: 'Result',
              fileName: 'simple-output',
              result: '',
              width: 180,
              height: 168
            }
          }
        ],
        edges: [
          {
            id: 'conn_1',
            source: 'input_1',
            target: 'output_1',
            sourceHandle: '0',
            targetHandle: '0'
          }
        ],
        viewport: { x: 0, y: 0, zoom: 1 }
      }
    }
  }
];
