// Debugger test utility
import { useDebuggerStore } from '../store/debuggerStore';

export const testDebugger = () => {
  const store = useDebuggerStore.getState();

  console.log('Debugger Store State:', {
    debugMode: store.debugMode,
    executionStatus: store.executionStatus,
    isPanelOpen: store.isPanelOpen,
    breakpoints: store.breakpoints.size,
    executionHistory: store.executionHistory.length
  });

  // Test setting debug mode
  store.setDebugMode('step');
  console.log('Debug mode set to:', store.debugMode);

  // Test adding execution step
  store.addExecutionStep({
    nodeId: 'test-node',
    timestamp: Date.now(),
    inputs: { test: 'input' },
    outputs: { test: 'output' },
    duration: 100
  });

  console.log('Execution history length:', store.executionHistory.length);

  // Reset
  store.setDebugMode('off');
  store.clearExecutionHistory();

  console.log('Debugger test completed successfully!');
};

// Auto-run test in development
if (import.meta.env.DEV) {
  window.testDebugger = testDebugger;
  console.log('Debugger test available. Run window.testDebugger() to test.');
}