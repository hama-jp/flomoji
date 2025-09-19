import React from 'react';

import { ReactFlowProvider } from '@xyflow/react';

import ErrorBoundary from './ErrorBoundary.jsx';
import ReactFlowEditor from './ReactFlowEditor/index.jsx';
import { DebuggerToolbar } from './DebuggerToolbar';
import { DebuggerPanel } from './DebuggerPanel';
import { DataFlowVisualization } from './DataFlowVisualization';
import type { WorkflowNode } from '../types';

interface WorkflowViewProps {
  selectedNode: WorkflowNode | null;
  onSelectedNodeChange: (node: WorkflowNode | null) => void;
  editingNode: WorkflowNode | null;
  onEditingNodeChange: (node: WorkflowNode | null) => void;
}

const WorkflowView = ({ selectedNode, onSelectedNodeChange, editingNode, onEditingNodeChange }: WorkflowViewProps) => {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <div className="relative w-full h-full">
          <ReactFlowEditor
            selectedNode={selectedNode}
            onSelectedNodeChange={onSelectedNodeChange}
            editingNode={editingNode}
            onEditingNodeChange={onEditingNodeChange}
          />
          <DataFlowVisualization />
          <DebuggerToolbar />
          <DebuggerPanel />
        </div>
      </ReactFlowProvider>
    </ErrorBoundary>
  );
};

export default WorkflowView

