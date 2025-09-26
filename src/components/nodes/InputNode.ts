import { createNodeDefinitionNew } from './types';
import type { WorkflowNode, NodeInputs, INodeExecutionContext, NodeOutput } from '../../types';

/**
 * 入力ノードの実行処理
 * @param node - ノードオブジェクト
 * @param inputs - 入力データ（通常は空）
 * @param context - 実行コンテキスト
 * @returns 入力値またはファイルコンテンツ
 */
async function executeInputNode(
  node: WorkflowNode,
  inputs: NodeInputs,
  context?: INodeExecutionContext
): Promise<NodeOutput> {
  const inputName = node.data.name || 'input';
  const initialValue = context ? context.getVariable(inputName) : undefined;

  // Prioritize initial data from the context, falling back to the node's static value.
  const value = initialValue !== undefined ? initialValue : node.data.value || '';

  if (node.data.inputType === 'file') {
    // Note: File handling logic might need adjustments if used with context variables.
    const fileContent = node.data.fileContent || value;
    if (context) {
      context.setVariable(node.id, fileContent);
    }
    return fileContent;
  }

  if (context) {
    context.setVariable(node.id, value);
  }
  return value;
}

/**
 * 入力ノードの定義
 * ワークフローの開始点として使用される
 */
export const InputNode = createNodeDefinitionNew(
  'input',
  'Input',
  '📥',
  'orange',
  [], // 入力ポートなし
  ['output'], // 出力ポート: output
  {
    value: '',
    inputType: 'text' // 'text' or 'file'
  },
  executeInputNode,
  {
    description: 'ワークフローの開始点として使用される入力ノード',
    category: 'input-output'
  }
);

export default InputNode;