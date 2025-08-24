/**
 * UpperCaseNodeComponent - 大文字変換ノードのUIコンポーネント
 * テンプレートを使用した実装例
 */

import React, { memo } from 'react';
import CustomNode from './CustomNode';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Type } from 'lucide-react';
import useReactFlowStore from '../../../store/reactFlowStore';

const UpperCaseNodeComponent = memo(({ data = {}, id }) => {
  const updateNodeData = useReactFlowStore(state => state.updateNodeData);

  const updateData = (field, value) => {
    updateNodeData(id, { [field]: value });
  };

  // ハンドル設定
  const nodeDataWithHandles = {
    ...data,
    label: 'Upper Case',
    icon: '🔠',
    inputs: [
      { name: 'input', id: 'input' }
    ],
    outputs: [
      { name: 'output', id: 'output' },
      { name: 'metadata', id: 'metadata' },
      { name: 'error', id: 'error' }
    ],
    colorClass: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
  };

  return (
    <CustomNode data={nodeDataWithHandles} id={id}>
      <div className="space-y-3 w-72">
        
        {/* デフォルトテキスト入力 */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">デフォルトテキスト</Label>
          <Textarea
            placeholder="入力がない場合のデフォルト値..."
            value={data.defaultText || ''}
            onChange={(e) => updateData('defaultText', e.target.value)}
            className="text-sm min-h-[60px] nodrag"
            rows={2}
          />
        </div>

        {/* プレフィックス追加オプション */}
        <div className="flex items-center justify-between">
          <Label htmlFor="addPrefix" className="text-xs">
            プレフィックスを追加
          </Label>
          <Switch
            id="addPrefix"
            checked={data.addPrefix || false}
            onCheckedChange={(checked) => updateData('addPrefix', checked)}
          />
        </div>

        {/* プレフィックステキスト */}
        {data.addPrefix && (
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">プレフィックス</Label>
            <Input
              type="text"
              placeholder="UPPERCASE: "
              value={data.prefix || 'UPPERCASE: '}
              onChange={(e) => updateData('prefix', e.target.value)}
              className="text-xs h-8 nodrag"
            />
          </div>
        )}

        {/* 空白削除オプション */}
        <div className="flex items-center justify-between">
          <Label htmlFor="trimSpaces" className="text-xs">
            前後の空白を削除
          </Label>
          <Switch
            id="trimSpaces"
            checked={data.trimSpaces || false}
            onCheckedChange={(checked) => updateData('trimSpaces', checked)}
          />
        </div>

        {/* 設定状態の表示 */}
        <div className="flex flex-wrap gap-1 pt-2 border-t">
          {data.addPrefix && (
            <Badge variant="outline" className="text-xs">
              <Type className="w-3 h-3 mr-1" />
              Prefix
            </Badge>
          )}
          {data.trimSpaces && (
            <Badge variant="outline" className="text-xs">
              Trim
            </Badge>
          )}
          {!data.addPrefix && !data.trimSpaces && (
            <Badge variant="outline" className="text-xs text-gray-400">
              Simple mode
            </Badge>
          )}
        </div>

      </div>
    </CustomNode>
  );
});

UpperCaseNodeComponent.displayName = 'UpperCaseNodeComponent';

export default UpperCaseNodeComponent;