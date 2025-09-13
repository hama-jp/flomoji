/* eslint-disable @typescript-eslint/no-explicit-any */
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest'

import { useStore, selectCurrentView, selectSelectedNode, useUIActions } from '../index'

describe('Zustand Store - Phase 1', () => {
  beforeEach(() => {
    // ストアを初期状態にリセット
    useStore.getState().resetUI()
  })

  describe('UI Slice - Basic Functionality', () => {
    it('should have correct initial state', () => {
      const state = useStore.getState()
      
      expect(state.currentView).toBe('workflow')
      expect(state.sidebarOpen).toBe(true)
      expect(state.selectedNode).toBe(null)
      expect(state.editingNode).toBe(null)
      expect(state.contextMenu).toBe(null)
      expect(state.showDebugLog).toBe(false)
    })

    it('should update currentView correctly', () => {
      const { setCurrentView }: any = useStore.getState()
      
      setCurrentView('chat')
      expect(useStore.getState().currentView).toBe('chat')
      
      setCurrentView('settings')
      expect(useStore.getState().currentView).toBe('settings')
    })

    it('should update sidebarOpen correctly', () => {
      const { setSidebarOpen }: any = useStore.getState()
      
      setSidebarOpen(false)
      expect(useStore.getState().sidebarOpen).toBe(false)
      
      setSidebarOpen(true)
      expect(useStore.getState().sidebarOpen).toBe(true)
    })

    it('should update selectedNode correctly', () => {
      const { setSelectedNode }: any = useStore.getState()
      const mockNode = { id: 'test-node', type: 'input' }
      
      setSelectedNode(mockNode)
      expect(useStore.getState().selectedNode).toEqual(mockNode)
      
      setSelectedNode(null)
      expect(useStore.getState().selectedNode).toBe(null)
    })

    it('should update editingNode correctly', () => {
      const { setEditingNode }: any = useStore.getState()
      const mockNode = { id: 'editing-node', type: 'llm' }
      
      setEditingNode(mockNode)
      expect(useStore.getState().editingNode).toEqual(mockNode)
      
      setEditingNode(null)
      expect(useStore.getState().editingNode).toBe(null)
    })

    it('should update contextMenu correctly', () => {
      const { setContextMenu }: any = useStore.getState()
      const mockMenu = { x: 100, y: 200, items: ['edit', 'delete'] }
      
      setContextMenu(mockMenu)
      expect(useStore.getState().contextMenu).toEqual(mockMenu)
      
      setContextMenu(null)
      expect(useStore.getState().contextMenu).toBe(null)
    })

    it('should update showDebugLog correctly', () => {
      const { setShowDebugLog }: any = useStore.getState()
      
      setShowDebugLog(true)
      expect(useStore.getState().showDebugLog).toBe(true)
      
      setShowDebugLog(false)
      expect(useStore.getState().showDebugLog).toBe(false)
    })

    it('should reset UI state correctly', () => {
      const { 
        setCurrentView, 
        setSidebarOpen, 
        setSelectedNode, 
        setEditingNode,
        setContextMenu,
        setShowDebugLog,
        resetUI 
      } = useStore.getState()
      
      // 初期状態から変更
      setCurrentView('chat')
      setSidebarOpen(false)
      setSelectedNode({ id: 'test' } as any)
      setEditingNode({ id: 'editing' } as any)
      setContextMenu({ x: 100, y: 200 })
      setShowDebugLog(true)
      
      // リセット実行
      resetUI()
      
      // 初期状態に戻ることを確認
      const state = useStore.getState()
      expect(state.currentView).toBe('workflow')
      expect(state.sidebarOpen).toBe(true)
      expect(state.selectedNode).toBe(null)
      expect(state.editingNode).toBe(null)
      expect(state.contextMenu).toBe(null)
      expect(state.showDebugLog).toBe(false)
    })
  })

  describe('Selectors', () => {
    it('should select currentView correctly', () => {
      useStore.getState().setCurrentView('data')
      expect(selectCurrentView(useStore.getState())).toBe('data')
    })

    it('should select selectedNode correctly', () => {
      const mockNode = { id: 'selector-test', type: 'output' } as any
      useStore.getState().setSelectedNode(mockNode)
      expect(selectSelectedNode(useStore.getState())).toEqual(mockNode)
    })
  })

  describe('Actions Hook', () => {
    it('should provide all UI actions', () => {
      // useUIActions フックの基本的な存在確認
      // 実際のReactコンポーネント内でのテストは統合テストで行う
      expect(typeof useUIActions).toBe('function')
    })
  })

  describe('Store Structure', () => {
    it('should have all required UI properties', () => {
      const state = useStore.getState()
      
      // 状態プロパティ
      expect(state).toHaveProperty('currentView')
      expect(state).toHaveProperty('sidebarOpen')
      expect(state).toHaveProperty('selectedNode')
      expect(state).toHaveProperty('editingNode')
      expect(state).toHaveProperty('contextMenu')
      expect(state).toHaveProperty('showDebugLog')
      
      // アクションプロパティ
      expect(state).toHaveProperty('setCurrentView')
      expect(state).toHaveProperty('setSidebarOpen')
      expect(state).toHaveProperty('setSelectedNode')
      expect(state).toHaveProperty('setEditingNode')
      expect(state).toHaveProperty('setContextMenu')
      expect(state).toHaveProperty('setShowDebugLog')
      expect(state).toHaveProperty('resetUI')
    })

    it('should have all actions as functions', () => {
      const state = useStore.getState()
      
      expect(typeof state.setCurrentView).toBe('function')
      expect(typeof state.setSidebarOpen).toBe('function')
      expect(typeof state.setSelectedNode).toBe('function')
      expect(typeof state.setEditingNode).toBe('function')
      expect(typeof state.setContextMenu).toBe('function')
      expect(typeof state.setShowDebugLog).toBe('function')
      expect(typeof state.resetUI).toBe('function')
    })
  })
})