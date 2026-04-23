import { createNodeDefinitionNew } from './types';
import type { WorkflowNode, NodeInputs, INodeExecutionContext, NodeOutput } from '../../types';

function formatOutputValue(value: unknown, format: string, outputName: string): string {
  switch (format) {
    case 'json': {
      if (typeof value === 'string') {
        try {
          return JSON.stringify(JSON.parse(value), null, 2);
        } catch {
          return JSON.stringify({ [outputName]: value }, null, 2);
        }
      }

      return JSON.stringify(value ?? { [outputName]: null }, null, 2);
    }

    case 'markdown': {
      if (typeof value === 'string') {
        return value;
      }

      return `\`\`\`json\n${JSON.stringify(value ?? { [outputName]: null }, null, 2)}\n\`\`\``;
    }

    case 'text':
    default:
      if (typeof value === 'string') {
        return value;
      }

      if (value === null || value === undefined) {
        return '';
      }

      return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  }
}

/**
 * 出力ノードの実行処理
 * @param node - ノードオブジェクト
 * @param inputs - 入力データ
 * @param context - 実行コンテキスト
 * @returns フォーマットされた出力値
 */
async function executeOutputNode(
  node: WorkflowNode,
  inputs: NodeInputs,
  context?: INodeExecutionContext
): Promise<NodeOutput> {
  const format = node.data.format || 'text';
  const inputValue = Object.values(inputs)[0] || '';
  const outputName = node.data.name || 'output';
  const formattedOutput = formatOutputValue(inputValue, format, outputName);

  // Set the output value as a variable in the execution context
  if (context) {
    context.setVariable(outputName, formattedOutput);
  }

  return formattedOutput;
}

/**
 * 出力ノードの定義
 * ワークフローの結果を表示する
 */
export const OutputNode = createNodeDefinitionNew(
  'output',
  'Output',
  '📤',
  'green',
  ['input'], // 入力ポート: input
  [], // 出力ポートなし
  {
    format: 'text',
    title: 'Result',
    fileName: '',
    result: ''
  },
  executeOutputNode,
  {
    description: 'Display workflow results. Supports text, JSON, and Markdown output with browser download.',
    category: 'input-output'
  }
);

export default OutputNode;
