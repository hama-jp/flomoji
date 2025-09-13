import React, { memo, ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useHandleLabels } from '../../../contexts/HandleLabelsContext';
import useExecutionStore, { ExecutionStore } from '../../../store/executionStore';

interface HandleDefinition {
  id: string;
  name: string;
}

interface CustomNodeProps {
  data: {
    label: string;
    icon: ReactNode;
    inputs: HandleDefinition[];
    outputs: HandleDefinition[];
    colorClass?: string;
  };
  children: ReactNode;
  id: string;
}

const CustomNode = ({ data, children, id }: CustomNodeProps) => {
  const executionState = useExecutionStore((state: ExecutionStore) => state.executionState);
  const showHandleLabels = useHandleLabels();

  const isRunning = executionState?.running;
  const isCurrentlyExecuting = executionState?.currentNodeId === id;
  const isExecuted = executionState?.executedNodeIds?.has?.(id);

  if (id && (isRunning || isCurrentlyExecuting || isExecuted)) {
    console.log(`Node ${id} - Running: ${isRunning}, Current: ${isCurrentlyExecuting}, Executed: ${isExecuted}`);
  }
  const { label, icon, inputs = [], outputs = [] } = data;

  const getDefaultHandles = () => {
    if (data.label === 'Input' || 'inputType' in data) {
      return { inputs: [], outputs: [{ name: 'output', id: '0' }] };
    }
    if (data.label === 'Output' || 'format' in data) {
      return { inputs: [{ name: 'input', id: '0' }], outputs: [] };
    }
    if (data.label?.includes('LLM') || 'systemPrompt' in data) {
      return { inputs: [{ name: 'input', id: '0' }], outputs: [{ name: 'output', id: '0' }] };
    }
    return { inputs: [], outputs: [] };
  };

  const { inputs: defaultInputs, outputs: defaultOutputs } = getDefaultHandles();
  const finalInputs: HandleDefinition[] = inputs.length > 0 ? inputs : defaultInputs;
  const finalOutputs: HandleDefinition[] = outputs.length > 0 ? outputs : defaultOutputs;

  console.log(`Node ${id} - Handles debug:`, {
    label: data.label,
    finalInputs,
    finalOutputs,
  });

  const maxHandles = Math.max(finalInputs.length, finalOutputs.length);
  const minHeightClass = maxHandles >= 4 ? 'min-h-48' : 'min-h-32';

  let borderClass = 'border-gray-300';
  let shadowClass = 'shadow-md';
  let animationClass = '';

  if (isCurrentlyExecuting) {
    borderClass = 'border-blue-500';
    shadowClass = 'shadow-blue-200 shadow-lg';
    animationClass = 'animate-pulse';
  } else if (isExecuted) {
    borderClass = 'border-green-500';
    shadowClass = 'shadow-green-200 shadow-lg';
  }

  return (
    <div className={`relative bg-white border-2 ${borderClass} rounded-lg ${shadowClass} ${animationClass} w-fit min-w-64 ${minHeightClass} transition-all duration-300 overflow-visible`}>
      {finalInputs.map((input: HandleDefinition, index: number) => (
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
              {String(input.name) || `in${index + 1}`}
            </span>
          )}
        </React.Fragment>
      ))}

      {finalOutputs.map((output: HandleDefinition, index: number) => (
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
              {String(output.name) || `out${index + 1}`}
            </span>
          )}
        </React.Fragment>
      ))}

      <div className={`px-4 py-2 rounded-t-lg ${data.colorClass || 'bg-gray-100'} border-b border-gray-300`}>
        <div className="text-sm font-medium flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <span>{label}</span>
        </div>
      </div>

      <div className="p-4 w-full">
        <div className="nodrag w-full">
          {children}
        </div>
      </div>
    </div>
  );
};

export default memo(CustomNode);
