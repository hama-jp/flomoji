import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type DebugMode = 'off' | 'step' | 'breakpoint' | 'slow';
export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

interface BreakpointInfo {
  nodeId: string;
  enabled: boolean;
  condition?: string;
}

interface WatchVariable {
  id: string;
  name: string;
  path: string;
  value: any;
}

interface ExecutionStep {
  nodeId: string;
  timestamp: number;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  error?: string;
  duration: number;
}

interface DataFlowEdge {
  sourceNodeId: string;
  targetNodeId: string;
  data: any;
  timestamp: number;
}

interface DebuggerStore {
  // Debug mode
  debugMode: DebugMode;
  setDebugMode: (mode: DebugMode) => void;

  // Execution control
  executionStatus: ExecutionStatus;
  currentNodeId: string | null;
  currentStepIndex: number;
  shouldStepForward: boolean;
  abortController: AbortController | null;
  setExecutionStatus: (status: ExecutionStatus) => void;
  setCurrentNode: (nodeId: string | null) => void;
  stepForward: () => void;
  setAbortController: (controller: AbortController | null) => void;
  abortExecution: () => void;

  // Step execution
  executionHistory: ExecutionStep[];
  addExecutionStep: (step: ExecutionStep) => void;
  clearExecutionHistory: () => void;
  jumpToStep: (index: number) => void;

  // Breakpoints
  breakpoints: Map<string, BreakpointInfo>;
  toggleBreakpoint: (nodeId: string) => void;
  setBreakpointCondition: (nodeId: string, condition: string) => void;
  clearAllBreakpoints: () => void;

  // Variable watching
  watchVariables: WatchVariable[];
  addWatchVariable: (variable: Omit<WatchVariable, 'id'>) => void;
  removeWatchVariable: (id: string) => void;
  updateWatchVariable: (id: string, value: any) => void;
  clearWatchVariables: () => void;

  // Data flow visualization
  dataFlowHistory: DataFlowEdge[];
  addDataFlow: (flow: DataFlowEdge) => void;
  clearDataFlowHistory: () => void;

  // Execution speed (for slow mode)
  executionSpeed: number; // ms delay between nodes
  setExecutionSpeed: (speed: number) => void;

  // Panel visibility
  isPanelOpen: boolean;
  togglePanel: () => void;
  panelPosition: 'bottom' | 'right';
  setPanelPosition: (position: 'bottom' | 'right') => void;

  // Time travel
  isTimeTravel: boolean;
  timeTravelIndex: number;
  enableTimeTravel: () => void;
  disableTimeTravel: () => void;
  setTimeTravelIndex: (index: number) => void;
}

export const useDebuggerStore = create<DebuggerStore>()(
  devtools(
    (set, get) => ({
      // Debug mode
      debugMode: 'off',
      setDebugMode: (mode) => set({ debugMode: mode }),

      // Execution control
      executionStatus: 'idle',
      currentNodeId: null,
      currentStepIndex: -1,
      shouldStepForward: false,
      abortController: null,
      setExecutionStatus: (status) => set({ executionStatus: status }),
      setCurrentNode: (nodeId) => set({ currentNodeId: nodeId }),
      stepForward: () => set({ shouldStepForward: true, executionStatus: 'running' }),
      setAbortController: (controller) => set({ abortController: controller }),
      abortExecution: () => {
        const state = get();
        if (state.abortController) {
          state.abortController.abort();
          set({
            abortController: null,
            executionStatus: 'idle',
            currentNodeId: null,
            shouldStepForward: false
          });
        }
      },

      // Step execution
      executionHistory: [],
      addExecutionStep: (step) =>
        set((state) => {
          // Limit execution history to last 100 items to prevent memory bloat
          const MAX_HISTORY_SIZE = 100;
          let newHistory = [...state.executionHistory, step];
          if (newHistory.length > MAX_HISTORY_SIZE) {
            newHistory = newHistory.slice(-MAX_HISTORY_SIZE);
          }
          return {
            executionHistory: newHistory,
            currentStepIndex: newHistory.length - 1,
          };
        }),
      clearExecutionHistory: () =>
        set({
          executionHistory: [],
          currentStepIndex: -1,
          dataFlowHistory: [],
        }),
      jumpToStep: (index) =>
        set((state) => ({
          currentStepIndex: Math.max(0, Math.min(index, state.executionHistory.length - 1)),
          isTimeTravel: true,
          timeTravelIndex: index,
        })),

      // Breakpoints
      breakpoints: new Map(),
      toggleBreakpoint: (nodeId) =>
        set((state) => {
          const breakpoints = new Map(state.breakpoints);
          if (breakpoints.has(nodeId)) {
            breakpoints.delete(nodeId);
          } else {
            breakpoints.set(nodeId, { nodeId, enabled: true });
          }
          return { breakpoints };
        }),
      setBreakpointCondition: (nodeId, condition) =>
        set((state) => {
          const breakpoints = new Map(state.breakpoints);
          const bp = breakpoints.get(nodeId);
          if (bp) {
            breakpoints.set(nodeId, { ...bp, condition });
          }
          return { breakpoints };
        }),
      clearAllBreakpoints: () => set({ breakpoints: new Map() }),

      // Variable watching
      watchVariables: [],
      addWatchVariable: (variable) =>
        set((state) => ({
          watchVariables: [
            ...state.watchVariables,
            { ...variable, id: `watch-${Date.now()}-${Math.random()}` },
          ],
        })),
      removeWatchVariable: (id) =>
        set((state) => ({
          watchVariables: state.watchVariables.filter((v) => v.id !== id),
        })),
      updateWatchVariable: (id, value) =>
        set((state) => ({
          watchVariables: state.watchVariables.map((v) =>
            v.id === id ? { ...v, value } : v
          ),
        })),
      clearWatchVariables: () => set({ watchVariables: [] }),

      // Data flow visualization
      dataFlowHistory: [],
      addDataFlow: (flow) =>
        set((state) => {
          // Limit data flow history to last 50 items to prevent memory bloat
          const MAX_DATAFLOW_SIZE = 50;
          let newHistory = [...state.dataFlowHistory, flow];
          if (newHistory.length > MAX_DATAFLOW_SIZE) {
            newHistory = newHistory.slice(-MAX_DATAFLOW_SIZE);
          }
          return {
            dataFlowHistory: newHistory,
          };
        }),
      clearDataFlowHistory: () => set({ dataFlowHistory: [] }),

      // Execution speed
      executionSpeed: 500,
      setExecutionSpeed: (speed) => set({ executionSpeed: speed }),

      // Panel visibility
      isPanelOpen: false,
      togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
      panelPosition: 'bottom',
      setPanelPosition: (position) => set({ panelPosition: position }),

      // Time travel
      isTimeTravel: false,
      timeTravelIndex: -1,
      enableTimeTravel: () => set({ isTimeTravel: true }),
      disableTimeTravel: () => set({ isTimeTravel: false, timeTravelIndex: -1 }),
      setTimeTravelIndex: (index) => set({ timeTravelIndex: index }),
    }),
    {
      name: 'debugger-store',
    }
  )
);