import React, { useState, useEffect } from 'react';
import { Save, TestTube, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import llmService, { ExtendedLLMSettings, Provider } from '../services/llmService';
import ApiKeysSettings from './ApiKeysSettings';

type TestStatus = {
  type: 'success' | 'error';
  message: string;
} | null;

const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<ExtendedLLMSettings>({
    provider: 'openai',
    apiKey: '',
    baseUrl: '',
    model: 'gpt-5-nano',
    temperature: 0.7,
    maxTokens: 2048,
  });
  const [testStatus, setTestStatus] = useState<TestStatus>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    const loadedSettings = llmService.loadSettings();
    if (loadedSettings) {
      setSettings(loadedSettings);
    }
  }, []);

  const handleSave = () => {
    const errors = llmService.validateSettings(settings);
    setValidationErrors(errors);

    if (errors.length > 0) {
      setTestStatus({ type: 'error', message: 'There are issues with the settings. Please check the errors.' });
      return;
    }

    llmService.saveSettings(settings);
    setTestStatus({ type: 'success', message: 'Settings saved successfully' });
    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleTest = async () => {
    if (!settings.apiKey) {
      setTestStatus({ type: 'error', message: 'Please enter API key' });
      return;
    }

    setIsLoading(true);
    setTestStatus(null);

    try {
      llmService.saveSettings(settings);
      const result = await llmService.testConnection();
      setTestStatus({ type: 'success', message: result.message });
    } catch (error: any) {
      setTestStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ExtendedLLMSettings, value: any) => {
    setSettings((prev: ExtendedLLMSettings) => ({
      ...prev,
      [field]: value,
    }));
    setValidationErrors([]);
    setTestStatus(null);
  };

  const providerOptions: { value: Provider; label: string }[] = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'local', label: 'Local LLM' },
    { value: 'custom', label: 'Custom API' },
  ];

  const modelOptions: Record<Provider, string[]> = {
    openai: ['gpt-5', 'gpt-5-mini', 'gpt-5-nano'],
    anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
    local: ['llama2', 'codellama', 'mistral', 'custom-model'],
    custom: ['custom-model'],
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Tabs defaultValue="llm" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="llm" className="">LLM設定</TabsTrigger>
          <TabsTrigger value="apikeys" className="">APIキー管理</TabsTrigger>
        </TabsList>
        
        <TabsContent value="llm">
          <Card className="">
            <CardHeader className="">
              <CardTitle className="">LLM Service Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
          {/* バリデーションエラー表示 */}
          {validationErrors.length > 0 && (
            <Alert variant={"default" as const} className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index: any) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* プロバイダー選択 */}
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select
              value={settings.provider}
              onValueChange={(value) => handleInputChange('provider', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {providerOptions.map((option: any) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* APIキー */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={settings.apiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('apiKey', e.target.value)}
              placeholder="Enter your API key"
            />
          </div>

          {/* ベースURL（ローカルLLMやカスタムAPI用） */}
          {(settings.provider === 'local' || settings.provider === 'custom') && (
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                value={settings.baseUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('baseUrl', e.target.value)}
                placeholder="http://localhost:8080/v1"
              />
              <p className="text-xs text-gray-500">
                Example: http://localhost:1234/v1 (LM Studio), http://localhost:8080/v1 (Ollama)
              </p>
            </div>
          )}

          {/* モデル選択 */}
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            {(settings.provider === 'local' || settings.provider === 'custom') ? (
              <Input type="text" id="model"
                value={settings.model}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('model', e.target.value)}
                placeholder="Enter model name (e.g., llama2, mistral, custom-model)"
              />
            ) : (
              <Select
                value={settings.model}
                onValueChange={(value) => handleInputChange('model', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {(modelOptions[settings.provider] || []).map((model: any) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 温度設定 */}
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature (0.0 - 2.0)</Label>
            <Input id="temperature"
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('temperature', parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-gray-500">
              Lower values are more consistent, higher values are more creative
            </p>
          </div>

          {/* 最大トークン数 */}
          <div className="space-y-2">
            <Label htmlFor="maxTokens">
              {settings.model?.startsWith('gpt-5') ? 'Max Completion Tokens' : 'Max Tokens'}
            </Label>
            <Input id="maxTokens"
              type="number"
              min="1"
              max="128000"
              value={settings.maxTokens}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('maxTokens', parseInt(e.target.value) || 1)}
            />
            <p className="text-xs text-gray-500">
              Limits the maximum length of generated responses
            </p>
          </div>

          {/* ステータス表示 */}
          {testStatus && (
            <Alert variant={"default" as const} className={testStatus.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              {testStatus.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription className={testStatus.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                {testStatus.message}
              </AlertDescription>
            </Alert>
          )}

          {/* ボタン */}
          <div className="flex space-x-2 pt-4">
            <Button onClick={handleSave} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
            <Button onClick={handleTest}
              variant={'outline' as const}
              disabled={isLoading}
              className="flex-1"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {isLoading ? 'Testing Connection...' : 'Test Connection'}
            </Button>
          </div>
            </CardContent>
          </Card>

          {/* 使用方法の説明 */}
          <Card className="">
            <CardHeader className="">
              <CardTitle className="">Usage Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-800 mb-1">OpenAI:</h4>
                <p>Obtain an OpenAI API key and enter it above.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-1">Anthropic:</h4>
                <p>Obtain an Anthropic API key and enter it above.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-1">Local LLM:</h4>
                <p>Configure endpoints for local servers like LM Studio, Ollama, or text-generation-webui.</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-1">Custom API:</h4>
                <p>Configure endpoints for OpenAI-compatible APIs.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="apikeys">
          <ApiKeysSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SettingsView

