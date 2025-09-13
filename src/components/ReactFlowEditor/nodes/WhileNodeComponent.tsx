import React from 'react';

import { Textarea } from '@/components/ui/textarea';

import CustomNode from './CustomNode';

const WhileNodeComponent = ({ id, data }: any) => {
  const onConditionChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log('While condition:', evt.target.value);
  };

  return (
    <CustomNode data={{
      ...data,
      inputs: [
        { name: 'input', id: 'input' },
        { name: 'loop', id: 'loop' }
      ],
      outputs: [
        { name: 'output', id: 'output' },
        { name: 'loop', id: 'loop' }
      ]
    }} id={id}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Loop Condition</label>
          <Textarea
            defaultValue={data.condition || ''}
            onChange={onConditionChange}
            className="nodrag text-xs"
            placeholder="Enter loop condition..."
            rows={2}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Max Iterations</label>
          <input
            type="number"
            defaultValue={data.maxIterations || 100}
            className="nodrag w-full px-2 py-1 text-xs border rounded"
            min="1"
            max="1000"
          />
        </div>
      </div>
    </CustomNode>
  );
};

export default WhileNodeComponent;