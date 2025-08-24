import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './ReactFlowEditor.css';

import useReactFlowStore from '../../store/reactFlowStore';
import useExecutionStore from '../../store/executionStore';
import { useStore as useUIStore } from '../../store';

import InputNodeComponent from './nodes/InputNodeComponent';
import OutputNodeComponent from './nodes/OutputNodeComponent';
import LLMNodeComponent from './nodes/LLMNodeComponent';
import IfNodeComponent from './nodes/IfNodeComponent';
import WhileNodeComponent from './nodes/WhileNodeComponent';
import TextNodeComponent from './nodes/TextNodeComponent';
import TextCombinerNodeComponent from './nodes/TextCombinerNodeComponent';
import VariableSetNodeComponent from './nodes/VariableSetNodeComponent';
import ScheduleNodeComponent from './nodes/ScheduleNodeComponent';
import TimestampNodeComponent from './nodes/TimestampNodeComponent';
import HTTPRequestNodeComponent from './nodes/HTTPRequestNodeComponent';
import WebSearchNodeComponent from './nodes/WebSearchNodeComponent';
import CodeExecutionNodeComponent from './nodes/CodeExecutionNodeComponent';
import CustomNode from './nodes/CustomNode';
import CustomEdge from './edges/CustomEdge';
import ContextMenu from './ContextMenu';
import ExecutionOutputWindow from '../ExecutionOutputWindow';
import WorkflowToolbar from '../WorkflowToolbar';

import { nodeTypes as nodeDefinitions } from '../nodes/index.js';
import useWorkflowExecution from '../../hooks/useWorkflowExecution';
import workflowManagerService from '../../services/workflowManagerService';
import schedulerService from '../../services/schedulerService';
import { debounce } from '../../lib/utils';

// 個別のセレクター関数を定義
const selectNodes = (state) => state.nodes;
const selectEdges = (state) => state.edges;
const selectViewport = (state) => state.viewport;
const selectOnNodesChange = (state) => state.onNodesChange;
const selectOnEdgesChange = (state) => state.onEdgesChange;
const selectOnConnect = (state) => state.onConnect;
const selectSetNodes = (state) => state.setNodes;
const selectSetEdges = (state) => state.setEdges;
const selectAddNode = (state) => state.addNode;
const selectSetViewport = (state) => state.setViewport;
const selectLoadWorkflow = (state) => state.loadWorkflow;

const selectExecutor = (state) => state.executor;
const selectSetExecutor = (state) => state.setExecutor;
const selectSetExecutionState = (state) => state.setExecutionState;
const selectSetExecutionResult = (state) => state.setExecutionResult;
const selectSetDebugLog = (state) => state.setDebugLog;

const nodeTypes = {
  input: InputNodeComponent,
  output: OutputNodeComponent,
  timestamp: TimestampNodeComponent,
  llm: LLMNodeComponent,
  if: IfNodeComponent,
  while: WhileNodeComponent,
  text: TextNodeComponent,
  text_combiner: TextCombinerNodeComponent,
  variable_set: VariableSetNodeComponent,
  schedule: ScheduleNodeComponent,
  http_request: HTTPRequestNodeComponent,
  web_search: WebSearchNodeComponent,
  code_execution: CodeExecutionNodeComponent,
  // 他の未実装ノードタイプはCustomNodeで処理
};

const edgeTypes = {
  custom: CustomEdge,
};

