import React from 'react';

import { ReactFlowProvider } from '@xyflow/react';

import ErrorBoundary from './ErrorBoundary.jsx';
import ReactFlowEditor from './ReactFlowEditor/index.jsx';
import { DebuggerPanel } from './DebuggerPanel';
import { DataFlowVisualization } from './DataFlowVisualization';
import { WorkflowCopilotPanel } from './WorkflowCopilotPanel';
import type { WorkflowNode } from '../types';

interface WorkflowViewProps {
  selectedNode: WorkflowNode | null;
  onSelectedNodeChange: (node: WorkflowNode | null) => void;
  editingNode: WorkflowNode | null;
  onEditingNodeChange: (node: WorkflowNode | null) => void;
  onOpenCopilot?: () => void;
  onCloseCopilot?: () => void;
  isCopilotOpen?: boolean;
}

const WorkflowView = ({
  selectedNode,
  onSelectedNodeChange,
  editingNode,
  onEditingNodeChange,
  onOpenCopilot,
  onCloseCopilot,
  isCopilotOpen = false
}: WorkflowViewProps) => {

  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <div className="relative w-full h-full">
          <ReactFlowEditor
            selectedNode={selectedNode}
            onSelectedNodeChange={onSelectedNodeChange}
            editingNode={editingNode}
            onEditingNodeChange={onEditingNodeChange}
            onOpenCopilot={onOpenCopilot}
          />
          <DataFlowVisualization />
          <DebuggerPanel />
          <WorkflowCopilotPanel
            isOpen={isCopilotOpen}
            onClose={() => onCloseCopilot?.()}
          />
        </div>
      </ReactFlowProvider>
    </ErrorBoundary>
  );
};

export default WorkflowView
