import React from 'react';

import CustomNode from './CustomNode';

const TextCombinerNodeComponent = ({ id, data }: any) => {
  // Text Combinerは設定UIなし、単純にテキスト結合を行う
  return (
    <CustomNode data={{
      ...data,
      inputs: [
        { name: 'input1', id: 'input1' },
        { name: 'input2', id: 'input2' },
        { name: 'input3', id: 'input3' },
        { name: 'input4', id: 'input4' }
      ],
      outputs: [
        { name: 'output', id: 'output' }
      ]
    }} id={id}>
      <div className="text-xs text-gray-500 text-center py-2">
        Combines 4 text inputs
      </div>
    </CustomNode>
  );
};

export default TextCombinerNodeComponent;