import { HandleLabelsProvider } from '../../contexts/HandleLabelsContext.jsx';
const ReactFlowEditor = ({ selectedNode, onSelectedNodeChange, onEditingNodeChange }) => {
  // 個別のセレクターを使用してZustandストアから値を取得
  const rawNodes = useReactFlowStore(selectNodes);
  const rawEdges = useReactFlowStore(selectEdges);
  const nodes = useMemo(() => {
    const result = Array.isArray(rawNodes) ? rawNodes : [];
    if (result.length === 0) {
      console.log('⚠️ ReactFlowEditor - nodesが空です, rawNodes:', rawNodes);
    } else {
      console.log('📊 ReactFlowEditor - nodes loaded:', result.length, 'items');
    }
    return result;
  }, [rawNodes]);
  const edges = useMemo(() => {
    const result = Array.isArray(rawEdges) ? rawEdges : [];
    console.log('🔗 ReactFlowEditor - edges:', result.length, 'connections');
    return result;
  }, [rawEdges]);
  const viewport = useReactFlowStore(selectViewport);
  const onNodesChange = useReactFlowStore(selectOnNodesChange);
  const onEdgesChange = useReactFlowStore(selectOnEdgesChange);
  const onConnect = useReactFlowStore(selectOnConnect);
  const setNodes = useReactFlowStore(selectSetNodes);
  const setEdges = useReactFlowStore(selectSetEdges);
  const addNode = useReactFlowStore(selectAddNode);
  const setViewport = useReactFlowStore(selectSetViewport);
  const loadWorkflow = useReactFlowStore(selectLoadWorkflow);

  const executor = useExecutionStore(selectExecutor);
  const executionState = useExecutionStore(state => state.executionState);
  const executionResult = useExecutionStore(state => state.executionResult);
  const debugLog = useExecutionStore(state => state.debugLog);
  const setExecutor = useExecutionStore(selectSetExecutor);
  const setExecutionState = useExecutionStore(selectSetExecutionState);
  const setExecutionResult = useExecutionStore(selectSetExecutionResult);
  const setDebugLog = useExecutionStore(selectSetDebugLog);

  const setContextMenu = useUIStore(state => state.setContextMenu);
  const setEditingNode = useUIStore(state => state.setEditingNode);
  // selectedNodeとonSelectedNodeChangeはpropsから受け取る
  const { screenToFlowPosition } = useReactFlow();
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showHandleLabels, setShowHandleLabels] = useState(true);

  // Initial load effect
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('🚀 ReactFlowEditor - 初期化開始');
        await workflowManagerService.initialize();
        const currentId = workflowManagerService.getCurrentWorkflowId();
        console.log('📝 Current workflow ID:', currentId);
        
        const workflowsData = workflowManagerService.getWorkflows();
        const workflowsList = Object.values(workflowsData);
        console.log('📁 Available workflows:', workflowsList.length);
        setWorkflows(workflowsList);
        
        if (currentId) {
          const workflow = workflowManagerService.getWorkflow(currentId);
          console.log('🔍 Found workflow for ID:', currentId, workflow);
          if (workflow && workflow.flow) {
            console.log('📊 Workflow flow data:', workflow.flow);
            loadWorkflow(currentId);
            setCurrentWorkflow(workflow);
          } else {
            console.warn('ワークフローデータが無効です:', workflow);
            loadWorkflow(null);
          }
        } else {
          loadWorkflow(null);
        }
      } catch (error) {
        console.error('初期化エラー:', error);
        loadWorkflow(null);
      }
    };
    initialize();
  }, [loadWorkflow]);

  // Effect to set the viewport when a workflow is loaded
  // Temporarily disabled to avoid infinite loops
  // useEffect(() => {
  //   if (viewport && viewport.x !== undefined && viewport.y !== undefined && viewport.zoom !== undefined) {
  //     setRfViewport(viewport);
  //   }
  // }, [viewport, setRfViewport]);

  // Auto-save effect
  const debouncedSave = useCallback(
    debounce((wf) => {
      if (wf) {
        workflowManagerService.saveWorkflow(wf);
      }
    }, 500),
  []);

  // Auto-save effect - re-enabled with improved logic
  useEffect(() => {
    if (currentWorkflow && nodes.length >= 0 && !hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  }, [nodes, edges, viewport, currentWorkflow, hasUnsavedChanges]);

  // Auto-save debounced effect
  useEffect(() => {
    if (currentWorkflow && (nodes.length > 0 || edges.length > 0)) {
      const workflowToSave = {
        ...currentWorkflow,
        flow: { nodes, edges, viewport }
      };
      debouncedSave(workflowToSave);
    }
  }, [nodes, edges, viewport, currentWorkflow, debouncedSave]);

  // Workflow management handlers
  const handleWorkflowSave = useCallback(() => {
    if (currentWorkflow) {
      const workflowToSave = {
        ...currentWorkflow,
        flow: { 
          nodes: nodes || [], 
          edges: edges || [], 
          viewport: viewport || { x: 0, y: 0, zoom: 1 }
        },
        lastModified: new Date().toISOString()
      };
      
      console.log('Manual save:', workflowToSave.name, {
        nodes: nodes?.length || 0,
        edges: edges?.length || 0,
        viewport: workflowToSave.flow.viewport
      });
      
      workflowManagerService.saveWorkflow(workflowToSave);
      setCurrentWorkflow(workflowToSave); // 最新状態で更新
      setHasUnsavedChanges(false);
      
      // workflows listも更新
      const workflowsData = workflowManagerService.getWorkflows();
      setWorkflows(Object.values(workflowsData));
    }
  }, [currentWorkflow, nodes, edges, viewport]);

  const handleWorkflowLoad = useCallback((workflowId) => {
    const workflow = workflowManagerService.getWorkflow(workflowId);
    if (workflow) {
      console.log('Loading workflow:', workflow.name, {
        nodes: workflow.flow?.nodes?.length || 0,
        edges: workflow.flow?.edges?.length || 0,
        viewport: workflow.flow?.viewport
      });
      
      // Ensure flow structure exists
      if (!workflow.flow) {
        workflow.flow = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
      }
      
      loadWorkflow(workflowId);
      setCurrentWorkflow(workflow);
      workflowManagerService.setCurrentWorkflowId(workflowId);
      setHasUnsavedChanges(false);
      
      // Update workflows list to ensure consistency
      const workflowsData = workflowManagerService.getWorkflows();
      setWorkflows(Object.values(workflowsData));
    } else {
      console.warn('Workflow not found:', workflowId);
    }
  }, [loadWorkflow]);

  const handleWorkflowCreate = useCallback((name) => {
    console.log('Creating new workflow:', name);
    
    const newWorkflow = workflowManagerService.createNewWorkflow(name);
    workflowManagerService.saveWorkflow(newWorkflow);
    workflowManagerService.setCurrentWorkflowId(newWorkflow.id);
    
    // Clear current editor state before loading new workflow
    setNodes([]);
    setEdges([]);
    setViewport({ x: 0, y: 0, zoom: 1 });
    
    loadWorkflow(newWorkflow.id);
    setCurrentWorkflow(newWorkflow);
    setHasUnsavedChanges(false);
    
    // Update workflows list
    const workflowsData = workflowManagerService.getWorkflows();
    setWorkflows(Object.values(workflowsData));
    
    console.log('New workflow created:', newWorkflow.name, newWorkflow.id);
  }, [loadWorkflow, setNodes, setEdges, setViewport]);

  const handleWorkflowRename = useCallback((newName) => {
    if (currentWorkflow) {
      const updatedWorkflow = { ...currentWorkflow, name: newName };
      workflowManagerService.saveWorkflow(updatedWorkflow);
      setCurrentWorkflow(updatedWorkflow);
      
      // Update workflows list
      const workflowsData = workflowManagerService.getWorkflows();
      setWorkflows(Object.values(workflowsData));
    }
  }, [currentWorkflow]);

  const handleWorkflowDelete = useCallback((workflowId) => {
    workflowManagerService.deleteWorkflow(workflowId);
    
    // Update workflows list
    const workflowsData = workflowManagerService.getWorkflows();
    const workflowsList = Object.values(workflowsData);
    setWorkflows(workflowsList);
    
    // Load next workflow
    const currentId = workflowManagerService.getCurrentWorkflowId();
    if (currentId) {
      handleWorkflowLoad(currentId);
    }
  }, [handleWorkflowLoad]);

  const handleWorkflowExport = useCallback(() => {
    if (currentWorkflow) {
      // Export with current flow state
      const exportWorkflow = {
        ...currentWorkflow,
        flow: { 
          nodes: nodes || [], 
          edges: edges || [], 
          viewport: viewport || { x: 0, y: 0, zoom: 1 }
        },
        lastModified: new Date().toISOString()
      };
      
      console.log('Exporting workflow:', exportWorkflow.name, {
        nodes: exportWorkflow.flow.nodes.length,
        edges: exportWorkflow.flow.edges.length
      });
      
      const dataStr = JSON.stringify(exportWorkflow, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${exportWorkflow.name || 'workflow'}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  }, [currentWorkflow, nodes, edges, viewport]);

  const handleWorkflowImport = useCallback((file) => {
    if (!file) {
      console.warn('No file provided for import');
      return;
    }
    
    console.log('Importing workflow from file:', file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedWorkflow = JSON.parse(e.target.result);
        
        // Validate workflow structure
        if (!importedWorkflow.name || !importedWorkflow.flow) {
          throw new Error('Invalid workflow format: missing name or flow');
        }
        
        // Ensure flow structure is valid
        if (!importedWorkflow.flow.nodes) importedWorkflow.flow.nodes = [];
        if (!importedWorkflow.flow.edges) importedWorkflow.flow.edges = [];
        if (!importedWorkflow.flow.viewport) importedWorkflow.flow.viewport = { x: 0, y: 0, zoom: 1 };
        
        // Generate new ID to avoid conflicts
        const newWorkflow = {
          ...importedWorkflow,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: `${importedWorkflow.name} (Imported)`,
          lastModified: new Date().toISOString()
        };
        
        console.log('Imported workflow:', newWorkflow.name, {
          nodes: newWorkflow.flow.nodes.length,
          edges: newWorkflow.flow.edges.length
        });
        
        workflowManagerService.saveWorkflow(newWorkflow);
        workflowManagerService.setCurrentWorkflowId(newWorkflow.id);
        loadWorkflow(newWorkflow.id);
        setCurrentWorkflow(newWorkflow);
        setHasUnsavedChanges(false);
        
        // Update workflows list
        const workflowsData = workflowManagerService.getWorkflows();
        setWorkflows(Object.values(workflowsData));
        
      } catch (error) {
        console.error('Import failed:', error);
        alert(`Failed to import workflow: ${error.message}`);
      }
    };
    reader.onerror = () => {
      console.error('File read failed');
      alert('Failed to read the file');
    };
    reader.readAsText(file);
  }, [loadWorkflow]);

  const handleWorkflowDuplicate = useCallback((workflow) => {
    const targetWorkflow = workflow || currentWorkflow;
    
    if (!targetWorkflow) {
      console.warn('No workflow to duplicate');
      return;
    }
    
    console.log('Duplicating workflow:', targetWorkflow.name);
    
    const duplicatedWorkflow = {
      ...targetWorkflow,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${targetWorkflow.name} (Copy)`,
      lastModified: new Date().toISOString(),
      flow: {
        nodes: targetWorkflow.flow?.nodes || [],
        edges: targetWorkflow.flow?.edges || [],
        viewport: targetWorkflow.flow?.viewport || { x: 0, y: 0, zoom: 1 }
      }
    };
    
    console.log('Duplicated workflow:', duplicatedWorkflow.name, {
      nodes: duplicatedWorkflow.flow.nodes.length,
      edges: duplicatedWorkflow.flow.edges.length
    });
    
    workflowManagerService.saveWorkflow(duplicatedWorkflow);
    
    // Update workflows list
    const workflowsData = workflowManagerService.getWorkflows();
    setWorkflows(Object.values(workflowsData));
  }, [currentWorkflow]);

  // プロパティ変更をReactFlowストアに反映する関数は不要になったため削除

  const { handleRunAll, handleStepForward, handleResetExecution } = useWorkflowExecution({
    nodes,
    connections: edges,
    nodeTypes: nodeDefinitions,
    setNodes,
    setExecutor,
    setExecutionState,
    setExecutionResult,
    setDebugLog,
    onSelectedNodeChange: onSelectedNodeChange,
    selectedNode: selectedNode,
    executor,
  });

  // SchedulerService統合 - ワークフロー実行コールバックを設定
  useEffect(() => {
    const setupSchedulerIntegration = () => {
      // ワークフロー実行コールバック
      const workflowExecutionCallback = async (workflowId, scheduleConfig) => {
        try {
          console.log(`🕐 スケジュール実行開始: ${scheduleConfig.name} (${workflowId})`);
          await handleRunAll();
          console.log(`✅ スケジュール実行完了: ${scheduleConfig.name}`);
        } catch (error) {
          console.error(`❌ スケジュール実行エラー: ${scheduleConfig.name}`, error);
          throw error;
        }
      };

      // ワークフロー停止コールバック
      const workflowStopCallback = (workflowId, reason) => {
        console.log(`🛑 スケジュール実行停止: ${workflowId} (理由: ${reason})`);
        if (executor) {
          handleResetExecution();
        }
      };

      schedulerService.setWorkflowExecutionCallback(workflowExecutionCallback);
      schedulerService.setWorkflowStopCallback(workflowStopCallback);
    };

    setupSchedulerIntegration();
  }, [handleRunAll, handleResetExecution, executor]);

  // ScheduleNodeがワークフロー内にある場合、スケジュール設定を自動更新
  useEffect(() => {
    if (!currentWorkflow || !nodes.length) return;

    const scheduleNodes = nodes.filter(node => node.type === 'schedule');
    
    scheduleNodes.forEach(scheduleNode => {
      const { cronExpression, scheduleName, enabled, timeoutMinutes } = scheduleNode.data;
      
      if (enabled) {
        const scheduleConfig = {
          cronExpression,
          name: scheduleName || `Schedule ${scheduleNode.id}`,
          enabled: true,
          timeoutMinutes: timeoutMinutes || 30,
          workflowId: currentWorkflow.id,
          nodeId: scheduleNode.id
        };

        console.log(`🔧 スケジュール設定を更新: ${scheduleConfig.name}`);
        schedulerService.setSchedule(currentWorkflow.id, scheduleConfig);
      } else {
        // 無効化された場合はスケジュールを削除
        schedulerService.removeSchedule(currentWorkflow.id);
      }
    });

    // ScheduleNodeが削除された場合もスケジュールを削除
    const hasScheduleNode = scheduleNodes.length > 0;
    if (!hasScheduleNode) {
      schedulerService.removeSchedule(currentWorkflow.id);
    }
  }, [nodes, currentWorkflow]);

  const onPaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      // 画面座標とReactFlow座標の両方を保存
      const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setContextMenu({ 
        screenX: event.clientX, 
        screenY: event.clientY,
        flowX: flowPosition.x,
        flowY: flowPosition.y
      });
    },
    [screenToFlowPosition, setContextMenu]
  );

  // ドラッグオーバー時の処理
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // ドロップ時の処理
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      console.log('🎯 ドロップイベント発生');

      const nodeType = event.dataTransfer.getData('application/reactflow');
      console.log('📝 ドラッグされたノードタイプ:', nodeType);
      
      // ノードタイプが無効な場合は何もしない
      if (typeof nodeType === 'undefined' || !nodeType || !nodeDefinitions[nodeType]) {
        console.log('❌ 無効なノードタイプ:', nodeType, 'available:', Object.keys(nodeDefinitions));
        return;
      }

      // ドロップ位置をReactFlow座標に変換
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      console.log('📍 ドロップ位置:', position);

      // ノード定義を取得
      const nodeDefinition = nodeDefinitions[nodeType];
      console.log('📋 ノード定義:', nodeDefinition);
      
      // 新しいノードを作成
      const newNodeId = `${nodeType}-${Date.now()}`;
      const newNode = {
        id: newNodeId,
        type: nodeType,
        position,
        data: {
          label: nodeDefinition.displayName || nodeDefinition.name || nodeType,
          ...nodeDefinition.defaultData
        },
      };

      console.log('✨ Creating new node:', newNode);

      // 現在のノード数を確認
      const currentNodes = nodes;
      console.log('📊 現在のノード数:', currentNodes.length);

      // ノードをストアに追加（addNode関数を使用）
      console.log('🔧 Calling addNode with:', newNode);
      addNode(newNode);
    },
    [screenToFlowPosition, addNode, nodes]
  );

  // ノードクリック時の選択処理
  const onNodeClick = useCallback((event, node) => {
    event.stopPropagation();
    console.log('ノードが選択されました:', node);
    onSelectedNodeChange?.(node);
    setEditingNode(node); // プロパティパネルに表示
    onEditingNodeChange?.(node);
  }, [onSelectedNodeChange, setEditingNode, onEditingNodeChange]);
  
  // パネルクリック時の選択解除
  const onPaneClick = useCallback(() => {
    onSelectedNodeChange?.(null);
    setEditingNode(null); // プロパティパネルを閉じる
    onEditingNodeChange?.(null);
    setContextMenu(null);
  }, [onSelectedNodeChange, setEditingNode, onEditingNodeChange, setContextMenu]);
  
  // const onViewportChangeCallback = useCallback((newViewport) => {
  //   setViewport(newViewport);
  // }, [setViewport]);

  console.log('ReactFlowEditor return 前 - コンポーネントは正常に動作中');
  
  if (nodes.length === 0) {
    console.warn('ReactFlowEditor - nodesが空です');
  }
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <WorkflowToolbar
        currentWorkflow={currentWorkflow}
        workflows={workflows}
        onSave={handleWorkflowSave}
        onLoad={handleWorkflowLoad}
        onCreate={handleWorkflowCreate}
        onRename={handleWorkflowRename}
        onDelete={handleWorkflowDelete}
        onExport={handleWorkflowExport}
        onImport={handleWorkflowImport}
        onDuplicate={handleWorkflowDuplicate}
        hasUnsavedChanges={hasUnsavedChanges}
        // Execution controls
        onRunAll={handleRunAll}
        onStop={handleResetExecution}
        onStepForward={handleStepForward}
        isExecuting={executionState?.running}
      />
      {console.log('🎨 ReactFlowコンポーネントをレンダリング中...')}
      <HandleLabelsProvider showHandleLabels={showHandleLabels}>
        <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onDragOver={onDragOver}
        onDrop={onDrop}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        fitView={false}
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <svg>
          <defs>
            <marker
              id="edge-circle"
              viewBox="-5 -5 10 10"
              refX="0"
              refY="0"
              markerWidth="20"
              markerHeight="20"
              orient="auto"
            >
              <circle stroke="#b1b1b7" strokeOpacity="0.75" r="2" cx="0" cy="0" />
            </marker>
          </defs>
        </svg>
        <Background />
        <Controls />
        <MiniMap />
        
        {/* Handle Labels Toggle */}
        <div style={{ 
          position: 'absolute',
          bottom: '20px',
          left: '60px',
          zIndex: 10,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          fontSize: '14px'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showHandleLabels}
              onChange={(e) => setShowHandleLabels(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
Show Handle Labels
          </label>
        </div>
        </ReactFlow>
      </HandleLabelsProvider>
      <ContextMenu />
      
      {/* 実行結果ウィンドウ */}
      <ExecutionOutputWindow 
        isOpen={true}
        onClose={() => {}} // 常に表示なのでクローズ機能を無効化
        executionResult={executionResult}
        debugLog={debugLog}
        executionState={executionState}
      />
    </div>
  );
};

export default ReactFlowEditor;
