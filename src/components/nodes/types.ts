/**
 * ノード定義の型定義とユーティリティ
 */

import type { NodeDefinition, WorkflowNode, NodeInputs, INodeExecutionContext, NodeOutput } from '../../types';

/**
 * 色テーマの定数
 */
export const NODE_COLORS = {
  orange: {
    color: 'bg-gradient-to-br from-orange-400 to-orange-600',
    borderColor: 'border-orange-300',
    textColor: 'text-white'
  },
  blue: {
    color: 'bg-gradient-to-br from-blue-400 to-blue-600',
    borderColor: 'border-blue-300', 
    textColor: 'text-white'
  },
  green: {
    color: 'bg-gradient-to-br from-green-400 to-green-600',
    borderColor: 'border-green-300',
    textColor: 'text-white'
  },
  teal: {
    color: 'bg-gradient-to-br from-teal-400 to-teal-600',
    borderColor: 'border-teal-300',
    textColor: 'text-white'
  },
  pink: {
    color: 'bg-gradient-to-br from-pink-400 to-pink-600',
    borderColor: 'border-pink-300',
    textColor: 'text-white'
  },
  purple: {
    color: 'bg-gradient-to-br from-purple-400 to-purple-600',
    borderColor: 'border-purple-300',
    textColor: 'text-white'
  },
  amber: {
    color: 'bg-gradient-to-br from-amber-400 to-amber-600',
    borderColor: 'border-amber-300',
    textColor: 'text-white'
  },
  cyan: {
    color: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
    borderColor: 'border-cyan-300',
    textColor: 'text-white'
  }
} as const;

export type ColorTheme = keyof typeof NODE_COLORS;

/**
 * 拡張されたノード定義インターフェース（UI用）
 */
export interface ExtendedNodeDefinition extends NodeDefinition {
  name: string;
  icon: string;
  color: string;
  borderColor: string;
  textColor: string;
  description?: string;
  category?: string;
}

/**
 * ノード実行関数の型
 */
export type NodeExecuteFunction = (
  node: WorkflowNode,
  inputs: NodeInputs,
  context?: INodeExecutionContext
) => Promise<NodeOutput>;

/**
 * createNodeDefinition のオプション
 */
export interface CreateNodeOptions {
  description?: string;
  category?: string;
}

/**
 * ノード定義を作成するヘルパー関数（新しいシグネチャ）
 * @param type - ノードタイプ（例: 'input', 'output', 'llm'）
 * @param name - 表示名
 * @param icon - アイコン
 * @param colorTheme - 色テーマ
 * @param inputs - 入力ポート配列
 * @param outputs - 出力ポート配列
 * @param defaultData - デフォルトデータ
 * @param execute - 実行メソッド
 * @param options - オプション設定
 * @returns {ExtendedNodeDefinition}
 */
export function createNodeDefinitionNew(
  type: string,
  name: string,
  icon: string,
  colorTheme: ColorTheme,
  inputs: string[],
  outputs: string[],
  defaultData: Record<string, any>,
  execute: NodeExecuteFunction,
  options: CreateNodeOptions = {}
): ExtendedNodeDefinition {
  const theme = NODE_COLORS[colorTheme];
  if (!theme) {
    throw new Error(`Unknown color theme: ${colorTheme}`);
  }

  if (typeof execute !== 'function') {
    throw new Error(`Execute method must be a function for node: ${name}`);
  }

  return {
    type,
    label: name, // NodeDefinitionインターフェースとの互換性のため
    name,
    icon,
    ...theme,
    inputs: Array.isArray(inputs) ? inputs : [],
    outputs: Array.isArray(outputs) ? outputs : [],
    defaultData: defaultData || {},
    execute,
    category: options.category || 'general', // テストとの互換性のため
    metadata: {
      description: options.description || '',
      category: options.category || 'general'
    }
  };
}

/**
 * 古いシグネチャとの後方互換性のための関数（現在のデフォルト）
 */
export function createNodeDefinition(
  name: string,
  icon: string,
  colorTheme: ColorTheme,
  inputs: string[],
  outputs: string[],
  defaultData: Record<string, any>,
  execute: NodeExecuteFunction,
  options: CreateNodeOptions = {}
): ExtendedNodeDefinition {
  // typeを名前から生成（スペースをアンダースコアに変換、小文字に）
  const type = name.toLowerCase().replace(/\s+/g, '_');
  return createNodeDefinitionNew(type, name, icon, colorTheme, inputs, outputs, defaultData, execute, options);
}