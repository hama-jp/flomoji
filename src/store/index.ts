import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { WorkflowNode } from '../types';

// View types
type ViewType = 'workflow' | 'chat' | 'data' | 'settings';

// Context menu interface
interface ContextMenu {
  x: number;
  y: number;
  nodeId?: string;
  items?: Array<{
    label: string;
    action: () => void;
  }>;
}

// UI state interface
interface UIState {
  // View related
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Sidebar related
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Node selection related
  selectedNode: WorkflowNode | null;
  setSelectedNode: (node: WorkflowNode | null) => void;

  // Node editing related
  editingNode: WorkflowNode | null;
  setEditingNode: (node: WorkflowNode | null) => void;

  // Context menu
  contextMenu: ContextMenu | null;
  setContextMenu: (menu: ContextMenu | null) => void;

  // Debug log display
  showDebugLog: boolean;
  setShowDebugLog: (show: boolean) => void;

  // UI state reset
  resetUI: () => void;
}

// UI state slice creator
const createUISlice = (set: any): UIState => ({
  // View related
  currentView: 'workflow',
  setCurrentView: (view) => set(
    () => ({ currentView: view }),
    false,
    'ui/setCurrentView'
  ),

  // Sidebar related  
  sidebarOpen: true,
  setSidebarOpen: (open) => set(
    () => ({ sidebarOpen: open }),
    false,
    'ui/setSidebarOpen'
  ),

  // Node selection related
  selectedNode: null,
  setSelectedNode: (node) => set(
    () => ({ selectedNode: node }),
    false,
    'ui/setSelectedNode'
  ),

  // Node editing related
  editingNode: null,
  setEditingNode: (node) => set(
    () => ({ editingNode: node }),
    false,
    'ui/setEditingNode'
  ),

  // Context menu
  contextMenu: null,
  setContextMenu: (menu) => set(
    () => ({ contextMenu: menu }),
    false,
    'ui/setContextMenu'
  ),

  // Debug log display
  showDebugLog: false,
  setShowDebugLog: (show) => set(
    () => ({ showDebugLog: show }),
    false,
    'ui/setShowDebugLog'
  ),

  // UI state reset
  resetUI: () => set(
    () => ({
      currentView: 'workflow' as ViewType,
      sidebarOpen: true,
      selectedNode: null,
      editingNode: null,
      contextMenu: null,
      showDebugLog: false
    }),
    false,
    'ui/reset'
  )
});

// Complete store state interface
interface StoreState extends UIState {
  // Future slices will be added here
  // ...WorkflowState
  // ...InteractionState
  // ...ExecutionState
}

// Main store creation
export const useStore = create<StoreState>()(
  devtools(
    (set, get, api) => ({
      // Integrate UI slice
      ...createUISlice(set),
      
      // Future slices to be added
      // ...createWorkflowSlice(set, get, api),
      // ...createInteractionSlice(set, get, api),
      // ...createExecutionSlice(set, get, api),
    }),
    {
      name: 'llm-agent-store', // Display name in DevTools
      enabled: process.env.NODE_ENV === 'development' // Only enabled in development
    }
  )
);

// Selectors (for optimization)
export const selectCurrentView = (state: StoreState) => state.currentView;
export const selectSidebarOpen = (state: StoreState) => state.sidebarOpen;
export const selectSelectedNode = (state: StoreState) => state.selectedNode;
export const selectEditingNode = (state: StoreState) => state.editingNode;
export const selectContextMenu = (state: StoreState) => state.contextMenu;

// Actions (for type safety)
export const useUIActions = () => {
  const store = useStore();
  return {
    setCurrentView: store.setCurrentView,
    setSidebarOpen: store.setSidebarOpen,
    setSelectedNode: store.setSelectedNode,
    setEditingNode: store.setEditingNode,
    setContextMenu: store.setContextMenu,
    resetUI: store.resetUI
  };
};