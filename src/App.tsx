import React from "react";
import { useEffect } from 'react'

import ChatView from './components/ChatView.jsx'
import DataView from './components/DataView.jsx'
import Layout from './components/Layout.jsx'
import SettingsView from './components/SettingsView.jsx'
import WorkflowView from './components/WorkflowView.jsx'
import workflowManagerService from './services/workflowManagerService'
import { useStore, selectCurrentView, selectSelectedNode, selectEditingNode, useUIActions } from './store/index'
import './App.css'

function App() {
  // Zustandストアから状態とアクションを取得
  const currentView = useStore(selectCurrentView)
  const selectedNode = useStore(selectSelectedNode)
  const editingNode = useStore(selectEditingNode)
  const { setCurrentView, setSelectedNode, setEditingNode } = useUIActions()

  // アプリケーション初期化時にサンプルワークフローをロード
  useEffect(() => {
    workflowManagerService.initialize().catch(error => {
      console.error('ワークフローマネージャーの初期化に失敗しました:', error);
    });
  }, [])

  const renderCurrentView = () => {
    switch (currentView) {
      case 'chat':
        return <ChatView />
      case 'workflow':
        return <WorkflowView
                  selectedNode={selectedNode}
                  onSelectedNodeChange={setSelectedNode}
                  editingNode={editingNode}
                  onEditingNodeChange={setEditingNode}
                />
      case 'data':
        return <DataView />
      case 'settings':
        return <SettingsView />
      default:
        return <WorkflowView
                  selectedNode={selectedNode}
                  onSelectedNodeChange={setSelectedNode}
                  editingNode={editingNode}
                  onEditingNodeChange={setEditingNode}
                />
    }
  }

  return (
    <Layout 
      currentView={currentView} 
      onViewChange={setCurrentView as (view: string) => void}
      editingNode={editingNode}
      onEditingNodeChange={setEditingNode}
    >
      {renderCurrentView()}
    </Layout>
  )
}

export default App
