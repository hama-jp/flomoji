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
