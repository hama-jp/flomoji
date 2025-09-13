// LLMサービス接続機能
import StorageService from './storageService';
import { LLMSettings, LLMMessage } from '../types';

// Provider types
export type Provider = 'openai' | 'anthropic' | 'local' | 'custom';

// Extended settings interface
export interface ExtendedLLMSettings extends LLMSettings {
  provider: Provider;
  baseUrl?: string;
  isTest?: boolean;
}

// API Response types
interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface AnthropicResponse {
  content?: Array<{
    text?: string;
  }>;
  error?: {
    message?: string;
  };
}

// Service response types
interface TestConnectionResponse {
  success: boolean;
  message: string;
}

class LLMService {
  private settings: ExtendedLLMSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  // 設定をローカルストレージから読み込み
  loadSettings(): ExtendedLLMSettings {
    return StorageService.getSettings({
      provider: 'openai',
      apiKey: '',
      baseUrl: '',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 50000
    }) as ExtendedLLMSettings;
  }

  // 設定を保存
  saveSettings(settings: ExtendedLLMSettings): void {
    this.settings = settings;
    StorageService.setSettings(settings);
  }

  // API接続テスト
  async testConnection(): Promise<TestConnectionResponse> {
    if (!this.settings.apiKey) {
      throw new Error('APIキーが設定されていません');
    }

    try {
      await this.sendMessage('テスト', null, { isTest: true });
      return { success: true, message: 'API接続テストが成功しました' };
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`API接続に失敗しました: ${message}`);
    }
  }

  // メッセージ送信
  async sendMessage(
    message: string, 
    systemPrompt: string | null = null, 
    options: Partial<ExtendedLLMSettings> = {}
  ): Promise<string> {
    const currentSettings: ExtendedLLMSettings = { ...this.settings, ...options };
    const { provider, apiKey, baseUrl, model, temperature, maxTokens }: any = currentSettings;

    // メッセージの検証
    if (!message || typeof message !== 'string' || message.trim() === '') {
      throw new Error('メッセージが空です。有効なメッセージを入力してください。');
    }

    if (!apiKey && (provider === 'openai' || provider === 'anthropic')) {
      throw new Error('APIキーが設定されていません。設定画面でAPIキーを入力してください。');
    }

    let endpoint = '';
    let headers: Record<string, string> = {};
    let body: any = {};

    switch (provider) {
      case 'openai':
      case 'local':
      case 'custom': {
        // エンドポイントの設定
        if (provider === 'openai') {
          endpoint = 'https://api.openai.com/v1/chat/completions';
        } else {
          endpoint = `${baseUrl}/chat/completions`;
        }
        
        // ヘッダーの設定（OpenAI互換）
        headers = {
          'Content-Type': 'application/json'
        };
        if (apiKey && apiKey.trim() !== '') {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        // メッセージ配列を構築
        const messages: LLMMessage[] = [];
        if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.trim() !== '') {
          messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: message });
        
        // ボディの設定（OpenAI互換）
        body = {
          model: model,
          messages: messages,
          temperature: temperature,
        };
        
        if (model && model.startsWith('gpt-5')) {
          body.max_completion_tokens = maxTokens;
        } else {
          body.max_tokens = maxTokens;
        }
        break;
      }

      case 'anthropic':
        endpoint = 'https://api.anthropic.com/v1/messages';
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
          'anthropic-version': '2023-06-01'
        };
        body = {
          model: model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: message }]
        };
        // Anthropic APIではsystemプロンプトはトップレベルに配置
        if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.trim() !== '') {
          body.system = systemPrompt;
        }
        break;

      default:
        throw new Error(`未対応のプロバイダー: ${provider}`);
    }

    // Request and token settings are configured above

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });
    } catch (fetchError: any) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      // Network error will be thrown with detailed message
      throw new Error(`ネットワークエラー: ${errorMessage}. エンドポイント: ${endpoint}`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({} as any));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Parse and normalize the API response

    // レスポンス形式の正規化
    switch (provider) {
      case 'openai':
      case 'local':
      case 'custom': {
        const openAIData = data as OpenAIResponse;
        const result = openAIData.choices?.[0]?.message?.content || 'レスポンスが空です';
        
        // デバッグ: APIレスポンス詳細を表示（一時的）
        if (result === 'レスポンスが空です') {
          console.warn('API Response Analysis:', {
            model: model,
            responseStatus: response.status,
            responseStatusText: response.statusText,
            dataKeys: Object.keys(data),
            hasChoices: !!openAIData.choices,
            choices: openAIData.choices,
            choicesLength: openAIData.choices?.length,
            firstChoice: openAIData.choices?.[0],
            messageStructure: openAIData.choices?.[0] ? Object.keys(openAIData.choices[0]) : 'No first choice',
            actualContent: openAIData.choices?.[0]?.message?.content,
            errorField: openAIData.error
          });
        }
        
        return result;
      }
      case 'anthropic': {
        const anthropicData = data as AnthropicResponse;
        return anthropicData.content?.[0]?.text || 'レスポンスが空です';
      }
      default:
        return 'レスポンスの解析に失敗しました';
    }
  }

  // ストリーミング対応のメッセージ送信（将来の拡張用）
  async sendMessageStream(
    message: string, 
    onChunk: (chunk: string) => void,
    systemPrompt?: string | null
  ): Promise<string> {
    // TODO: ストリーミング機能を実装
    const response = await this.sendMessage(message, systemPrompt);
    onChunk(response);
    return response;
  }

  // 設定の検証
  validateSettings(settings: ExtendedLLMSettings): string[] {
    const errors: string[] = [];

    if (!settings.provider) {
      errors.push('プロバイダーを選択してください');
    }

    if (!settings.apiKey) {
      errors.push('APIキーを入力してください');
    }

    if ((settings.provider === 'local' || settings.provider === 'custom') && !settings.baseUrl) {
      errors.push('ベースURLを入力してください');
    }

    if (!settings.model) {
      errors.push('モデルを選択してください');
    }

    const temp = settings.temperature ?? 0;
    if (temp < 0 || temp > 2) {
      errors.push('温度は0.0から2.0の間で設定してください');
    }

    const tokens = settings.maxTokens ?? 0;
    if (tokens < 1 || tokens > 128000) {
      errors.push('最大トークン数は1から128000の間で設定してください');
    }

    return errors;
  }
}

// シングルトンインスタンス
const llmService = new LLMService();

export default llmService;