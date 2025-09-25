import React, { useCallback, useEffect, useState, useMemo, useRef, SetStateAction } from 'react';

import { ReactFlow, Background, Controls, MiniMap, useReactFlow, Viewport } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './ReactFlowEditor.css';

import { toast } from 'sonner';

import useKeyboardShortcuts, { COMMON_SHORTCUTS } from '../../hooks/useKeyboardShortcuts';
import useWorkflowExecution from '../../hooks/useWorkflowExecution';
import { debounce } from '../../lib/utils';
import schedulerService from '../../services/schedulerService';
import workflowManagerService from '../../services/workflowManagerService';
import { useStore as useUIStore } from '../../store';
import useExecutionStore, { ExecutionStore } from '../../store/executionStore';
import useReactFlowStore from '../../store/reactFlowStore';
import ExecutionOutputWindow from '../ExecutionOutputWindow';
import { nodeTypes as nodeDefinitions } from '../nodes';
import WorkflowToolbar from '../WorkflowToolbar';

import ContextMenu from './ContextMenu';
import CustomEdge from './edges/CustomEdge';
import CodeExecutionNodeComponent from './nodes/CodeExecutionNodeComponent';
import CustomNode from './nodes/CustomNode';
import HTTPRequestNodeComponent from './nodes/HTTPRequestNodeComponent';
import IfNodeComponent from './nodes/IfNodeComponent';
import InputNodeComponent from './nodes/InputNodeComponent';
import LLMNodeComponent from './nodes/LLMNodeComponent';
import OutputNodeComponent from './nodes/OutputNodeComponent';
import ScheduleNodeComponent from './nodes/ScheduleNodeComponent';
import TextCombinerNodeComponent from './nodes/TextCombinerNodeComponent';
import TextNodeComponent from './nodes/TextNodeComponent';
import TimestampNodeComponent from './nodes/TimestampNodeComponent';
import VariableSetNodeComponent from './nodes/VariableSetNodeComponent';
import WebSearchNodeComponent from './nodes/WebSearchNodeComponent';
import WebAPINodeComponent from './nodes/WebAPINodeComponent';
import WhileNodeComponent from './nodes/WhileNodeComponent';
import StructuredExtractionNodeComponent from './nodes/StructuredExtractionNodeComponent';
import SchemaValidatorNodeComponent from './nodes/SchemaValidatorNodeComponent';

import { HandleLabelsProvider } from '../../contexts/HandleLabelsContext';
import { Workflow, WorkflowNode, WorkflowEdge } from '../../types';
import { Executor, ExecutionState, ExecutionResult, LogEntry, WorkflowExecutor } from '../../types/index';

// Type imports for stores
type ReactFlowStoreState = any; // TODO: Import proper type from store
// type ExecutionStoreState = any; // TODO: Import proper type from store // コメントアウトまたは削除

// 個別のセレクター関数を定義
const selectNodes = (state: ReactFlowStoreState) => state.nodes;
const selectEdges = (state: ReactFlowStoreState) => state.edges;
const selectViewport = (state: ReactFlowStoreState) => state.viewport;
const selectOnNodesChange = (state: ReactFlowStoreState) => state.onNodesChange;
const selectOnEdgesChange = (state: ReactFlowStoreState) => state.onEdgesChange;
const selectOnConnect = (state: ReactFlowStoreState) => state.onConnect;
const selectSetNodes = (state: ReactFlowStoreState) => state.setNodes;
const selectSetEdges = (state: ReactFlowStoreState) => state.setEdges;
const selectAddNode = (state: ReactFlowStoreState) => state.addNode;
const selectSetViewport = (state: ReactFlowStoreState) => state.setViewport;
const selectLoadWorkflow = (state: ReactFlowStoreState) => state.loadWorkflow;
const selectUndo = (state: ReactFlowStoreState) => state.undo;
const selectRedo = (state: ReactFlowStoreState) => state.redo;
const selectCanUndo = (state: ReactFlowStoreState) => state.canUndo;
const selectCanRedo = (state: ReactFlowStoreState) => state.canRedo;
const selectDeleteSelectedElements = (state: ReactFlowStoreState) => state.deleteSelectedElements;

