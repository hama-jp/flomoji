import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Executor, ExecutionState, ExecutionResult, LogEntry, WorkflowExecutor } from '@/types';

export interface ExecutionStore {
  executor: WorkflowExecutor | null;
  executionState: ExecutionState;
  executionResult: ExecutionResult | null;
  debugLog: LogEntry[];

  setExecutor: (executor: WorkflowExecutor | null) => void;
  setExecutionState: (executionState: ExecutionState | ((prev: ExecutionState) => ExecutionState)) => void;
  setExecutionResult: (executionResult: ExecutionResult | null) => void;
  setDebugLog: (debugLog: LogEntry[]) => void;
  resetExecution: () => void;
}

const useExecutionStore = create<ExecutionStore>()(
  devtools(
    (set, get) => ({
      executor: null,
      executionState: { running: false, currentNodeId: null, executedNodeIds: new Set() },
      executionResult: null,
      debugLog: [],

      setExecutor: (executor) => set({ executor }),
      setExecutionState: (executionState) => {
        if (typeof executionState === 'function') {
          const newState = executionState(get().executionState);
          console.log('ExecutionStore - setExecutionState (function):', newState);
          set({ executionState: newState });
        } else {
          console.log('ExecutionStore - setExecutionState (direct):', executionState);
          set({ executionState });
        }
      },
      setExecutionResult: (executionResult) => set({ executionResult }),
      setDebugLog: (debugLog) => set({ debugLog }),

      resetExecution: () => set({
        executor: null,
        executionState: { running: false, currentNodeId: null, executedNodeIds: new Set() },
        executionResult: null,
        debugLog: [],
      }),
    }),
    {
      name: 'execution-store',
    }
  )
);

export default useExecutionStore;
