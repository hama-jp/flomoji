import React, { useEffect, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import useReactFlowStore from '../../../store/reactFlowStore';
import workflowManagerService from '../../../services/workflowManagerService';
import { Workflow } from '../../../types';
import CustomNode from './CustomNode';

const WorkflowNodeComponent = ({ id, data }: { id: string; data: any }) => {
  const { updateNodeData } = useReactFlowStore.getState();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  useEffect(() => {
    const allWorkflows = Object.values(workflowManagerService.getWorkflows());
    const currentWorkflowId = workflowManagerService.getCurrentWorkflowId();
    setWorkflows(allWorkflows.filter(wf => wf.id !== currentWorkflowId));
  }, []);

  const handleWorkflowChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const workflowId = event.target.value;
    const selectedWorkflow = workflows.find(wf => wf.id === workflowId);

    if (selectedWorkflow?.flow) {
      const inputNodes = selectedWorkflow.flow.nodes.filter(n => n.type === 'input');
      const outputNodes = selectedWorkflow.flow.nodes.filter(n => n.type === 'output');

      const inputs = inputNodes.map(n => ({ id: n.data.name || 'input', name: n.data.name || 'Input' }));
      const outputs = outputNodes.map(n => ({ id: n.data.name || 'output', name: n.data.name || 'Output' }));

      updateNodeData(id, {
        workflowId: selectedWorkflow.id,
        workflowName: selectedWorkflow.name,
        inputs,
        outputs,
      });
    }
  }, [id, workflows, updateNodeData]);

  return (
    <CustomNode id={id} data={data}>
      <div className="p-2">
        <select
          value={data.workflowId || ''}
          onChange={handleWorkflowChange}
          className="w-full p-1 border rounded bg-gray-50 dark:bg-gray-700 text-sm"
        >
          <option value="" disabled>Select a workflow</option>
          {workflows.map(wf => (
            <option key={wf.id} value={wf.id}>{wf.name}</option>
          ))}
        </select>
      </div>
      {data.inputs?.map((input: any, index: number) => (
        <Handle
          key={input.id}
          type="target"
          position={Position.Left}
          id={input.id}
          style={{ top: `${(index + 1) * 35 + 40}px` }}
        />
      ))}
      {data.outputs?.map((output: any, index: number) => (
        <Handle
          key={output.id}
          type="source"
          position={Position.Right}
          id={output.id}
          style={{ top: `${(index + 1) * 35 + 40}px` }}
        />
      ))}
    </CustomNode>
  );
};

export default WorkflowNodeComponent;