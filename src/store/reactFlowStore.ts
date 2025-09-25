import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  Viewport
} from '@xyflow/react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import workflowManagerService from '../services/workflowManagerService';
import type { NodeData } from '../types/nodes';

// Undo/Redo用の履歴状態
interface HistoryState {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
}

// ReactFlow store state interface
interface ReactFlowState {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;

  // Undo/Redo履歴管理
  history: HistoryState[];
  historyIndex: number;
  maxHistorySize: number;
  previewActive: boolean;
  previewOriginal: HistoryState | null;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (newNode: Node) => void;
  updateNodeData: (nodeId: string, newData: Partial<NodeData>) => void;
  deleteSelectedElements: () => void;
  setViewport: (viewport: Viewport) => void;
  loadWorkflow: (id: string) => void;
  beginPreview: (graph: { nodes: Node[]; edges: Edge[] }) => void;
  endPreview: (apply: boolean) => void;

  // Undo/Redo機能
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveToHistory: () => void;
  clearHistory: () => void;
}

// デバウンス用のタイマー
let historyDebounceTimer: NodeJS.Timeout | null = null;

const useReactFlowStore = create<ReactFlowState>()(
  devtools(
    (set, get) => ({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },

      // Undo/Redo履歴
      history: [],
      historyIndex: -1,
      maxHistorySize: 50,
      previewActive: false,
      previewOriginal: null,

      onNodesChange: (changes: NodeChange[]) => {
        const currentNodes = get().nodes;
        const nodes = Array.isArray(currentNodes) ? currentNodes : [];
        set({
          nodes: applyNodeChanges(changes, nodes),
        });
        // 履歴に保存
        get().saveToHistory();
      },

      onEdgesChange: (changes: EdgeChange[]) => {
        const currentEdges = get().edges;
        const edges = Array.isArray(currentEdges) ? currentEdges : [];
        set({
          edges: applyEdgeChanges(changes, edges),
        });
        // 履歴に保存
        get().saveToHistory();
      },

      onConnect: (connection: Connection) => {
        const currentEdges = get().edges;
        const edges = Array.isArray(currentEdges) ? currentEdges : [];
        set({
          edges: addEdge({
            ...connection,
            type: 'custom',
            markerEnd: { type: 'arrow' as const }
          }, edges),
        });
        // 履歴に保存
        get().saveToHistory();
      },

      setNodes: (nodesOrUpdater) => {
        if (typeof nodesOrUpdater === 'function') {
          const currentNodes = get().nodes;
          const newNodes = nodesOrUpdater(currentNodes);
          set({ nodes: newNodes });
        } else {
          set({ nodes: nodesOrUpdater });
        }
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
              ? { ...node, data: { ...(node.data as unknown as NodeData), ...newData } }
              : node
          ),
        });
      },

      deleteSelectedElements: () => {
        const { nodes, edges } = get();
        const selectedNodes = nodes.filter((n) => n.selected);
        const selectedEdges = edges.filter((e) => e.selected);

        const selectedNodeIds = selectedNodes.map((n: any) => n.id);

        const remainingNodes = nodes.filter((n: any) => !n.selected);
        const remainingEdges = edges.filter((e: any) => 
          !e.selected && !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target)
        );

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
          const { nodes, edges, viewport }: any = workflow.flow;
          console.log('📊 Loading workflow data - nodes:', nodes?.length || 0, 'edges:', edges?.length || 0);
          console.log('📋 Node details:', nodes);

          const newState = {
            nodes: Array.isArray(nodes) ? nodes : [],
            edges: Array.isArray(edges) ? edges : [],
            viewport: viewport || { x: 0, y: 0, zoom: 1 },
            previewActive: false,
            previewOriginal: null,
          };

          set(newState);

          // ワークフロー読み込み時は履歴をクリア
          get().clearHistory();

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
            previewActive: false,
            previewOriginal: null,
          });
          get().clearHistory();
        }
      },
      beginPreview: ({ nodes, edges }) => {
        const state = get();
        console.log('beginPreview called with:', {
          nodesCount: nodes?.length || 0,
          edgesCount: edges?.length || 0,
          nodes: nodes?.map(n => ({ id: n.id, type: n.type }))
        });

        const originalSnapshot: HistoryState = {
          nodes: state.nodes.map(node => ({ ...node, data: { ...node.data } })),
          edges: state.edges.map(edge => ({ ...edge })),
          viewport: state.viewport,
        };

        const newNodes = nodes.map(node => ({ ...node, data: { ...node.data } }));
        const newEdges = edges.map(edge => ({ ...edge }));

        console.log('Setting preview state:', {
          nodesBefore: state.nodes.length,
          nodesAfter: newNodes.length,
          edgesBefore: state.edges.length,
          edgesAfter: newEdges.length,
          newNodes: newNodes
        });

        set({
          nodes: newNodes,
          edges: newEdges,
          previewActive: true,
          previewOriginal: state.previewOriginal ?? originalSnapshot,
        });
      },
      endPreview: (apply) => {
        const state = get();
        if (!state.previewActive || !state.previewOriginal) {
          set({ previewActive: false, previewOriginal: null });
          return;
        }

        if (apply) {
          set({ previewActive: false, previewOriginal: null });
          get().saveToHistory();
        } else {
          const { nodes, edges, viewport } = state.previewOriginal;
          set({
            nodes: nodes.map(node => ({ ...node, data: { ...node.data } })),
            edges: edges.map(edge => ({ ...edge })),
            viewport,
            previewActive: false,
            previewOriginal: null,
          });
        }
      },

      // Undo/Redo機能の実装
      saveToHistory: () => {
        // デバウンス処理
        if (historyDebounceTimer) {
          clearTimeout(historyDebounceTimer);
        }

        historyDebounceTimer = setTimeout(() => {
          const state = get();
          const currentState: HistoryState = {
            nodes: state.nodes,
            edges: state.edges,
            viewport: state.viewport
          };

          // 現在のインデックス以降の履歴を削除（新しい分岐を作成）
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(currentState);

          // 履歴サイズの制限
          if (newHistory.length > state.maxHistorySize) {
            newHistory.shift();
          }

          set({
            history: newHistory,
            historyIndex: newHistory.length - 1
          });

          console.log('💾 Saved to history', {
            historyLength: newHistory.length,
            currentIndex: newHistory.length - 1
          });
        }, 500); // 500msのデバウンス
      },

      undo: () => {
        const state = get();
        if (state.historyIndex > 0) {
          const newIndex = state.historyIndex - 1;
          const previousState = state.history[newIndex];

          set({
            nodes: previousState.nodes,
            edges: previousState.edges,
            viewport: previousState.viewport,
            historyIndex: newIndex
          });

          console.log('↩️ Undo performed', {
            newIndex,
            historyLength: state.history.length
          });
        }
      },

      redo: () => {
        const state = get();
        if (state.historyIndex < state.history.length - 1) {
          const newIndex = state.historyIndex + 1;
          const nextState = state.history[newIndex];

          set({
            nodes: nextState.nodes,
            edges: nextState.edges,
            viewport: nextState.viewport,
            historyIndex: newIndex
          });

          console.log('↪️ Redo performed', {
            newIndex,
            historyLength: state.history.length
          });
        }
      },

      canUndo: () => {
        const state = get();
        return state.historyIndex > 0;
      },

      canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },

      clearHistory: () => {
        if (historyDebounceTimer) {
          clearTimeout(historyDebounceTimer);
        }

        const state = get();
        const currentState: HistoryState = {
          nodes: state.nodes,
          edges: state.edges,
          viewport: state.viewport
        };

        set({
          history: [currentState],
          historyIndex: 0
        });

        console.log('🗑️ History cleared');
      },
    }),
    {
      name: 'react-flow-store',
    }
  )
);

export default useReactFlowStore;
