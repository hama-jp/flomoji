import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// UI状態のスライス
const createUISlice = (set) => ({
  // ビュー関連
  currentView: 'workflow',
  setCurrentView: (view) => set(
    () => ({ currentView: view }),
    false,
    'ui/setCurrentView'
  ),

  // サイドバー関連  
  sidebarOpen: true,
  setSidebarOpen: (open) => set(
    () => ({ sidebarOpen: open }),
    false,
    'ui/setSidebarOpen'
  ),

  // ノード選択関連
  selectedNode: null,
  setSelectedNode: (node) => set(
    () => ({ selectedNode: node }),
    false,
    'ui/setSelectedNode'
  ),

  // ノード編集関連
  editingNode: null,
  setEditingNode: (node) => set(
    () => ({ editingNode: node }),
    false,
    'ui/setEditingNode'
  ),

  // コンテキストメニュー
  contextMenu: null,
  setContextMenu: (menu) => set(
    () => ({ contextMenu: menu }),
    false,
    'ui/setContextMenu'
  ),

  // デバッグログ表示
  showDebugLog: false,
  setShowDebugLog: (show) => set(
    () => ({ showDebugLog: show }),
    false,
    'ui/setShowDebugLog'
  ),

  // UI状態のリセット
  resetUI: () => set(
    () => ({
      currentView: 'workflow',
      sidebarOpen: true,
      selectedNode: null,
      editingNode: null,
      contextMenu: null,
      showDebugLog: false
    }),
    false,
    'ui/reset'
  )
})

// メインストアの作成
export const useStore = create()(
  devtools(
    (...args) => ({
      // UIスライスを統合
      ...createUISlice(...args),
      
      // 今後追加予定のスライス
      // ...createWorkflowSlice(...args),
      // ...createInteractionSlice(...args),
      // ...createExecutionSlice(...args),
    }),
    {
      name: 'llm-agent-store', // DevTools での表示名
      enabled: process.env.NODE_ENV === 'development' // 開発環境でのみ有効
    }
  )
)

// セレクタ（最適化のため）
export const selectCurrentView = (state) => state.currentView
export const selectSidebarOpen = (state) => state.sidebarOpen  
export const selectSelectedNode = (state) => state.selectedNode
export const selectEditingNode = (state) => state.editingNode
export const selectContextMenu = (state) => state.contextMenu

// アクション（型安全性のため）
export const useUIActions = () => {
  const store = useStore()
  return {
    setCurrentView: store.setCurrentView,
    setSidebarOpen: store.setSidebarOpen,
    setSelectedNode: store.setSelectedNode,
    setEditingNode: store.setEditingNode,
    setContextMenu: store.setContextMenu,
    resetUI: store.resetUI
  }
}