import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Key, Eye, EyeOff, Plus, Trash2, Shield, CheckCircle, 
  XCircle, AlertCircle, ChevronDown, Globe, Brain, Search 
} from 'lucide-react';
import StorageService from '../services/storageService';
import { toast } from 'sonner';

const ApiKeysSettings = () => {
  const [apiKeys, setApiKeys] = useState({});
  const [showKeys, setShowKeys] = useState({});
  const [newKey, setNewKey] = useState({ provider: '', name: '', key: '' });
  const [isAddingKey, setIsAddingKey] = useState(false);

  // APIキー設定の初期化
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = () => {
    const settings = StorageService.getSettings({});
    const keys = {};
    
    // 既存のLLM APIキー
    if (settings.apiKey) {
      keys['openai'] = { name: 'OpenAI API Key', key: settings.apiKey, provider: 'openai' };
    }
    
    // Web検索APIキー
    if (settings.googleApiKey) {
      keys['google'] = { name: 'Google Search API Key', key: settings.googleApiKey, provider: 'google' };
    }
    if (settings.googleSearchEngineId) {
      keys['google-cse'] = { name: 'Google Search Engine ID', key: settings.googleSearchEngineId, provider: 'google' };
    }
    if (settings.braveApiKey) {
      keys['brave'] = { name: 'Brave Search API Key', key: settings.braveApiKey, provider: 'brave' };
    }
    if (settings.bingApiKey) {
      keys['bing'] = { name: 'Bing Search API Key', key: settings.bingApiKey, provider: 'bing' };
    }
    
    // カスタムAPIキー
    if (settings.customApiKeys) {
      Object.entries(settings.customApiKeys).forEach(([id, keyData]) => {
        keys[id] = keyData;
      });
    }
    
    setApiKeys(keys);
  };

  const saveApiKey = (id, keyData) => {
    const settings = StorageService.getSettings({});
    
    // プロバイダー別に保存
    switch (keyData.provider) {
      case 'openai':
        settings.apiKey = keyData.key;
        break;
      case 'google':
        if (id === 'google-cse') {
          settings.googleSearchEngineId = keyData.key;
        } else {
          settings.googleApiKey = keyData.key;
        }
        break;
      case 'brave':
        settings.braveApiKey = keyData.key;
        break;
      case 'bing':
        settings.bingApiKey = keyData.key;
        break;
      default:
        // カスタムキーとして保存
        if (!settings.customApiKeys) {
          settings.customApiKeys = {};
        }
        settings.customApiKeys[id] = keyData;
        break;
    }
    
    StorageService.setSettings(settings);
    loadApiKeys();
    toast.success(`${keyData.name} を保存しました`);
  };

  const deleteApiKey = (id) => {
    const settings = StorageService.getSettings({});
    const keyData = apiKeys[id];
    
    switch (keyData.provider) {
      case 'openai':
        delete settings.apiKey;
        break;
      case 'google':
        if (id === 'google-cse') {
          delete settings.googleSearchEngineId;
        } else {
          delete settings.googleApiKey;
        }
        break;
      case 'brave':
        delete settings.braveApiKey;
        break;
      case 'bing':
        delete settings.bingApiKey;
        break;
      default:
        if (settings.customApiKeys) {
          delete settings.customApiKeys[id];
        }
        break;
    }
    
    StorageService.setSettings(settings);
    loadApiKeys();
    toast.success(`${keyData.name} を削除しました`);
  };

  const toggleShowKey = (id) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addNewKey = () => {
    if (!newKey.name || !newKey.key || !newKey.provider) {
      toast.error('すべての項目を入力してください');
      return;
    }
    
    const id = `custom-${Date.now()}`;
    saveApiKey(id, newKey);
    setNewKey({ provider: '', name: '', key: '' });
    setIsAddingKey(false);
  };

  const getProviderIcon = (provider) => {
    const icons = {
      openai: <Brain className="w-4 h-4" />,
      google: <Search className="w-4 h-4" />,
      brave: <Globe className="w-4 h-4" />,
      bing: <Search className="w-4 h-4" />,
      custom: <Key className="w-4 h-4" />
    };
    return icons[provider] || <Key className="w-4 h-4" />;
  };

  const getProviderColor = (provider) => {
    const colors = {
      openai: 'bg-green-500',
      google: 'bg-blue-500',
      brave: 'bg-orange-500',
      bing: 'bg-purple-500',
      custom: 'bg-gray-500'
    };
    return colors[provider] || 'bg-gray-500';
  };

  const predefinedKeys = [
    { id: 'openai', name: 'OpenAI API Key', provider: 'openai', description: 'GPT-3.5/GPT-4 アクセス用' },
    { id: 'google', name: 'Google Search API Key', provider: 'google', description: 'Google Custom Search API用' },
    { id: 'google-cse', name: 'Google Search Engine ID', provider: 'google', description: 'カスタム検索エンジンID' },
    { id: 'brave', name: 'Brave Search API Key', provider: 'brave', description: 'Brave Search API用' },
    { id: 'bing', name: 'Bing Search API Key', provider: 'bing', description: 'Microsoft Bing Search API用' }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          APIキー管理
        </CardTitle>
        <CardDescription>
          各種APIサービスの認証キーを安全に管理します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="configured" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="configured">設定済み</TabsTrigger>
            <TabsTrigger value="available">利用可能</TabsTrigger>
          </TabsList>
          
          <TabsContent value="configured" className="space-y-3">
            {Object.entries(apiKeys).length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  APIキーが設定されていません。「利用可能」タブから追加してください。
                </AlertDescription>
              </Alert>
            ) : (
              Object.entries(apiKeys).map(([id, keyData]) => (
                <div key={id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getProviderColor(keyData.provider)}>
                        {getProviderIcon(keyData.provider)}
                      </Badge>
                      <span className="font-medium">{keyData.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleShowKey(id)}
                      >
                        {showKeys[id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteApiKey(id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showKeys[id] ? 'text' : 'password'}
                      value={keyData.key}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="available" className="space-y-3">
            {predefinedKeys.map((preset) => {
              const isConfigured = apiKeys[preset.id];
              return (
                <div key={preset.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getProviderColor(preset.provider)}>
                        {getProviderIcon(preset.provider)}
                      </Badge>
                      <div>
                        <p className="font-medium">{preset.name}</p>
                        <p className="text-xs text-gray-500">{preset.description}</p>
                      </div>
                    </div>
                    {isConfigured && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  {!isConfigured && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          設定する
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        <div className="space-y-2">
                          <Input
                            placeholder={`${preset.name}を入力`}
                            onChange={(e) => setNewKey({ 
                              provider: preset.provider, 
                              name: preset.name, 
                              key: e.target.value 
                            })}
                          />
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => {
                              if (newKey.key) {
                                saveApiKey(preset.id, { 
                                  ...newKey, 
                                  name: preset.name,
                                  provider: preset.provider 
                                });
                                setNewKey({ provider: '', name: '', key: '' });
                              }
                            }}
                          >
                            保存
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              );
            })}
            
            {/* カスタムAPIキー追加 */}
            <div className="border-t pt-3">
              <Collapsible open={isAddingKey} onOpenChange={setIsAddingKey}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    カスタムAPIキーを追加
                    <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${isAddingKey ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-2">
                  <Input
                    placeholder="キー名（例：My Custom API）"
                    value={newKey.name}
                    onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                  />
                  <Input
                    placeholder="APIキー"
                    type="password"
                    value={newKey.key}
                    onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                  />
                  <select
                    className="w-full p-2 border rounded-md"
                    value={newKey.provider}
                    onChange={(e) => setNewKey({ ...newKey, provider: e.target.value })}
                  >
                    <option value="">プロバイダーを選択</option>
                    <option value="custom">カスタム</option>
                    <option value="openai">OpenAI</option>
                    <option value="google">Google</option>
                    <option value="brave">Brave</option>
                    <option value="bing">Bing</option>
                  </select>
                  <Button onClick={addNewKey} className="w-full">
                    追加
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </TabsContent>
        </Tabs>
        
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            APIキーは暗号化されてローカルに保存されます。外部サーバーには送信されません。
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default ApiKeysSettings;