import { createNodeDefinition } from './types';
import type { NodeInputs } from '../../types';
import workflowManagerService from '../../services/workflowManagerService';
import { NodeExecutionService } from '../../services/nodeExecutionService';

import type { WorkflowNode as WorkflowNodeData } from '../../types';

export async function executeWorkflowNode(node: WorkflowNodeData, inputs: NodeInputs): Promise<any> {
  const { workflowId } = node.data;
  if (!workflowId) {
    return { error: 'Workflow ID is not set' };
  }

  const workflow = workflowManagerService.getWorkflow(workflowId);
  if (!workflow || !workflow.flow) {
    return { error: `Workflow with ID ${workflowId} not found` };
  }

  // Use a dedicated instance of the execution service for the sub-workflow
  const subExecutionService = new NodeExecutionService();
  const executionGenerator = await subExecutionService.startExecution(
    workflow.flow.nodes,
    workflow.flow.edges,
    inputs
  );

  let lastResult: any = {};
  while (true) {
    const { done, value } = await executionGenerator.next();
    if (done) {
      lastResult = value;
      break;
    }
  }

  if (lastResult?.status === 'error') {
    return { error: `Sub-workflow execution failed: ${lastResult.error?.message}` };
  }

  // Extract variables from the completed sub-workflow execution
  const subWorkflowVariables = lastResult?.variables || {};
  const outputNodes = workflow.flow.nodes.filter(n => n.type === 'output');
  const result: any = {};

  outputNodes.forEach(outputNode => {
    const outputName = outputNode.data.name || 'output';
    if (subWorkflowVariables[outputName]) {
      result[outputName] = subWorkflowVariables[outputName];
    }
  });

  // If there is only one output, return it directly.
  const outputKeys = Object.keys(result);
  if (outputKeys.length === 1) {
    return result[outputKeys[0]];
  }

  // Otherwise, return the multi-output object.
  result.__multiOutput = true;
  return result;
}


// Node definition
export const WorkflowNode = createNodeDefinition(
  'Workflow',
  '🌊',
  'purple',
  ['input'], // Will be dynamic later
  ['output'], // Will be dynamic later
  {
    workflowId: '',
    workflowName: 'Select a workflow',
  },
  executeWorkflowNode,
  {
    description: 'Executes another workflow as a sub-process.',
    category: 'control-flow',
  }
);

export default WorkflowNode;