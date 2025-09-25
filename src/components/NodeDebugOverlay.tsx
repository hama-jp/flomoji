import React from 'react';
import { useDebuggerStore } from '../store/debuggerStore';
import { cn } from '../lib/utils';

interface NodeDebugOverlayProps {
  nodeId: string;
  isExecuting?: boolean;
  hasBreakpoint?: boolean;
}

export const NodeDebugOverlay: React.FC<NodeDebugOverlayProps> = ({
  nodeId,
  isExecuting = false,
  hasBreakpoint = false,
}) => {
  const {
    debugMode,
    executionHistory,
    currentNodeId,
    breakpoints,
    executionStatus
  } = useDebuggerStore();

  // Don't show overlay if debug mode is off
  if (debugMode === 'off') return null;

  const nodeExecution = executionHistory.find(h => h.nodeId === nodeId);
  const isCurrentNode = currentNodeId === nodeId;
  // breakpoints is a Map, so we need to use .has() instead of .includes()
  const hasBreakpointInStore = breakpoints.has(nodeId);
  const showBreakpoint = hasBreakpoint || hasBreakpointInStore;

  // Determine the status to show
  const getStatusInfo = () => {
    if (isCurrentNode && executionStatus === 'running') {
      return { color: 'bg-yellow-500', text: 'Executing', pulse: true };
    }
    if (isCurrentNode && executionStatus === 'paused') {
      return { color: 'bg-orange-500', text: 'Paused', pulse: false };
    }
    if (nodeExecution) {
      if (nodeExecution.status === 'success') {
        return { color: 'bg-green-500', text: 'Complete', pulse: false };
      }
      if (nodeExecution.status === 'error') {
        return { color: 'bg-red-500', text: 'Error', pulse: false };
      }
      if (nodeExecution.status === 'skipped') {
        return { color: 'bg-gray-400', text: 'Skipped', pulse: false };
      }
    }
    if (isExecuting) {
      return { color: 'bg-blue-500', text: 'Queued', pulse: false };
    }
    return null;
  };

  const statusInfo = getStatusInfo();

  return (
    <>
      {/* Breakpoint indicator */}
      {showBreakpoint && (
        <div className="absolute -top-2 -left-2 z-20">
          <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-sm" />
        </div>
      )}

      {/* Execution status overlay */}
      {statusInfo && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Border highlight */}
          <div
            className={cn(
              "absolute inset-0 rounded-lg border-2",
              statusInfo.color.replace('bg-', 'border-'),
              statusInfo.pulse && "animate-pulse"
            )}
          />

          {/* Status badge */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <div
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-semibold text-white shadow-sm",
                statusInfo.color,
                statusInfo.pulse && "animate-pulse"
              )}
            >
              {statusInfo.text}
            </div>
          </div>

          {/* Execution time (if available) */}
          {nodeExecution?.endTime && nodeExecution.startTime && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
              <div className="px-1.5 py-0.5 bg-gray-800 text-white rounded text-[9px] font-mono">
                {nodeExecution.endTime - nodeExecution.startTime}ms
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current execution indicator arrow */}
      {isCurrentNode && executionStatus === 'paused' && (
        <div className="absolute -left-8 top-1/2 -translate-y-1/2 z-20">
          <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-l-orange-500 animate-pulse" />
        </div>
      )}
    </>
  );
};

export default NodeDebugOverlay;