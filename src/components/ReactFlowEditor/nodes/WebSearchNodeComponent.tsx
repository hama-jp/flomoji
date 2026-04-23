import React, { useState, memo } from 'react';
import { ChevronDown, ChevronUp, Shield, Globe, Clock, Key } from 'lucide-react';
import { SEARCH_PROVIDERS } from '@/components/nodes/WebSearchNode';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import useReactFlowStore from '../../../store/reactFlowStore';
import CustomNode from './CustomNode';
import { WebSearchNodeData } from '@/types/nodeData';

interface SearchProvider {
  value: string;
  label: string;
}

interface WebSearchNodeComponentProps {
  id: string;
  data: WebSearchNodeData;
}

const WebSearchNodeComponent = memo(({ data = {}, id }: WebSearchNodeComponentProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const updateNodeData = useReactFlowStore((state) => state.updateNodeData);

  const updateData = (field: keyof WebSearchNodeData, value: any) => {
    updateNodeData(id, { [field]: value });
  };

  const getProviderColor = (provider: string) => {
    const colors: { [key: string]: string } = {
      google: 'bg-blue-500',
      brave: 'bg-orange-500',
      bing: 'bg-purple-500'
    };
    return colors[provider] || 'bg-gray-500';
  };

  const getProviderIcon = (provider: string) => {
    const icons: { [key: string]: string } = {
      google: '🔍',
      brave: '🦁',
      bing: '🔎'
    };
    return icons[provider] || '🔍';
  };

  const nodeDataWithHandles = {
    ...data,
    label: 'Web Search',
    icon: '🔍',
    inputs: [{ name: 'query', id: 'query' }],
    outputs: [
      { name: 'results', id: 'results' },
      { name: 'metadata', id: 'metadata' },
      { name: 'error', id: 'error' }
    ],
    colorClass: 'bg-gradient-to-br from-teal-400 to-teal-600 text-white'
  };

  return (
    <CustomNode data={nodeDataWithHandles} id={id}>
      <div className="space-y-3 w-80">
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">検索プロバイダー</Label>
          <Select value={data.provider || 'google'} onValueChange={(value: string) => updateData('provider', value)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_PROVIDERS.map((provider: SearchProvider) => (
                <SelectItem key={provider.value} value={provider.value}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getProviderIcon(provider.value)}</span>
                    <span>{provider.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">検索クエリ</Label>
          <Textarea
            placeholder="例: 生成AI 業界動向 OR LLM regulation"
            value={data.query || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateData('query', e.target.value)}
            className="text-sm min-h-[60px] nodrag"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">最大結果数</Label>
          <Input
            type="number"
            value={data.maxResults || 10}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateData('maxResults', parseInt(e.target.value) || 10)}
            className="text-xs h-8 nodrag"
            min="1"
            max="50"
          />
        </div>
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-8 px-2">
              <span className="text-xs">詳細設定</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label className="text-xs text-gray-600 flex items-center gap-1">
                <Key className="w-3 h-3" />
                APIキー（オプション）
              </Label>
              <Input
                type="password"
                placeholder="設定画面で設定済みの場合は不要"
                value={data.apiKey || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateData('apiKey', e.target.value)}
                className="text-xs h-8 nodrag"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-600 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                言語
              </Label>
              <Select value={data.language || 'ja'} onValueChange={(value: string) => updateData('language', value)}>
                <SelectTrigger className="w-full h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">対象サイト</Label>
              <Textarea
                placeholder={'techcrunch.com\nopenai.com\nwww.theverge.com'}
                value={data.siteFilters || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateData('siteFilters', e.target.value)}
                className="text-xs min-h-[72px] nodrag"
              />
              <div className="text-[11px] text-muted-foreground">
                1行またはカンマ区切りで指定すると `site:` 条件として検索に追加されます。
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                過去何日を対象にするか
              </Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={data.freshnessDays ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const rawValue = e.target.value.trim();
                  updateData('freshnessDays', rawValue ? Math.max(1, parseInt(rawValue, 10) || 1) : undefined);
                }}
                className="text-xs h-8 nodrag"
                placeholder="例: 3"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="safeSearch" className="text-xs flex items-center gap-1">
                <Shield className="w-3 h-3" />
                セーフサーチ
              </Label>
              <Switch
                id="safeSearch"
                checked={data.safeSearch !== false}
                onCheckedChange={(checked: boolean) => updateData('safeSearch', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="cacheEnabled" className="text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" />
                結果をキャッシュ
              </Label>
              <Switch
                id="cacheEnabled"
                checked={data.cacheEnabled !== false}
                onCheckedChange={(checked: boolean) => updateData('cacheEnabled', checked)}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
        <div className="flex justify-between items-center pt-2 border-t">
          <Badge className={`${getProviderColor(data.provider || 'google')} text-white`}>
            {getProviderIcon(data.provider || 'google')} {data.provider || 'google'}
          </Badge>
          
          <div className="flex gap-2">
            {data.safeSearch !== false && (
              <Badge variant="outline" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Safe
              </Badge>
            )}
            {data.cacheEnabled !== false && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Cache
              </Badge>
            )}
            {!!data.siteFilters?.trim() && (
              <Badge variant="outline" className="text-xs">
                Sites
              </Badge>
            )}
            {!!data.freshnessDays && (
              <Badge variant="outline" className="text-xs">
                {data.freshnessDays}d
              </Badge>
            )}
          </div>
        </div>
        {!data.apiKey && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
            ⚠️ APIキーは設定画面で設定してください
          </div>
        )}
      </div>
    </CustomNode>
  );
});

WebSearchNodeComponent.displayName = 'WebSearchNodeComponent';

export default memo(WebSearchNodeComponent);
