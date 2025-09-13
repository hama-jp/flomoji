import React from 'react';

import { Textarea } from '@/components/ui/textarea';

import CustomNode from './CustomNode';

const IfNodeComponent = ({ id, data }: any) => {
  const onConditionChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log('Condition:', evt.target.value);
  };

  return (
    <CustomNode data={{
      ...data,
      inputs: [
        { name: 'input', id: 'input' }
      ],
      outputs: [
        { name: 'true', id: 'true' },
        { name: 'false', id: 'false' }
      ]
    }} id={id}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Condition</label>
          <Textarea
            defaultValue={data.condition || 'Please determine if the input has positive content'}
            onChange={onConditionChange}
            className="nodrag text-xs"
            placeholder="Enter condition..."
            rows={2}
          />
        </div>
        <div className="text-xs text-gray-400">
          Type: {data.conditionType || 'llm'}
        </div>
      </div>
    </CustomNode>
  );
};

export default IfNodeComponent;