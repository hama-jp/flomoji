import React from 'react';

import { ReactFlowProvider } from '@xyflow/react';

import ErrorBoundary from './ErrorBoundary.jsx';
import ReactFlowEditor from './ReactFlowEditor/index.jsx';

const WorkflowView = ({ selectedNode, onSelectedNodeChange, editingNode, onEditingNodeChange }: any) => {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <ReactFlowEditor 
          selectedNode={selectedNode}
          onSelectedNodeChange={onSelectedNodeChange}
          editingNode={editingNode}
          onEditingNodeChange={onEditingNodeChange}
        />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
};

export default WorkflowView