const selectExecutor = (state: ExecutionStore) => state.executor;
const selectSetExecutor = (state: ExecutionStore) => state.setExecutor;
const selectSetExecutionState = (state: ExecutionStore) => state.setExecutionState;
const selectSetExecutionResult = (state: ExecutionStore) => state.setExecutionResult;
const selectSetDebugLog = (state: ExecutionStore) => state.setDebugLog;

// nodeTypesとedgeTypesをコンポーネント外で定義して完全に静的にする
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
  web_api: WebAPINodeComponent,
  structured_extraction: StructuredExtractionNodeComponent,
  schema_validator: SchemaValidatorNodeComponent,
  // 他の未実装ノードタイプはCustomNodeで処理
};

const edgeTypes = {
  custom: CustomEdge,
};

const ReactFlowEditor = ({ selectedNode, onSelectedNodeChange, onEditingNodeChange, onOpenCopilot }: any) => {
  // 個別のセレクターを使用してZustandストアから値を取得
  const rawNodes = useReactFlowStore(selectNodes);
  const rawEdges = useReactFlowStore(selectEdges);
  const nodes = useMemo(() => {
    const result = Array.isArray(rawNodes) ? rawNodes : [];
    // 初期状態では空なのは正常なので、デバッグレベルを下げる
    if (result.length === 0) {
      console.debug('ReactFlowEditor - 初期化中: ノードが空です');
    } else {
      console.log('📊 ReactFlowEditor - nodes loaded:', result.length, 'items');
    }
    return result;
  }, [rawNodes]);
  const edges = useMemo(() => {
    const result = Array.isArray(rawEdges) ? rawEdges : [];
    if (result.length > 0) {
      console.log('🔗 ReactFlowEditor - edges:', result.length, 'connections');
    }
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
  const undo = useReactFlowStore(selectUndo);
  const redo = useReactFlowStore(selectRedo);
  const canUndo = useReactFlowStore(selectCanUndo);
  const canRedo = useReactFlowStore(selectCanRedo);
  const deleteSelectedElements = useReactFlowStore(selectDeleteSelectedElements);

  const executor = useExecutionStore(selectExecutor) as Executor | null;
  const executionState = useExecutionStore((state: { executionState: ExecutionState }) => state.executionState);
  const executionResult = useExecutionStore((state: ExecutionStore) => state.executionResult);
  const debugLog = useExecutionStore((state: { debugLog: LogEntry[] }) => state.debugLog);
  const setExecutor = useExecutionStore(selectSetExecutor) as (executor: Executor | null) => void;
  const setExecutionState = useExecutionStore(selectSetExecutionState);
  const setExecutionResult = useExecutionStore(selectSetExecutionResult);
  const setDebugLog = useExecutionStore(selectSetDebugLog) as (log: SetStateAction<LogEntry[]>) => void;

  const setContextMenu = useUIStore((state: any) => state.setContextMenu);
  const setEditingNode = useUIStore((state: any) => state.setEditingNode);
  // selectedNodeとonSelectedNodeChangeはpropsから受け取る
  const { screenToFlowPosition }: any = useReactFlow();
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showHandleLabels, setShowHandleLabels] = useState(true);

  // useRefで安定した参照を作成（Phase 3最適化）
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const currentWorkflowRef = useRef(currentWorkflow);
  const viewportRef = useRef(viewport);

  // Refを更新
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    currentWorkflowRef.current = currentWorkflow;
  }, [currentWorkflow]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

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
      } catch (error: any) {
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
    debounce((wf: Workflow) => {
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

  // Workflow management handlers（Phase 3: 依存配列を最適化）
  const handleWorkflowSave = useCallback(() => {
    const current = currentWorkflowRef.current;
    if (current) {
      const workflowToSave = {
        ...(current as Workflow),
        flow: {
          nodes: nodesRef.current || [],
          edges: edgesRef.current || [],
          viewport: viewportRef.current || { x: 0, y: 0, zoom: 1 }
        },
        lastModified: new Date().toISOString()
      };

      console.log('Manual save:', workflowToSave.name, {
        nodes: nodesRef.current?.length || 0,
        edges: edgesRef.current?.length || 0,
        viewport: workflowToSave.flow.viewport
      });

      workflowManagerService.saveWorkflow(workflowToSave);
      setCurrentWorkflow(workflowToSave); // 最新状態で更新
      setHasUnsavedChanges(false);

      // workflows listも更新
      const workflowsData = workflowManagerService.getWorkflows();
      setWorkflows(Object.values(workflowsData));
    }
  }, []); // 依存配列が空に！

  const handleWorkflowLoad = useCallback((workflowId: string) => {
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

  const handleWorkflowCreate = useCallback((name: string) => {
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

  const handleWorkflowRename = useCallback((newName: string) => {
    if (currentWorkflow) {
      const updatedWorkflow = { ...(currentWorkflow as Workflow), name: newName };
      workflowManagerService.saveWorkflow(updatedWorkflow);
      setCurrentWorkflow(updatedWorkflow);
      
      // Update workflows list
      const workflowsData = workflowManagerService.getWorkflows();
      setWorkflows(Object.values(workflowsData));
    }
  }, [currentWorkflow]);

  const handleWorkflowDelete = useCallback((workflowId: string) => {
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
    const current = currentWorkflowRef.current;
    if (current) {
      // Export with current flow state
      const exportWorkflow = {
        ...(current as Workflow),
        flow: {
          nodes: nodesRef.current || [],
          edges: edgesRef.current || [],
          viewport: viewportRef.current || { x: 0, y: 0, zoom: 1 }
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
  }, []); // Phase 3: 依存配列を削減

  const handleWorkflowImport = useCallback((file: File) => {
    if (!file) {
      console.warn('No file provided for import');
      return;
    }
    
    console.log('Importing workflow from file:', file.name);
    
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        if (e.target && e.target.result) {
          const importedWorkflow = JSON.parse(e.target.result as string);
        
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
        
      } else {
        console.error('File read result is null or undefined.');
        alert('Failed to read the file content.');
      }
    } catch (error: any) {
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

  const handleWorkflowDuplicate = useCallback((workflow: Workflow) => {
    const targetWorkflow = workflow || currentWorkflow;
    
    if (!targetWorkflow) {
      console.warn('No workflow to duplicate');
      return;
    }
    
    console.log('Duplicating workflow:', targetWorkflow.name);
    
    const duplicatedWorkflow = {
      ...(targetWorkflow as Workflow),
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

  const { handleRunAll, handleStepForward, handleResetExecution }: any = useWorkflowExecution({
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

  // キーボードショートカットの設定
  useKeyboardShortcuts([
    {
      keys: [...COMMON_SHORTCUTS.UNDO],
      handler: () => {
        if (canUndo()) {
          undo();
          toast.info('元に戻しました');
        }
      },
      description: 'Undo last action'
    },
    {
      keys: [...COMMON_SHORTCUTS.REDO],
      handler: () => {
        if (canRedo()) {
          redo();
          toast.info('やり直しました');
        }
      },
      description: 'Redo last action'
    },
    {
      keys: [...COMMON_SHORTCUTS.SAVE],
      handler: () => {
        handleWorkflowSave();
        toast.success('ワークフローを保存しました');
      },
      description: 'Save workflow'
    },
    {
      keys: [...COMMON_SHORTCUTS.DELETE],
      handler: () => {
        const hasSelection = nodes.some((n: any) => n.selected) || edges.some((e: any) => e.selected);
        if (hasSelection) {
          deleteSelectedElements();
          toast.info('選択した要素を削除しました');
        }
      },
      description: 'Delete selected elements'
    },
    {
      keys: [...COMMON_SHORTCUTS.RUN],
      handler: () => {
        if (!executionState.running) {
          handleRunAll();
        }
      },
      description: 'Run workflow'
    },
    {
      keys: [...COMMON_SHORTCUTS.STOP],
      handler: () => {
        if (executionState.running) {
          handleResetExecution();
        }
      },
      description: 'Stop workflow execution'
    },
    {
      keys: [...COMMON_SHORTCUTS.SELECT_ALL],
      handler: () => {
        // Select all nodes
        setNodes((nds: any[]) => nds.map((node: any) => ({ ...node, selected: true })));
        toast.info('すべてのノードを選択しました');
      },
      description: 'Select all nodes'
    },
    {
      keys: [...COMMON_SHORTCUTS.ESCAPE],
      handler: () => {
        // Deselect all
        setNodes((nds: any[]) => nds.map((node: any) => ({ ...node, selected: false })));
        setEdges((eds: any[]) => eds.map((edge: any) => ({ ...edge, selected: false })));
        // Close any open modals or menus
        setContextMenu(null);
        setEditingNode(null);
      },
      description: 'Deselect all / Close dialogs'
    }
  ]);

  // SchedulerService統合 - ワークフロー実行コールバックを設定
  useEffect(() => {
    const setupSchedulerIntegration = () => {
      // ワークフロー実行コールバック
      const workflowExecutionCallback = async (workflowId: string, scheduleConfig: any) => {
        try {
          console.log(`🕐 スケジュール実行開始: ${scheduleConfig.name} (${workflowId})`);
          await handleRunAll();
          console.log(`✅ スケジュール実行完了: ${scheduleConfig.name}`);
        } catch (error: any) {
          console.error(`❌ スケジュール実行エラー: ${scheduleConfig.name}`, error);
          throw error;
        }
      };

      // ワークフロー停止コールバック
      const workflowStopCallback = (workflowId: string, reason: string) => {
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

  // スケジュールノードをメモ化してフィルタリング処理を最適化
  const scheduleNodes = useMemo(() =>
    nodes.filter(node => node.type === 'schedule'),
    [nodes]
  );

  // ScheduleNodeがワークフロー内にある場合、スケジュール設定を自動更新
  useEffect(() => {
    if (!currentWorkflow || !nodes.length) return;
    
    scheduleNodes.forEach(scheduleNode => {
      const { cronExpression, scheduleName, enabled, timeoutMinutes }: any = scheduleNode.data;
      
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
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      // 画面座標とReactFlow座標の両方を保存
      const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setContextMenu({ 
        type: 'pane',
        screenX: event.clientX, 
        screenY: event.clientY,
        flowX: flowPosition.x,
        flowY: flowPosition.y
      });
    },
    [screenToFlowPosition, setContextMenu]
  );

  const onSelectionContextMenu = useCallback((event: React.MouseEvent | MouseEvent, elements: any[]) => {
    event.preventDefault();
    setContextMenu({
      type: 'selection',
      screenX: event.clientX,
      screenY: event.clientY,
      elements,
    });
  }, [setContextMenu]);

  // ドラッグオーバー時の処理
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // ドロップ時の処理（Phase 3: nodesへの依存を削除）
  const onDrop = useCallback(
    (event: React.DragEvent) => {
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
          label: nodeDefinition.name || nodeType,
          ...nodeDefinition.defaultData
        },
      };

      console.log('✨ Creating new node:', newNode);

      // 現在のノード数を確認（refから取得）
      const currentNodes = nodesRef.current;
      console.log('📊 現在のノード数:', currentNodes.length);

      // ノードをストアに追加（addNode関数を使用）
      console.log('🔧 Calling addNode with:', newNode);
      addNode(newNode);
    },
    [screenToFlowPosition, addNode] // nodesへの依存を削除
  );

  // ノードクリック時の選択処理
  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
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

  // デバッグログを削除（不要な出力を減らす）
  
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
        onStepForward={handleStepForward}
        onStop={handleResetExecution}
        isExecuting={executionState?.running}
        onOpenCopilot={onOpenCopilot}
      />
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
        onNodeContextMenu={(event: React.MouseEvent, node: WorkflowNode) => onSelectionContextMenu(event, [node])}
        onEdgeContextMenu={(event: React.MouseEvent, edge: WorkflowEdge) => onSelectionContextMenu(event, [edge])}
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowHandleLabels(e.target.checked)}
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
