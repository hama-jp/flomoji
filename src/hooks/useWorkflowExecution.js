import { useCallback } from 'react'
import nodeExecutionService from '../services/nodeExecutionService.js'

const useWorkflowExecution = ({
  nodes,
  connections,
  nodeTypes,
  setNodes,
  setExecutor,
  setExecutionState,
  setExecutionResult,
  setDebugLog,
  onSelectedNodeChange,
  selectedNode,
  executor
}) => {

  const preprocessNodesForExecution = useCallback(() => {
    return nodes.map(node => {
      if (node.type === 'output' && node.data.result) {
        return { ...node, data: { ...node.data, result: '' } };
      }
      if (node.type === 'llm' && node.data.currentPrompt) {
        return { ...node, data: { ...node.data, currentPrompt: '' } };
      }
      return node;
    });
  }, [nodes]);


  const convertConnectionsFormat = useCallback(() => {
    // React FlowのエッジデータをnodeExecutionServiceが期待する形式に変換
    return connections.map(edge => ({
      from: {
        nodeId: edge.source,
        portIndex: parseInt(edge.sourceHandle) || 0
      },
      to: {
        nodeId: edge.target,
        portIndex: parseInt(edge.targetHandle) || 0,
        name: edge.targetHandle
      }
    }));
  }, [connections]);

  const handleRunAll = useCallback(async () => {
    if (nodes.length === 0) {
      setExecutionResult({ success: false, error: '実行するノードがありません' });
      return;
    }

    // 実行前に強制的に状態をリセット
    if (nodeExecutionService.isRunning()) {
      nodeExecutionService.stopExecution();
    }

    const preprocessedNodes = preprocessNodesForExecution();

    const inputNodes = preprocessedNodes.filter(n => n.type === 'input');
    const inputData = Object.fromEntries(inputNodes.map(n => [n.id, n.data.value || '']));
    const convertedConnections = convertConnectionsFormat();
    const exec = await nodeExecutionService.startExecution(preprocessedNodes, convertedConnections, inputData, nodeTypes);

    setExecutor(exec);
    const initialState = { running: true, currentNodeId: null, executedNodeIds: new Set() };
    setExecutionState(initialState);
    setDebugLog([]);
    nodeExecutionService.setDebugMode(true);

    try {
      let result;
      do {
        result = await exec.next();
        if (!result.done) {
          // まず実行中のノードを設定（実行前）
          setExecutionState(prev => {
            const newState = { 
              running: true, 
              currentNodeId: result.value.currentNodeId, 
              executedNodeIds: new Set(prev.executedNodeIds)
            };
            return newState;
          });
          
          // 各ノードの実行間に少し遅延を入れてアニメーションを見やすくする
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 実行完了後に実行済みセットに追加
          setExecutionState(prev => {
            const newExecutedIds = new Set(prev.executedNodeIds);
            newExecutedIds.add(result.value.currentNodeId);
            const newState = { 
              running: true, 
              currentNodeId: null, // 実行完了後はnullに
              executedNodeIds: newExecutedIds 
            };
            return newState;
          });
        }
      } while (!result.done);
      const finalState = result.value;
      if (finalState.status === 'completed') {
        const outputResults = {};
        const outputNodes = preprocessedNodes.filter(n => n.type === 'output');
        outputNodes.forEach(node => {
          if (nodeExecutionService.executionContext[node.id] !== undefined) {
            outputResults[node.data.label || `出力${node.id}`] = nodeExecutionService.executionContext[node.id];
          }
        });
        
        // 成功時のログを追加
        const executionLog = nodeExecutionService.getExecutionLog();
        const completionLog = {
          timestamp: new Date().toISOString(),
          level: 'success',
          message: 'ワークフロー実行が正常に完了しました',
          nodeId: null,
          data: {
            executedNodes: preprocessedNodes.length,
            outputNodes: outputNodes.length,
            outputs: outputResults,
            variables: finalState.variables,
            duration: new Date().getTime() - (executionLog[0]?.timestamp ? new Date(executionLog[0].timestamp).getTime() : new Date().getTime())
          }
        };
        
        // 完了ログをデバッグログに追加
        const updatedLog = [...executionLog, completionLog];
        setDebugLog(updatedLog);
        
        setExecutionResult({ 
          success: true, 
          variables: finalState.variables,
          outputs: outputResults
        });
        
        // Outputノードの結果を更新
        setNodes(prevNodes => {
          const validNodes = Array.isArray(prevNodes) ? prevNodes : [];
          return validNodes.map(node => {
            // Outputノードの結果を更新
            if (node.type === 'output' && nodeExecutionService.executionContext[node.id] !== undefined) {
              const updatedNode = { ...node, data: { ...node.data, result: String(nodeExecutionService.executionContext[node.id]) } };
              return updatedNode;
            }
            return node;
          });
        });
      } else {
        
        // エラー時のログを追加
        const executionLog = nodeExecutionService.getExecutionLog();
        const errorLog = {
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `ワークフロー実行が失敗しました: ${finalState.error?.message || 'Unknown error'}`,
          nodeId: finalState.nodeId || null,
          data: {
            error: finalState.error?.stack || finalState.error?.message,
            failedNodeId: finalState.nodeId
          }
        };
        
        // エラーログをデバッグログに追加
        const updatedLog = [...executionLog, errorLog];
        setDebugLog(updatedLog);
        
        setExecutionResult({ success: false, error: finalState.error?.message || 'Unknown error' });
      }
    } catch (error) {
      console.error("Workflow execution failed:", error);
      console.error("Error stack:", error.stack);
      
      // 例外エラー時のログを追加
      const executionLog = nodeExecutionService.getExecutionLog();
      const exceptionLog = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `ワークフロー実行中に例外が発生しました: ${error.message}`,
        nodeId: null,
        data: {
          error: error.stack || error.message,
          type: 'exception'
        }
      };
      
      // 例外ログをデバッグログに追加
      const updatedLog = [...executionLog, exceptionLog];
      setDebugLog(updatedLog);
      
      setExecutionResult({ success: false, error: error.message });
      
      // エラー時にも状態をクリーンアップ
      if (nodeExecutionService.isRunning()) {
        nodeExecutionService.stopExecution();
      }
    } finally {
      
      // 実行完了状態を2秒間表示してからリセット
      setTimeout(() => {
        setExecutionState({ running: false, currentNodeId: null, executedNodeIds: new Set() });
        setExecutor(null);
      }, 2000);
    }
  }, [nodes, connections, nodeTypes, preprocessNodesForExecution, setNodes, setExecutor, setExecutionState, setDebugLog, setExecutionResult, convertConnectionsFormat]);

  const handleStepForward = useCallback(async () => {
    let currentExecutor = executor;
    try {
      if (!currentExecutor) {
        const preprocessedNodes = preprocessNodesForExecution();
        // ノードの状態はそのまま保持し、結果のみクリア済み（preprocessNodesForExecutionで処理済み）

        const inputNodes = preprocessedNodes.filter(n => n.type === 'input');
        const inputData = Object.fromEntries(inputNodes.map(n => [n.id, n.data.value || '']));
        const convertedConnections = convertConnectionsFormat();
        currentExecutor = await nodeExecutionService.startExecution(preprocessedNodes, convertedConnections, inputData);
        setExecutor(currentExecutor);
        setExecutionState({ running: true, currentNodeId: null, executedNodeIds: new Set() });
        // ステップ実行開始をログに記録
        setDebugLog([{
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'ステップ実行を開始します。もう一度「ステップ」を押して最初のノードを実行してください。',
          nodeId: null,
          data: {}
        }]);
        return;
      }
      const result = await currentExecutor.next();
      if (result.done) {
        if (result.value.status === 'completed') {
          const outputResults = {};
          const outputNodes = nodes.filter(n => n.type === 'output');
          outputNodes.forEach(node => {
            if (nodeExecutionService.executionContext[node.id] !== undefined) {
              outputResults[node.data.label || `出力${node.id}`] = nodeExecutionService.executionContext[node.id];
            }
          });
          setExecutionResult({
            success: true,
            variables: result.value.variables,
            outputs: outputResults
          });
        } else if (result.value.status === 'error') {
          setExecutionResult({ success: false, error: result.value.error?.message });
        }
        // Process execution completion directly to avoid circular dependency
        const finalContext = nodeExecutionService.executionContext;
        const executionLog = nodeExecutionService.getExecutionLog();
        let newSelectedNode = null;

        setNodes(prevNodes => {
          const newNodes = prevNodes.map(node => {
            // Output ノードの結果を更新
            if (node.type === 'output' && finalContext[node.id] !== undefined) {
              const updatedNode = { ...node, data: { ...node.data, result: String(finalContext[node.id]) } };
              if (selectedNode && selectedNode.id === node.id) newSelectedNode = updatedNode;
              return updatedNode;
            }
            
            // LLM ノードのプロンプト情報を更新
            if (node.type === 'llm') {
              // 実行ログからLLMノードのプロンプト情報を取得
              const llmLogEntry = executionLog.find(log => 
                log.nodeId === node.id && 
                log.message.includes('LLMに送信するプロンプト') && 
                log.data && log.data.prompt
              );
              
              if (llmLogEntry) {
                const updatedNode = { 
                  ...node, 
                  data: { 
                    ...node.data, 
                    currentPrompt: llmLogEntry.data.prompt 
                  } 
                };
                if (selectedNode && selectedNode.id === node.id) newSelectedNode = updatedNode;
                return updatedNode;
              }
            }
            
            return node;
          });
          return newNodes;
        });

        if (newSelectedNode) onSelectedNodeChange(newSelectedNode);
        setDebugLog(executionLog);

        // Reset execution directly to avoid circular dependency
        if (executor) executor.stop();
        setExecutor(null);
        setExecutionState({ running: false, currentNodeId: null, executedNodeIds: new Set() });
      } else {
        setExecutionState(prev => {
          const newExecutedIds = new Set(prev.executedNodeIds);
          newExecutedIds.add(result.value.currentNodeId);
          return { 
            ...prev, 
            currentNodeId: result.value.currentNodeId, 
            executedNodeIds: newExecutedIds 
          };
        });
      }
    } catch (error) {
      console.error("Step forward failed:", error);
      setExecutionResult({ success: false, error: error.message });
      // Reset execution directly to avoid circular dependency
      if (executor) executor.stop();
      setExecutor(null);
      setExecutionState({ running: false, currentNodeId: null, executedNodeIds: new Set() });
      setExecutionResult({ success: false, error: error.message });
      setDebugLog([]);
    }
  }, [executor, nodes, connections, preprocessNodesForExecution, setNodes, setExecutor, setExecutionState, setExecutionResult, selectedNode, onSelectedNodeChange, setDebugLog, convertConnectionsFormat]);

  const handleResetExecution = useCallback(() => {
    if (executor) executor.stop();
    setExecutor(null);
    setExecutionState({ running: false, currentNodeId: null, executedNodeIds: new Set() });
    setExecutionResult(null);
    setDebugLog([]);
    
    // 出力ノードの結果もクリア
    setNodes(prev => prev.map(node => 
      node.type === 'output' 
        ? { ...node, data: { ...node.data, result: '' } }
        : node
    ));
  }, [executor, setExecutor, setExecutionState, setExecutionResult, setDebugLog, setNodes]);

  return {
    handleRunAll,
    handleStepForward,
    handleResetExecution
  };
};

export default useWorkflowExecution;