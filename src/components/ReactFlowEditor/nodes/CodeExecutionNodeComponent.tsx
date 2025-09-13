/**
 * CodeExecutionNodeComponent.jsx
 * JS Code ノードのUIコンポーネント
 */

import React, { memo, useState } from 'react';

import { ChevronDown, ChevronUp, Play, Code, Settings } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';


import useReactFlowStore from '../../../store/reactFlowStore';
import { CODE_PRESETS } from '../../nodes/CodeExecutionNode';

import CustomNode from './CustomNode';

interface CodePreset {
  name: string;
  description: string;
  code: string;
}

const CodeExecutionNodeComponent = memo(({ data = {}, id }: { data?: any; id: string }) => {
  // 状態管理
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTab, setSelectedTab] = useState('code');
  const updateNodeData = useReactFlowStore((state: any) => state.updateNodeData);

  // データ更新ヘルパー
  const updateData = (field: string, value: any) => {
    updateNodeData(id, { [field]: value });
  };

  // プリセット選択ハンドラ
  const handlePresetChange = (value: string) => {
    if (value === 'custom') {
      return; // カスタムの場合は何もしない
    }
    const preset: CodePreset = CODE_PRESETS[value];
    if (preset) {
      updateData('code', preset.code);
      updateData('selectedPreset', value);
    }
  };

  // コード変更ハンドラ
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateData('code', e.target.value);
    updateData('selectedPreset', 'custom');
  };

  // タイムアウト変更ハンドラ
  const handleTimeoutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      updateData('timeout', value);
    }
  };

  // ハンドル設定を含むデータ
  const nodeDataWithHandles = {
    ...data,
    label: 'JS Code',
    icon: '⚙️',
    inputs: [
      { name: 'input', id: 'input' }
    ],
    outputs: [
      { name: 'output', id: 'output' },
      { name: 'error', id: 'error' }
    ],
    colorClass: 'bg-gradient-to-br from-cyan-400 to-cyan-600 text-white'
  };

  return (
    <CustomNode data={nodeDataWithHandles} id={id}>
      <div className="space-y-3 w-96">
        
        {/* タブ切り替え */}
        <div className="flex gap-2 border-b">
          <Button
            variant={selectedTab === 'code' ? 'default' : 'ghost'}
            size={'sm' as const}
            onClick={() => setSelectedTab('code')}
            className="h-7 px-2 text-xs"
          >
            <Code className="w-3 h-3 mr-1" />
            Code
          </Button>
          <Button
            variant={selectedTab === 'settings' ? 'default' : 'ghost'}
            size={'sm' as const}
            onClick={() => setSelectedTab('settings')}
            className="h-7 px-2 text-xs"
          >
            <Settings className="w-3 h-3 mr-1" />
            Settings
          </Button>
        </div>

        {/* コードタブ */}
        {selectedTab === 'code' && (
          <>
            {/* プリセット選択 */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Preset Templates</Label>
              <Select
                value={data.selectedPreset || 'custom'}
                onValueChange={handlePresetChange}
              >
                <SelectTrigger className="w-full h-8">
                  <SelectValue placeholder="Select a preset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Code</SelectItem>
                  {Object.entries(CODE_PRESETS).map(([key, preset]: [string, CodePreset]) => (
                    <SelectItem key={key} value={key}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* コードエディタ */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">JavaScript Code</Label>
              <Textarea
                value={data.code || ''}
                onChange={handleCodeChange}
                placeholder="// Enter JavaScript code here
// Access input via: input
// Access variables via: variables.variableName
// Use return to output result"
                className="font-mono text-xs min-h-[200px] nodrag"
                rows={12}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* 利用可能な変数の説明 */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant={'ghost' as const} className="w-full justify-between h-8 px-2">
                  <span className="text-xs">Available Variables & Functions</span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded space-y-1">
                  <div className="font-semibold">Available in code:</div>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li><code className="bg-white px-1 rounded">input</code> - Input data (use Merge node for multiple sources)</li>
                    <li><code className="bg-white px-1 rounded">variables</code> - Workflow variables (read-only)</li>
                    <li><code className="bg-white px-1 rounded">console.log()</code> - Debug output</li>
                    <li><code className="bg-white px-1 rounded">JSON, Math, Date, Array, Object</code> - Standard objects</li>
                    <li><code className="bg-white px-1 rounded">RegExp, Map, Set</code> - Data structures</li>
                    <li>Use <code className="bg-white px-1 rounded">return</code> to output result</li>
                  </ul>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* 設定タブ */}
        {selectedTab === 'settings' && (
          <>
            {/* タイムアウト設定 */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">
                Timeout (ms): {data.timeout || 5000}
              </Label>
              <input
                type="range"
                value={data.timeout || 5000}
                onChange={handleTimeoutChange}
                min="100"
                max="30000"
                step="100"
                className="w-full nodrag"
              />
              <div className="text-xs text-gray-500">
                Maximum execution time: {((data.timeout || 5000) / 1000).toFixed(1)}s
              </div>
            </div>

            {/* コンソールログ設定 */}
            <div className="flex items-center justify-between">
              <Label htmlFor="enableConsoleLog" className="text-xs">
                Show console.log in execution logs
              </Label>
              <Switch
                id="enableConsoleLog"
                checked={data.enableConsoleLog !== false}
                onCheckedChange={(checked: boolean) => updateData('enableConsoleLog', checked)}
              />
            </div>

            {/* 実行情報 */}
            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded space-y-1">
              <div className="font-semibold mb-1">Execution Info:</div>
              <ul className="space-y-0.5">
                <li>• Runs in isolated Web Worker</li>
                <li>• No network or DOM access</li>
                <li>• Result size limit: 10MB</li>
                <li>• Auto-terminates on timeout</li>
              </ul>
            </div>

            {/* セキュリティ情報 */}
            <div className="text-xs text-gray-600 bg-yellow-50 p-3 rounded space-y-1">
              <div className="font-semibold mb-1">Security:</div>
              <ul className="space-y-0.5">
                <li>• Code runs in sandboxed environment</li>
                <li>• Cannot access file system</li>
                <li>• Cannot make network requests</li>
                <li>• Variables are read-only</li>
              </ul>
            </div>
          </>
        )}

        {/* ステータスバー */}
        <div className="flex justify-between items-center pt-2 border-t">
          <Badge variant={'outline' as const} className="text-xs">
            <Play className="w-3 h-3 mr-1" />
            Ready
          </Badge>
          {data.selectedPreset && data.selectedPreset !== 'custom' && (
            <span className="text-xs text-gray-500">
              Preset: {CODE_PRESETS[data.selectedPreset]?.name}
            </span>
          )}
        </div>

      </div>
    </CustomNode>
  );
});

CodeExecutionNodeComponent.displayName = 'CodeExecutionNodeComponent';

export default CodeExecutionNodeComponent;