import React, { memo } from 'react';

import { Textarea } from '@/components/ui/textarea';

import CustomNode from './CustomNode';

const TextNodeComponent = ({ id, data }: any) => {
  const onTextChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log('Text:', evt.target.value);
  };

  return (
    <CustomNode data={data} id={id}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Text Content</label>
          <Textarea
            defaultValue={data.text || ''}
            onChange={onTextChange}
            className="nodrag text-xs"
            placeholder="Enter text content..."
            rows={4}
          />
        </div>
        <div className="text-xs text-gray-400">
          Format: {data.format || 'plain'}
        </div>
      </div>
    </CustomNode>
  );
};

export default memo(TextNodeComponent);