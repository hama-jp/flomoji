import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useExecutionStore from '../../../store/executionStore';
import { useHandleLabels } from '../../../contexts/HandleLabelsContext.jsx';

const CustomNode = ({ data, children, id }) => {
  const executionState = useExecutionStore(state => state.executionState);
  const showHandleLabels = useHandleLabels();
  
  // 実行状態をチェック  
  const isRunning = executionState?.running;
  const isCurrentlyExecuting = executionState?.currentNodeId === id;
  const isExecuted = executionState?.executedNodeIds?.has?.(id);
  
  // デバッグログ（実行中のみ）
  if (id && (isRunning || isCurrentlyExecuting || isExecuted)) {
    console.log(`Node ${id} - Running: ${isRunning}, Current: ${isCurrentlyExecuting}, Executed: ${isExecuted}`);
    console.log(`  - Full executionState:`, executionState);
    console.log(`  - CurrentNodeId from state: "${executionState?.currentNodeId}"`);
    console.log(`  - This node ID: "${id}"`);
    console.log(`  - ID types - state: ${typeof executionState?.currentNodeId}, node: ${typeof id}`);
    console.log(`  - Strict equality: ${executionState?.currentNodeId === id}`);
    console.log(`  - ExecutedNodeIds:`, executionState?.executedNodeIds);
    console.log(`  - ExecutedNodeIds has this id:`, executionState?.executedNodeIds?.has?.(id));
  }
  const { label, icon, inputs = [], outputs = [] } = data;
  
  // デフォルトのハンドル設定（ノードタイプに基づく）
  const getDefaultHandles = () => {
    if (data.label === 'Input' || data.inputType === 'text') {
      return { inputs: [], outputs: [{ name: 'output', id: '0' }] };
    }
    if (data.label === 'Output' || data.format === 'text') {
      return { inputs: [{ name: 'input', id: '0' }], outputs: [] };
    }
    if (data.label?.includes('LLM') || data.systemPrompt) {
      return { inputs: [{ name: 'input', id: '0' }], outputs: [{ name: 'output', id: '0' }] };
    }
    return { inputs: [], outputs: [] };
  };
  
  const { inputs: defaultInputs, outputs: defaultOutputs } = getDefaultHandles();
  const finalInputs = inputs.length > 0 ? inputs : defaultInputs;
  const finalOutputs = outputs.length > 0 ? outputs : defaultOutputs;
  
  // デバッグログ - ハンドル設定を確認
  console.log(`Node ${id} - Handles debug:`, {
    label: data.label,
    inputsFromData: inputs,
    outputsFromData: outputs,
    finalInputs,
    finalOutputs,
    inputsLength: finalInputs.length,
    outputsLength: finalOutputs.length
  });
  
  // ハンドル数に基づく高さの計算
  const maxHandles = Math.max(finalInputs.length, finalOutputs.length);
  const minHeightClass = maxHandles >= 4 ? 'min-h-48' : 'min-h-32';
  
  // 実行状態に応じた枠線スタイル
  let borderClass = 'border-gray-300';
  let shadowClass = 'shadow-md';
  let animationClass = '';
  
  if (isCurrentlyExecuting) {
    borderClass = 'border-blue-500';
    shadowClass = 'shadow-blue-200 shadow-lg';
    animationClass = 'animate-pulse';
    console.log(`Node ${id} applying CURRENT styles: ${borderClass} ${shadowClass} ${animationClass}`);
  } else if (isExecuted) {
    borderClass = 'border-green-500';
    shadowClass = 'shadow-green-200 shadow-lg';
    console.log(`Node ${id} applying EXECUTED styles: ${borderClass} ${shadowClass}`);
  }

  return (
    <div className={`relative bg-white border-2 ${borderClass} rounded-lg ${shadowClass} ${animationClass} w-fit min-w-64 ${minHeightClass} transition-all duration-300 overflow-visible`}>
      {/* Input handles */}
      {finalInputs.map((input, index) => (
        <React.Fragment key={input.id || `input-${index}`}>
          <Handle
            type="target"
            position={Position.Left}
            id={input.id || `input-${index}`}
            className="w-6 h-6 bg-indigo-500 border-2 border-white rounded-full hover:bg-indigo-600 transition-colors"
            style={{ 
              top: `calc(25% + 20px + ${index * 25}px)`,
              left: 0,
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#6366f1',
              width: '13px',
              height: '13px',
              border: '2px solid white'
            }}
          />
          {showHandleLabels && (
            <span className="absolute text-xs text-gray-700 font-medium whitespace-nowrap bg-white px-1 rounded border shadow-sm" style={{
              top: `calc(25% + 20px + ${index * 25}px - 8px)`,
              left: '-60px',
              zIndex: 10
            }}>
              {input.name || `in${index + 1}`}
            </span>
          )}
        </React.Fragment>
      ))}

      {/* Output handles */}
      {finalOutputs.map((output, index) => (
        <React.Fragment key={output.id || `output-${index}`}>
          <Handle
            type="source"
            position={Position.Right}
            id={output.id || `output-${index}`}
            className="w-6 h-6 bg-emerald-500 border-2 border-white rounded-full hover:bg-emerald-600 transition-colors"
            style={{ 
              top: `calc(25% + 20px + ${index * 25}px)`,
              right: 0,
              transform: 'translate(50%, -50%)',
              backgroundColor: '#10b981',
              width: '13px',
              height: '13px',
              border: '2px solid white'
            }}
          />
          {showHandleLabels && (
            <span className="absolute text-xs text-gray-700 font-medium whitespace-nowrap bg-white px-1 rounded border shadow-sm" style={{
              top: `calc(25% + 20px + ${index * 25}px - 8px)`,
              right: '-60px',
              zIndex: 10
            }}>
              {output.name || `out${index + 1}`}
            </span>
          )}
        </React.Fragment>
      ))}

      {/* Header */}
      <div className={`px-4 py-2 rounded-t-lg ${data.colorClass || 'bg-gray-100'} border-b border-gray-300`}>
        <div className="text-sm font-medium flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <span>{label}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 w-full">
        <div className="nodrag w-full">
          {children}
        </div>
      </div>
    </div>
  );
};

export default memo(CustomNode);
