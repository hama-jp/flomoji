import React from 'react';
import { useDebuggerStore } from '../store/debuggerStore';
import {
  Bug,
  Play,
  Pause,
  StepForward,
  RotateCcw,
  Gauge,
  Circle,
  Square
} from 'lucide-react';
import { cn } from '../lib/utils';

export const DebuggerToolbar: React.FC = () => {
  const {
    debugMode,
    setDebugMode,
    executionStatus,
    setExecutionStatus,
    executionSpeed,
    setExecutionSpeed,
    togglePanel,
    isPanelOpen,
    clearExecutionHistory,
    breakpoints,
    stepForward,
    abortExecution
  } = useDebuggerStore();

  const handlePlayPause = () => {
    if (executionStatus === 'running') {
      setExecutionStatus('paused');
    } else {
      setExecutionStatus('running');
    }
  };

  const handleReset = () => {
    // Abort any running execution first
    abortExecution();
    clearExecutionHistory();
    setExecutionStatus('idle');
  };

  const handleStep = () => {
    if (executionStatus === 'paused') {
      // Use the stepForward function which sets both shouldStepForward and executionStatus
      stepForward();
    }
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 flex items-center gap-1">
      {/* Debug Mode Toggle */}
      <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setDebugMode(debugMode === 'off' ? 'step' : 'off')}
          className={cn(
            "p-2 rounded-md transition-all duration-200",
            debugMode !== 'off'
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          )}
          title={debugMode === 'off' ? "Enable Debugger" : "Disable Debugger"}
        >
          <Bug className="w-4 h-4" />
        </button>

        {debugMode !== 'off' && (
          <>
            {/* Mode Selector */}
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => setDebugMode('step')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  debugMode === 'step'
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
                title="Step Mode - Pause at each node"
              >
                <StepForward className="w-3.5 h-3.5 inline mr-1" />
                Step
              </button>

              <button
                onClick={() => setDebugMode('breakpoint')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors relative",
                  debugMode === 'breakpoint'
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
                title="Breakpoint Mode - Pause at breakpoints"
              >
                <Circle className="w-3.5 h-3.5 inline mr-1" />
                Break
                {breakpoints.size > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {breakpoints.size}
                  </span>
                )}
              </button>

              <button
                onClick={() => setDebugMode('slow')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  debugMode === 'slow'
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
                title="Slow Mode - Execute with delay"
              >
                <Gauge className="w-3.5 h-3.5 inline mr-1" />
                Slow
              </button>
            </div>
          </>
        )}
      </div>

      {/* Execution Controls */}
      {debugMode !== 'off' && (
        <div className="flex items-center gap-1 px-2">
          <button
            onClick={handlePlayPause}
            className={cn(
              "p-2 rounded-md transition-colors",
              executionStatus === 'running'
                ? "bg-green-500 text-white hover:bg-green-600"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            )}
            title={executionStatus === 'running' ? 'Pause' : 'Resume'}
          >
            {executionStatus === 'running' ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>

          {debugMode === 'step' && (
            <button
              onClick={handleStep}
              disabled={executionStatus === 'running'}
              className={cn(
                "p-2 rounded-md transition-colors",
                "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              title="Step to Next Node"
            >
              <StepForward className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleReset}
            className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Reset Execution"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Speed Control for Slow Mode */}
      {debugMode === 'slow' && (
        <div className="flex items-center gap-2 px-2 border-l border-gray-200 dark:border-gray-700">
          <Gauge className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <input
            type="range"
            min="100"
            max="2000"
            step="100"
            value={executionSpeed}
            onChange={(e) => setExecutionSpeed(parseInt(e.target.value))}
            className="w-24 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            title={`Delay: ${executionSpeed}ms`}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[3rem]">
            {executionSpeed}ms
          </span>
        </div>
      )}

      {/* Execution Status */}
      {debugMode !== 'off' && (
        <div className="flex items-center gap-2 px-2 border-l border-gray-200 dark:border-gray-700">
          <div className={cn(
            "w-2 h-2 rounded-full",
            executionStatus === 'running' && "bg-green-500 animate-pulse",
            executionStatus === 'paused' && "bg-yellow-500",
            executionStatus === 'error' && "bg-red-500",
            executionStatus === 'idle' && "bg-gray-400",
            executionStatus === 'completed' && "bg-blue-500"
          )} />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 capitalize">
            {executionStatus}
          </span>
        </div>
      )}

      {/* Panel Toggle */}
      <button
        onClick={togglePanel}
        className={cn(
          "p-2 rounded-md transition-colors ml-2 border-l border-gray-200 dark:border-gray-700",
          isPanelOpen
            ? "bg-blue-500 text-white hover:bg-blue-600"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        )}
        title={isPanelOpen ? "Close Debug Panel" : "Open Debug Panel"}
      >
        <Square className="w-4 h-4" />
      </button>
    </div>
  );
};

export default DebuggerToolbar;