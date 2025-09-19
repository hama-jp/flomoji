import React, { useMemo } from 'react';
import { useDebuggerStore } from '../store/debuggerStore';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Bug,
  Eye,
  Activity,
  Clock,
  X,
  ChevronRight,
  ChevronDown,
  Circle,
  Square,
  StepForward
} from 'lucide-react';
import { cn } from '../lib/utils';

export const DebuggerPanel: React.FC = () => {
  const {
    debugMode,
    setDebugMode,
    executionStatus,
    setExecutionStatus,
    currentNodeId,
    executionHistory,
    currentStepIndex,
    jumpToStep,
    breakpoints,
    toggleBreakpoint,
    watchVariables,
    addWatchVariable,
    removeWatchVariable,
    dataFlowHistory,
    executionSpeed,
    setExecutionSpeed,
    isPanelOpen,
    togglePanel,
    panelPosition,
    clearExecutionHistory,
    isTimeTravel,
    timeTravelIndex,
    setTimeTravelIndex,
    stepForward,
  } = useDebuggerStore();

  const currentStep = useMemo(() => {
    if (currentStepIndex >= 0 && currentStepIndex < executionHistory.length) {
      return executionHistory[currentStepIndex];
    }
    return null;
  }, [currentStepIndex, executionHistory]);

  const handleDebugModeChange = (mode: 'off' | 'step' | 'breakpoint' | 'slow') => {
    setDebugMode(mode);
    if (mode === 'off') {
      clearExecutionHistory();
    }
  };

  const handleStepForward = () => {
    if (currentStepIndex < executionHistory.length - 1) {
      jumpToStep(currentStepIndex + 1);
    }
  };

  const handleStepBackward = () => {
    if (currentStepIndex > 0) {
      jumpToStep(currentStepIndex - 1);
    }
  };

  const handlePlayPause = () => {
    if (executionStatus === 'running') {
      setExecutionStatus('paused');
    } else if (executionStatus === 'paused' || executionStatus === 'idle') {
      setExecutionStatus('running');
    }
  };

  const handleExecutionStep = () => {
    if (executionStatus === 'paused') {
      stepForward();
    }
  };

  const handleReset = () => {
    // Abort any running execution first
    const { abortExecution } = useDebuggerStore.getState();
    abortExecution();
    clearExecutionHistory();
    setExecutionStatus('idle');
  };

  if (!isPanelOpen) {
    return (
      <button
        onClick={togglePanel}
        className={cn(
          "fixed z-50 bg-gray-800 text-white p-3 rounded-lg shadow-lg hover:bg-gray-700 transition-colors",
          panelPosition === 'bottom' ? "bottom-4 right-4" : "top-1/2 right-4 -translate-y-1/2"
        )}
        title="Open Debugger"
      >
        <Bug className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-40 bg-gray-900 text-gray-100 shadow-2xl border border-gray-700 flex flex-col",
        panelPosition === 'bottom'
          ? "bottom-0 left-0 right-0 h-80"
          : "right-0 top-0 bottom-0 w-96"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-3">
          <Bug className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold text-lg">Visual Debugger</h2>
        </div>
        <button
          onClick={togglePanel}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Debug Mode Selector */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-700 bg-gray-850">
        <span className="text-sm text-gray-400 mr-2">Mode:</span>
        {(['off', 'step', 'breakpoint', 'slow'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => handleDebugModeChange(mode)}
            className={cn(
              "px-3 py-1 rounded text-sm font-medium transition-colors",
              debugMode === mode
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            )}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Control Bar */}
      {debugMode !== 'off' && (
        <div className="flex items-center gap-2 p-4 border-b border-gray-700 bg-gray-850">
          <button
            onClick={handleStepBackward}
            disabled={currentStepIndex <= 0}
            className="p-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Step Backward"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={handlePlayPause}
            className="p-2 rounded hover:bg-gray-700 transition-colors"
            title={executionStatus === 'running' ? 'Pause' : 'Play'}
          >
            {executionStatus === 'running' ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleStepForward}
            disabled={currentStepIndex >= executionHistory.length - 1}
            className="p-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Step Forward"
          >
            <StepForward className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded hover:bg-gray-700 transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-400">Status:</span>
            <span className={cn(
              "text-sm font-medium px-2 py-1 rounded",
              executionStatus === 'running' && "bg-green-600/20 text-green-400",
              executionStatus === 'paused' && "bg-yellow-600/20 text-yellow-400",
              executionStatus === 'error' && "bg-red-600/20 text-red-400",
              executionStatus === 'idle' && "bg-gray-600/20 text-gray-400",
              executionStatus === 'completed' && "bg-blue-600/20 text-blue-400"
            )}>
              {executionStatus}
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Tabs */}
        <div className="flex flex-col w-full">
          <div className="flex border-b border-gray-700">
            <TabButton icon={<Activity className="w-4 h-4" />} label="Execution" active />
            <TabButton icon={<Eye className="w-4 h-4" />} label="Watch" />
            <TabButton icon={<Circle className="w-4 h-4" />} label="Breakpoints" />
            <TabButton icon={<Clock className="w-4 h-4" />} label="Timeline" />
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-4">
            {/* Execution Tab */}
            <div className="space-y-4">
              {/* Current Step Info */}
              {currentStep && (
                <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm text-gray-300">Current Node</h3>
                    <span className="text-xs text-gray-500">
                      Step {currentStepIndex + 1} / {executionHistory.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Node ID:</span>
                      <span className="text-sm font-mono text-blue-400">{currentStep.nodeId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Duration:</span>
                      <span className="text-sm text-gray-300">{currentStep.duration}ms</span>
                    </div>
                  </div>

                  {/* Inputs/Outputs */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 mb-2">Inputs</h4>
                      <pre className="text-xs bg-gray-900 rounded p-2 overflow-auto max-h-32">
                        {JSON.stringify(currentStep.inputs, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 mb-2">Outputs</h4>
                      <pre className="text-xs bg-gray-900 rounded p-2 overflow-auto max-h-32">
                        {JSON.stringify(currentStep.outputs, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {currentStep.error && (
                    <div className="bg-red-900/20 border border-red-700 rounded p-3 mt-3">
                      <p className="text-xs text-red-400">{currentStep.error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Execution Timeline */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-sm text-gray-300 mb-3">Execution Timeline</h3>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, executionHistory.length - 1)}
                    value={currentStepIndex}
                    onChange={(e) => jumpToStep(parseInt(e.target.value))}
                    className="w-full"
                    disabled={executionHistory.length === 0}
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-gray-500">Start</span>
                    <span className="text-xs text-gray-500">
                      {executionHistory.length > 0 ? `${executionHistory.length} steps` : 'No steps'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Speed Control for Slow Mode */}
              {debugMode === 'slow' && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium text-sm text-gray-300 mb-3">Execution Speed</h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="100"
                      value={executionSpeed}
                      onChange={(e) => setExecutionSpeed(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-400 w-20 text-right">{executionSpeed}ms</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TabButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const TabButton: React.FC<TabButtonProps> = ({ icon, label, active = false }) => (
  <button
    className={cn(
      "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-gray-800 text-white border-b-2 border-blue-500"
        : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
    )}
  >
    {icon}
    {label}
  </button>
);

export default DebuggerPanel;