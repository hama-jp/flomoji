import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import workflowManagerService from '../services/workflowManagerService';

const useReactFlowStore = create(
  devtools(
    (set, get) => ({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },

      onNodesChange: (changes) => {
        const currentNodes = get().nodes;
        const nodes = Array.isArray(currentNodes) ? currentNodes : [];
        set({
          nodes: applyNodeChanges(changes, nodes),
        });
      },

      onEdgesChange: (changes) => {
        const currentEdges = get().edges;
        const edges = Array.isArray(currentEdges) ? currentEdges : [];
        set({
          edges: applyEdgeChanges(changes, edges),
        });
      },

      onConnect: (connection) => {
        const currentEdges = get().edges;
        const edges = Array.isArray(currentEdges) ? currentEdges : [];
        set({
          edges: addEdge({ 
            ...connection, 
            type: 'custom',
            markerEnd: { type: 'arrow' }
          }, edges),
        });
      },

      setNodes: (nodes) => {
        set({ nodes });
      },

      setEdges: (edges) => {
        set({ edges });
      },

      addNode: (newNode) => {
        console.log('🔧 addNode called with:', newNode);
        const currentNodes = get().nodes;
        console.log('📋 Current nodes in store:', currentNodes?.length || 0);
        const nodes = Array.isArray(currentNodes) ? currentNodes : [];
        const newNodes = [...nodes, newNode];
        console.log('✨ Setting new nodes array, length:', newNodes.length);
        set({ nodes: newNodes });
        
        // 設定後の状態を確認
        const afterSet = get().nodes;
        console.log('✅ After set - nodes in store:', afterSet?.length || 0);
      },

      updateNodeData: (nodeId, newData) => {
        const currentNodes = get().nodes;
        const nodes = Array.isArray(currentNodes) ? currentNodes : [];
        set({
          nodes: nodes.map(node =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, ...newData } }
              : node
          ),
        });
      },

      deleteSelectedElements: () => {
        const { nodes, edges } = get();
        const selectedNodes = nodes.filter(n => n.selected);
        const selectedEdges = edges.filter(e => e.selected);

        const selectedNodeIds = selectedNodes.map(n => n.id);

        const remainingNodes = nodes.filter(n => !n.selected);
        const remainingEdges = edges.filter(e => !e.selected && !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target));

        set({ nodes: remainingNodes, edges: remainingEdges });
      },

      setViewport: (viewport) => {
        set({ viewport });
      },

      loadWorkflow: (id) => {
        console.log('🔄 loadWorkflow called with id:', id);
        const workflow = workflowManagerService.getWorkflow(id);
        console.log('📂 Retrieved workflow:', workflow);
        
        if (workflow && workflow.flow) {
          const { nodes, edges, viewport } = workflow.flow;
          console.log('📊 Loading workflow data - nodes:', nodes?.length || 0, 'edges:', edges?.length || 0);
          console.log('📋 Node details:', nodes);
          
          const newState = {
            nodes: Array.isArray(nodes) ? nodes : [],
            edges: Array.isArray(edges) ? edges : [],
            viewport: viewport || { x: 0, y: 0, zoom: 1 },
          };
          
          set(newState);
          
          // ストアの状態を確認
          const currentState = get();
          console.log('✅ Workflow loaded - Store state nodes:', currentState.nodes?.length || 0);
        } else {
          console.log('⚠️ No valid workflow found, resetting to empty state');
          // ワークフローが見つからない場合は空の状態にリセット
          set({
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          });
        }
      },
    }),
    {
      name: 'react-flow-store',
    }
  )
);

export default useReactFlowStore;
