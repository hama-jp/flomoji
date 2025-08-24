// LLMサービス接続機能
import StorageService from './storageService.js'

class LLMService {
  constructor() {
    this.settings = this.loadSettings()
  }

  // 設定をローカルストレージから読み込み
  loadSettings() {
    return StorageService.getSettings({
      provider: 'openai',
      apiKey: '',
      baseUrl: '',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 50000
    })
  }

  // 設定を保存
  saveSettings(settings) {
    this.settings = settings
    StorageService.setSettings(settings)
  }

  // API接続テスト
  async testConnection() {
    if (!this.settings.apiKey) {
      throw new Error('APIキーが設定されていません')
    }

    try {
      await this.sendMessage('テスト', null, { isTest: true })
      return { success: true, message: 'API接続テストが成功しました' }
    } catch (error) {
      throw new Error(`API接続に失敗しました: ${error.message}`)
    }
  }

  // メッセージ送信
  async sendMessage(message, systemPrompt, options = {}) {
    const currentSettings = { ...this.settings, ...options };
    const { provider, apiKey, baseUrl, model, temperature, maxTokens } = currentSettings

    // メッセージの検証
    if (!message || typeof message !== 'string' || message.trim() === '') {
      throw new Error('メッセージが空です。有効なメッセージを入力してください。')
    }

    if (!apiKey && (provider === 'openai' || provider === 'anthropic')) {
      throw new Error('APIキーが設定されていません。設定画面でAPIキーを入力してください。')
    }

    let endpoint = ''
    let headers = {}
    let body = {}

    switch (provider) {
      case 'openai':
      case 'local':
      case 'custom': {
        // エンドポイントの設定
        if (provider === 'openai') {
          endpoint = 'https://api.openai.com/v1/chat/completions'
        } else {
          endpoint = `${baseUrl}/chat/completions`
        }
        
        // ヘッダーの設定（OpenAI互換）
        headers = {
          'Content-Type': 'application/json'
        }
        if (apiKey && apiKey.trim() !== '') {
          headers['Authorization'] = `Bearer ${apiKey}`
        }
        
        // メッセージ配列を構築
        const messages = [];
        if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.trim() !== '') {
          messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: message });
        
        // ボディの設定（OpenAI互換）
        body = {
          model: model,
          messages: messages,
          temperature: temperature,
        }
        if (model && model.startsWith('gpt-5')) {
          body.max_completion_tokens = maxTokens;
        } else {
          body.max_tokens = maxTokens;
        }
        break
      }

      case 'anthropic':
        endpoint = 'https://api.anthropic.com/v1/messages'
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
        body = {
          model: model,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: message }]
        }
        // Anthropic APIではsystemプロンプトはトップレベルに配置
        if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.trim() !== '') {
          body.system = systemPrompt;
        }
        break

      default:
        throw new Error(`未対応のプロバイダー: ${provider}`)
    }

    // デバッグ用のログ出力
    console.log('LLM Request:', {
      provider,
      endpoint,
      headers,
      body,
      baseUrl,
      currentSettings
    });
    
    // 特に重要: max_completion_tokens の実際の値を確認
    console.warn('Token Settings Check:', {
      modelName: model,
      bodyMaxTokens: body.max_tokens,
      bodyMaxCompletionTokens: body.max_completion_tokens,
      originalMaxTokens: maxTokens,
      isGpt5Model: model && model.startsWith('gpt-5')
    });

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });
    } catch (fetchError) {
      console.error('Fetch Error:', {
        error: fetchError,
        endpoint,
        baseUrl,
        provider
      });
      throw new Error(`ネットワークエラー: ${fetchError.message}. エンドポイント: ${endpoint}`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    // デバッグ用: APIレスポンスの内容をログ出力
    console.log('LLM Response:', {
      provider,
      model,
      data,
      choices: data.choices,
      firstChoice: data.choices?.[0],
      message: data.choices?.[0]?.message,
      content: data.choices?.[0]?.message?.content
    });


    // レスポンス形式の正規化
    switch (provider) {
      case 'openai':
      case 'local':
      case 'custom': {
        const result = data.choices?.[0]?.message?.content || 'レスポンスが空です';
        
        // デバッグ: APIレスポンス詳細を表示（一時的）
        if (result === 'レスポンスが空です') {
          console.warn('API Response Analysis:', {
            model: model,
            responseStatus: response.status,
            responseStatusText: response.statusText,
            dataKeys: Object.keys(data),
            hasChoices: !!data.choices,
            choices: data.choices,
            choicesLength: data.choices?.length,
            firstChoice: data.choices?.[0],
            messageStructure: data.choices?.[0] ? Object.keys(data.choices[0]) : 'No first choice',
            actualContent: data.choices?.[0]?.message?.content,
            errorField: data.error
          });
        }
        
        return result;
      }
      case 'anthropic':
        return data.content?.[0]?.text || 'レスポンスが空です'

      default:
        return 'レスポンスの解析に失敗しました'
    }
  }

  // ストリーミング対応のメッセージ送信（将来の拡張用）
  async sendMessageStream(message, onChunk) {
    // TODO: ストリーミング機能を実装
    const response = await this.sendMessage(message)
    onChunk(response)
    return response
  }

  // 設定の検証
  validateSettings(settings) {
    const errors = []

    if (!settings.provider) {
      errors.push('プロバイダーを選択してください')
    }

    if (!settings.apiKey) {
      errors.push('APIキーを入力してください')
    }

    if ((settings.provider === 'local' || settings.provider === 'custom') && !settings.baseUrl) {
      errors.push('ベースURLを入力してください')
    }

    if (!settings.model) {
      errors.push('モデルを選択してください')
    }

    if (settings.temperature < 0 || settings.temperature > 2) {
      errors.push('温度は0.0から2.0の間で設定してください')
    }

    if (settings.maxTokens < 1 || settings.maxTokens > 128000) {
      errors.push('最大トークン数は1から128000の間で設定してください')
    }

    return errors
  }
}

// シングルトンインスタンス
const llmService = new LLMService()

export default llmService

