import React, { memo } from 'react';

import { Send, AlertCircle } from 'lucide-react';

import { HTTP_TEMPLATES } from '@/components/nodes/HTTPRequestNode';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';


import useReactFlowStore from '../../../store/reactFlowStore';

import CustomNode from './CustomNode';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const HTTPRequestNodeComponent = memo(({ data = {}, id }: { data?: any; id: string }) => {
  const updateNodeData = useReactFlowStore((state: any) => state.updateNodeData);

  const updateData = (field: string, value: any) => {
    updateNodeData(id, { [field]: value });
  };

  const handleMethodChange = (value: string) => {
    updateData('method', value);
  };

  const handleTemplateToggle = (checked: boolean) => {
    updateData('useTemplate', checked);
    if (checked && !data.template) {
      updateData('template', HTTP_TEMPLATES[0].value);
    }
  };

  const handleTemplateChange = (value: string) => {
    updateData('template', value);
  };

  const getMethodColor = (method: HttpMethod) => {
    const colors: Record<HttpMethod, string> = {
      GET: 'bg-green-500',
      POST: 'bg-blue-500',
      PUT: 'bg-orange-500',
      DELETE: 'bg-red-500',
      PATCH: 'bg-purple-500'
    };
    return colors[method] || 'bg-gray-500';
  };

  // HTTPRequestNodeのハンドル設定
  const nodeDataWithHandles = {
    ...data,
    label: 'HTTP Request',
    icon: '🌐',
    inputs: [
      { name: 'body', id: 'body' },
      { name: 'query', id: 'query' }
    ],
    outputs: [
      { name: 'response', id: 'response' },
      { name: 'error', id: 'error' },
      { name: 'metadata', id: 'metadata' }
    ],
    colorClass: 'bg-gradient-to-br from-blue-400 to-blue-600 text-white'
  };

  return (
    <CustomNode data={nodeDataWithHandles} id={id}>
      <div className="space-y-3 w-80">
        {/* テンプレート切り替え */}
        <div className="flex items-center justify-between">
          <Label htmlFor="useTemplate" className="text-sm">
            テンプレート使用
          </Label>
          <Switch
            id="useTemplate"
            checked={data.useTemplate || false}
            onCheckedChange={handleTemplateToggle}
          />
        </div>

        {/* テンプレート選択 */}
        {data.useTemplate && (
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">テンプレート</Label>
            <Select value={data.template} onValueChange={handleTemplateChange}>
              <SelectTrigger className="w-full h-8">
                <SelectValue placeholder="テンプレートを選択" />
              </SelectTrigger>
              <SelectContent>
                {HTTP_TEMPLATES.map((template: any) => (
                  <SelectItem key={template.value} value={template.value}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* メソッド選択 */}
        {!data.useTemplate && (
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">メソッド</Label>
            <Select value={data.method || 'GET'} onValueChange={handleMethodChange}>
              <SelectTrigger className="w-full h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as HttpMethod[]).map((method) => (
                  <SelectItem key={method} value={method}>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getMethodColor(method)} text-white px-2 py-0`}>
                        {method}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* URL入力 */}
        {!data.useTemplate && (
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">URL</Label>
            <Input
              type="text"
              placeholder="https://api.example.com/endpoint"
              value={data.url || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateData('url', e.target.value)}
              className="text-xs h-8 nodrag"
            />
          </div>
        )}

        {/* ヘッダー入力 */}
        {!data.useTemplate && (
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">ヘッダー (JSON)</Label>
            <Textarea
              placeholder='{"Authorization": "Bearer TOKEN"}'
              value={data.headers || '{}'}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateData('headers', e.target.value)}
              className="text-xs min-h-[60px] font-mono nodrag"
            />
          </div>
        )}

        {/* ボディ入力（POST/PUT/PATCH） */}
        {!data.useTemplate && data.method !== 'GET' && data.method !== 'DELETE' && (
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">ボディ</Label>
            <Textarea
              placeholder="リクエストボディ（JSON または テキスト）"
              value={data.body || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateData('body', e.target.value)}
              className="text-xs min-h-[80px] font-mono nodrag"
            />
          </div>
        )}

        {/* タイムアウト設定 */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">タイムアウト (ms)</Label>
          <Input
            type="number"
            value={data.timeout || 30000}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateData('timeout', parseInt(e.target.value) || 30000)}
            className="text-xs h-8 nodrag"
            min="1000"
            max="120000"
            step="1000"
          />
        </div>

        {/* テンプレート使用時の注意 */}
        {data.useTemplate && (
          <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded-md">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <p className="text-xs text-yellow-800">
              APIキーは設定画面または環境変数で設定してください
            </p>
          </div>
        )}

        {/* ステータス表示 */}
        <div className="flex justify-between items-center pt-2">
          <Badge variant={'outline' as const} className="text-xs">
            <Send className="w-3 h-3 mr-1" />
            {data.method || 'GET'}
          </Badge>
          {data.url && (
            <span className="text-xs text-gray-500 truncate max-w-[200px]">
              {new URL(data.url).hostname}
            </span>
          )}
        </div>
      </div>
    </CustomNode>
  );
});

HTTPRequestNodeComponent.displayName = 'HTTPRequestNodeComponent';

export default HTTPRequestNodeComponent;