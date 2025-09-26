import { NodeExecutionService } from './nodeExecutionService';
import StorageService from './storageService';
import { Workflow, NodeInputs } from '../types';

/**
 * Executes a Flomoji workflow by its ID.
 *
 * @param workflowId The ID of the workflow to execute.
 * @param inputData The initial input data for the workflow.
 * @returns A Promise that resolves with the workflow's final output variables or rejects with an error.
 */
export const runFlomojiWorkflow = (workflowId: string, inputData: NodeInputs = {}): Promise<Record<string, any>> => {
  return new Promise((resolve, reject) => {
    const workflows = StorageService.getWorkflows();
    const workflow: Workflow | undefined = workflows[workflowId];

    if (!workflow) {
      return reject(new Error(`Workflow with ID "${workflowId}" not found.`));
    }

    const { nodes, edges: connections } = workflow.flow;
    const executionService = new NodeExecutionService();

    executionService.startExecution(nodes, connections, inputData)
      .then(executor => {
        const run = async () => {
          let result;
          do {
            result = await executor.next();
          } while (!result.done);

          if (result.value.status === 'completed') {
            resolve(result.value.variables || {});
          } else if (result.value.status === 'error') {
            reject(result.value.error);
          } else {
            reject(new Error(`Workflow execution finished with unexpected status: ${result.value.status}`));
          }
        };

        run().catch(reject);
      })
      .catch(reject);
  });
};