import React from 'react';

import { Textarea } from '@/components/ui/textarea';

import useReactFlowStore from '../../../store/reactFlowStore';

import CustomNode from './CustomNode';

const InputNodeComponent = ({ id, data }: any) => {
  const updateNodeData = useReactFlowStore((state: any) => state.updateNodeData);

    const onChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = evt.target.value;
    updateNodeData(id, { value: newValue });
  };

  // InputNodeのハンドル設定を明示
  const nodeDataWithHandles = {
    ...data,
    inputs: [], // 入力なし
    outputs: [{ name: 'output', id: '0' }], // 出力あり
    colorClass: 'bg-gradient-to-r from-orange-400 to-orange-600 text-white'
  };

  return (
    <CustomNode data={nodeDataWithHandles} id={id}>
      <Textarea
        value={data.value || ''}
        onChange={onChange}
        className="nodrag resize-both w-full"
        style={{ resize: 'both', overflow: 'auto', minWidth: '200px', minHeight: '100px', width: '100%' }}
        placeholder="Enter input value..."
      />
    </CustomNode>
  );
};

export default InputNodeComponent;
