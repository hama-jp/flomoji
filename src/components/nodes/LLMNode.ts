import { createNodeDefinition } from './types';
import type { WorkflowNode, NodeInputs, INodeExecutionContext, NodeOutput } from '../../types';
import type { LLMNodeData } from '../../types/nodeData';
import llmService from '../../services/llmService';

// Console拡張用のグローバル型定義
declare global {
  interface Console {
    lastCall?: string;
  }
}

export function serializePromptInput(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

export function buildFinalPrompt(inputValues: unknown[], promptPrefix?: string): string {
  const promptParts = inputValues
    .map(serializePromptInput)
    .filter((value) => value.trim().length > 0);

  if (promptPrefix && promptPrefix.trim()) {
    promptParts.unshift(promptPrefix.trim());
  }

  return promptParts.join('\n\n');
}

/**
 * LLM生成ノードの実行処理
 * @param {Object} node - ノードオブジェクト
 * @param {Object} inputs - 入力データ
 * @param {Object} context - 実行コンテキスト
 * @returns {Promise<string>} LLMからの応答
 */
async function executeLLMNode(node: WorkflowNode, inputs: NodeInputs, context?: INodeExecutionContext): Promise<NodeOutput> {
  const nodeData = node.data as LLMNodeData;
  const temperature = nodeData.temperature || 0.7;
  const model = nodeData.model;
  const provider = (nodeData.provider || 'openai') as 'openai' | 'anthropic' | 'local' | 'custom';
  const systemPrompt = nodeData.systemPrompt || null;
  const maxTokens = nodeData.maxTokens || null;
  
  // 入力をそのままLLMに送信
  const inputValues = Object.values(inputs).filter(v => v !== undefined && v !== null);
  if (inputValues.length === 0) {
    throw new Error('LLMノードに入力がありません');
  }
  
  const finalPrompt = buildFinalPrompt(inputValues, nodeData.prompt);
  
  try {
    // デバッグ情報をログに記録
    context?.addLog('info', `LLMノードを実行中`, node.id, { 
      model,
      provider,
      temperature,
      hasSystemPrompt: !!systemPrompt,
      maxTokens: maxTokens || 'default'
    });
    
    const currentSettings = llmService.loadSettings();
    context?.addLog('debug', `現在の設定`, node.id, { currentSettings });
    
    const nodeSpecificOptions = {
      provider,
      model,
      temperature,
      apiKey: currentSettings.apiKey,
      baseUrl: currentSettings.baseUrl,
      maxTokens: maxTokens || currentSettings.maxTokens  // ノード設定を優先、フォールバックでシステム設定
    };
    context?.addLog('debug', `ノード固有オプション`, node.id, { 
      nodeSpecificOptions,
      maxTokensSource: maxTokens ? 'node-specific' : 'system-default',
      nodeMaxTokens: maxTokens,
      systemMaxTokens: currentSettings.maxTokens,
      finalMaxTokens: maxTokens || currentSettings.maxTokens
    });
    
    context?.addLog('debug', `llmService.sendMessage呼び出し中`, node.id, { 
      finalPrompt, 
      systemPrompt, 
      nodeSpecificOptions 
    });
    
    // 詳細なAPIレスポンス情報を取得するためのテンポラリーな修正
    const result = await llmService.sendMessage(finalPrompt, systemPrompt, nodeSpecificOptions);
    
    // ブラウザコンソールの最新ログ（APIレスポンス）を取得を試みる
    setTimeout(() => {
      if (console.lastCall && console.lastCall.includes('LLM Response:')) {
        context?.addLog('debug', `コンソールからAPIレスポンス情報を取得できませんでした - 直接F12コンソールを確認してください`, node.id);
      }
    }, 100);
    
    context?.addLog('debug', `llmService.sendMessage呼び出し完了`, node.id, { 
      resultType: typeof result, 
      resultLength: result?.length,
      result: result,
      isEmptyResponse: result === 'レスポンスが空です'
    });
    
    context?.addLog('info', `LLMからの応答を受信しました`, node.id, { response: result?.substring(0, 100) + '...' });
    
    return result;
  } catch (error: any) {
    context?.addLog('error', `LLMノード実行エラー: ${error instanceof Error ? error.message : String(error)}`, node.id, { error: error instanceof Error ? error.stack : undefined });
    throw error;
  }
}

/**
 * LLM生成ノードの定義
 * AIモデルを使用してテキストを生成する
 */
export const LLMNode = createNodeDefinition(
  'LLM Generation',
  '🤖',
  'blue',
  ['input'], // 入力ポート: input
  ['output'], // 出力ポート: output
  {
    temperature: 1.0,
    model: 'gpt-5-nano',
    prompt: '',
    systemPrompt: '',
    maxTokens: 50000
  },
  executeLLMNode, // 実行メソッド
  {
    description: 'Generate text using AI language models. Supports system prompts, temperature settings, and model selection.',
    category: 'ai'
  }
);

export default LLMNode;
