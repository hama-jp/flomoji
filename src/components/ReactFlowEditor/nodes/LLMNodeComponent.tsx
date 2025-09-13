import React, { memo } from 'react';

import { Textarea } from '@/components/ui/textarea';

import useReactFlowStore from '../../../store/reactFlowStore';

import CustomNode from './CustomNode';

const LLMNodeComponent = ({ id, data }: any) => {
  const updateNodeData = useReactFlowStore((state: any) => state.updateNodeData);

  const onSystemPromptChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = evt.target.value;
    updateNodeData(id, { systemPrompt: newValue });
  };

  // LLMNodeのハンドル設定を明示
  const nodeDataWithHandles = {
    ...data,
    inputs: [{ name: 'prompt', id: '0' }], // プロンプト入力
    outputs: [{ name: 'response', id: '0' }], // レスポンス出力
    colorClass: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
  };

  return (
    <CustomNode data={nodeDataWithHandles} id={id}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">System Prompt</label>
          <Textarea
            value={data.systemPrompt || ''}
            onChange={onSystemPromptChange}
            className="nodrag text-xs resize-both"
            style={{ resize: 'both', overflow: 'auto', minWidth: '200px', minHeight: '80px' }}
            placeholder="Enter system prompt..."
            rows={3}
          />
        </div>
        <div className="text-xs text-gray-400">
          Model: {data.model || 'gpt-3.5-turbo'}
        </div>
      </div>
    </CustomNode>
  );
};

export default memo(LLMNodeComponent);