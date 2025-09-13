import React, { memo } from 'react';

import { Textarea } from '@/components/ui/textarea';

import CustomNode from './CustomNode';

const VariableSetNodeComponent = ({ id, data }: any) => {
  const onVariableNameChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Variable name:', evt.target.value);
  };

  const onValueChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log('Value:', evt.target.value);
  };

  const onUseInputChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Use input:', evt.target.checked);
  };

  return (
    <CustomNode data={{
      ...data,
      inputs: [
        { name: 'input', id: 'input' }
      ],
      outputs: [
        { name: 'output', id: 'output' }
      ]
    }} id={id}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Variable Name</label>
          <input
            type="text"
            defaultValue={data.variableName || ''}
            onChange={onVariableNameChange}
            className="nodrag w-full px-2 py-1 text-xs border rounded"
            placeholder="Enter variable name..."
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Value</label>
          <Textarea
            defaultValue={data.value || ''}
            onChange={onValueChange}
            className="nodrag text-xs"
            placeholder="Enter value or leave empty to use input..."
            rows={2}
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            defaultChecked={data.useInput || false}
            onChange={onUseInputChange}
            className="nodrag"
            id={`use-input-${id}`}
          />
          <label htmlFor={`use-input-${id}`} className="text-xs text-gray-500">
            Use input value
          </label>
        </div>
      </div>
    </CustomNode>
  );
};

export default memo(VariableSetNodeComponent);