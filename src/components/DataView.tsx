import { useState, useEffect, useCallback } from 'react'
import { Download, Upload, Trash2, FileText, MessageSquare, Workflow, History, Settings, ArrowUpDown, ArrowUp, ArrowDown, Clock, CheckCircle, XCircle, Loader, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import workflowManagerService from '../services/workflowManagerService'
import logService from '../services/logService'
import StorageService from '../services/storageService'
import { Workflow as WorkflowType, ChatHistoryItem, Session, ParsedWorkflowRun, ParsedNodeLog } from '../types'

const DataView = () => {
  const [_chatHistory, setChatHistory] = useState<Session[]>([])
  const [workflowData, setWorkflowData] = useState<WorkflowType[]>([])
  const [sortBy, setSortBy] = useState('timestamp') // 'timestamp' or 'name'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' or 'desc'
  const [expandedWorkflows, setExpandedWorkflows] = useState(new Set<string>()) // 展開されているワークフローID
  const [executionHistories, setExecutionHistories] = useState<Record<string, ParsedWorkflowRun[]>>({}) // workflowId -> 実行履歴配列
  const [expandedRuns, setExpandedRuns] = useState(new Set<string>()) // 展開されている実行ID
  const [runDetails, setRunDetails] = useState<Record<string, ParsedNodeLog[]>>({}) // runId -> ノードログ配列

  const loadData = useCallback(() => {
    // チャット履歴を読み込み
    try {
      const history = StorageService.getChatHistory([])
      const sessions = groupChatMessages(history)
      setChatHistory(sessions)
    } catch (error) {
      console.error('Failed to load chat history:', error)
      setChatHistory([])
    }

    // ワークフローデータを読み込み
    const workflows = Object.values(workflowManagerService.getWorkflows());
    setWorkflowData(workflows);
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const groupChatMessages = (messages: ChatHistoryItem[]): Session[] => {
    const sessions: Session[] = [];
    let currentSession: Session | null = null;

    messages.forEach((message, index) => {
      if (message.role === 'user') {
        if (currentSession) sessions.push(currentSession)
        currentSession = {
          id: `session_${index}`,
          title: message.message.substring(0, 30) + (message.message.length > 30 ? '...' : ''),
          messageCount: 1,
          createdAt: message.timestamp || new Date().toLocaleTimeString(),
          lastActivity: message.timestamp || new Date().toLocaleTimeString(),
          messages: [message]
        }
      } else if (currentSession) {
        currentSession.messageCount++
        currentSession.lastActivity = message.timestamp || new Date().toLocaleTimeString()
        currentSession.messages.push(message)
      }
    })
    
    if (currentSession) sessions.push(currentSession)
    return sessions.reverse()
  }

  const handleExportData = (type: 'chat' | 'workflows' | 'all') => {
    let data: object = {}
    let filename: string = ''

    switch (type) {
      case 'chat':
        data = { chatHistory: StorageService.getChatHistory([]) }
        filename = 'chat_history.json'
        break
      case 'workflows':
        data = { workflows: workflowManagerService.getWorkflows() }
        filename = 'workflow_data.json'
        break
      case 'all':
        data = {
          chatHistory: StorageService.getChatHistory([]),
          workflows: workflowManagerService.getWorkflows(),
          settings: StorageService.getSettings({}),
        }
        filename = 'llm_agent_backup.json'
        break
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const result = e.target?.result
        if (typeof result !== 'string') {
          throw new Error('File content is not a string')
        }
        const data = JSON.parse(result)
        
        if (data.chatHistory) {
          StorageService.setChatHistory(data.chatHistory)
        }
        if (data.workflows) {
          const workflows = data.workflows as Record<string, WorkflowType>;
          Object.values(workflows).forEach((wf: WorkflowType) => workflowManagerService.saveWorkflow(wf));
        }
        if (data.settings) {
          StorageService.setSettings(data.settings)
        }
        
        loadData()
        alert('Data import completed successfully')
      } catch (error: any) {
        alert('Failed to read file: ' + error.message)
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const handleDeleteWorkflow = (id: string) => {
    if (confirm('Delete this workflow?')) {
      workflowManagerService.deleteWorkflow(id);
      loadData();
    }
  }

  const handleClearExecutionLogs = async () => {
    if (confirm('Delete all execution history? This action cannot be undone.')) {
      try {
        await logService.clearAllLogs()
        alert('Execution history has been deleted')
      } catch (error: any) {
        console.error('実行履歴の削除に失敗しました:', error)
        alert('Failed to delete execution history')
      }
    }
  }

  const handleClearAllData = () => {
    if (confirm('Delete all data? This action cannot be undone.')) {
      StorageService.clear() // 全てのStorageServiceキーをクリア
      // 実行履歴も削除
      logService.clearAllLogs().catch(console.error)
      loadData()
      alert('All data has been deleted')
    }
  }

  const calculateStorageSize = () => {
    const usageInfo = StorageService.getUsageInfo()
    const totalSize = Object.values(usageInfo).reduce((total, info) => total + info.size, 0)
    return (totalSize / 1024).toFixed(1) + ' KB'
  }

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'Unknown'
    try {
      return new Date(dateString).toLocaleString('ja-JP')
    } catch (e) {
      console.error("Error formatting date:", e);
      return String(dateString);
    }
  }

  // ワークフローデータをソート
  const sortedWorkflowData = [...workflowData].sort((a, b) => {
    let comparison = 0
    
    if (sortBy === 'timestamp') {
      const dateA = new Date((a.lastModified ?? a.createdAt) || 0)
      const dateB = new Date((b.lastModified ?? b.createdAt) || 0)
      comparison = dateA.getTime() - dateB.getTime()
    } else if (sortBy === 'name') {
      comparison = (a.name || '').localeCompare(b.name || '', 'ja-JP')
    }
    
    return sortOrder === 'desc' ? -comparison : comparison
  })

  // ソート切り替え関数
  const handleSort = (newSortBy: 'timestamp' | 'name') => {
    if (sortBy === newSortBy) {
      // 同じソート基準の場合は順序を切り替え
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // 異なるソート基準の場合は新しい基準に変更し、デフォルトは降順
      setSortBy(newSortBy)
      setSortOrder(newSortBy === 'timestamp' ? 'desc' : 'asc')
    }
  }

  // ワークフローの実行履歴を取得
  const loadExecutionHistory = async (workflowId: string) => {
    try {
      const runs = await logService.getRunsForWorkflow(workflowId)
      setExecutionHistories(prev => ({
        ...prev,
        [workflowId]: runs
      }))
    } catch (error: any) {
      console.error('Failed to load execution history:', error)
      setExecutionHistories(prev => ({
        ...prev,
        [workflowId]: []
      }))
    }
  }

  // ワークフローの展開/折りたたみを切り替え
  const toggleWorkflowExpansion = async (workflowId: string) => {
    const newExpanded = new Set(expandedWorkflows)
    
    if (expandedWorkflows.has(workflowId)) {
      newExpanded.delete(workflowId)
    } else {
      newExpanded.add(workflowId)
      // 初回展開時に実行履歴をロード
      if (!executionHistories[workflowId]) {
        await loadExecutionHistory(workflowId)
      }
    }
    
    setExpandedWorkflows(newExpanded)
  }

  // 実行ステータスのアイコンを取得
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'running':
        return <Loader className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  // 実行時間を計算
  const calculateDuration = (startedAt: string | Date, endedAt: string | Date | undefined) => {
    if (!endedAt) return 'Running...'
    const start = new Date(startedAt).getTime()
    const end = new Date(endedAt).getTime()
    const duration = Math.round((end - start) / 1000)
    return duration < 60 ? `${duration}s` : `${Math.floor(duration / 60)}m ${duration % 60}s`
  }

  // 実行詳細データを取得
  const loadRunDetails = async (runId: string) => {
    try {
      const logs = await logService.getLogsForRun(runId)
      setRunDetails(prev => ({
        ...prev,
        [runId]: logs
      }))
    } catch (error: any) {
      console.error('Failed to load run details:', error)
      setRunDetails(prev => ({
        ...prev,
        [runId]: []
      }))
    }
  }

  // 実行詳細の展開/折りたたみを切り替え
  const toggleRunExpansion = async (runId: string) => {
    const newExpanded = new Set(expandedRuns)
    
    if (expandedRuns.has(runId)) {
      newExpanded.delete(runId)
    } else {
      newExpanded.add(runId)
      // 初回展開時に実行詳細をロード
      if (!runDetails[runId]) {
        await loadRunDetails(runId)
      }
    }
    
    setExpandedRuns(newExpanded)
  }

  // データを見やすい形式でフォーマット
  const formatData = (data: any) => {
    if (!data) return 'N/A'
    if (typeof data === 'string') {
      // 長いテキストは省略
      return data.length > 100 ? data.substring(0, 100) + '...' : data
    }
    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2)
    }
    return String(data)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Management</h2>
          <p className="text-gray-600 mt-1">Manage and export chat history and workflow data</p>
        </div>
        <div className="flex space-x-2">
          <input type="file" accept=".json" onChange={handleImportData} className="hidden" id="import-file" />
          <Button variant="outline" onClick={() => document.getElementById('import-file')?.click()}>
            <Upload className="h-4 w-4 mr-2" />Import
          </Button>
          <Button onClick={() => handleExportData('all')}>
            <Download className="h-4 w-4 mr-2" />Export All Data
          </Button>
        </div>
      </div>

      <Tabs defaultValue="workflows" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="chat">Chat History</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4 mt-6">
          <Card className="p-6">
            <CardContent className="text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Chat history feature coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold">Workflows ({workflowData.length} items)</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <Button
                  variant={sortBy === 'name' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="h-8"
                >
                  Name
                  {sortBy === 'name' && (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
                  )}
                </Button>
                <Button
                  variant={sortBy === 'timestamp' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSort('timestamp')}
                  className="h-8"
                >
                  Date
                  {sortBy === 'timestamp' && (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
                  )}
                </Button>
              </div>
            </div>
            <Button variant="outline" onClick={() => handleExportData('workflows')} disabled={workflowData.length === 0}>
              <Download className="h-4 w-4 mr-2" />Export Workflows
            </Button>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {sortedWorkflowData.map((workflow) => {
                  const isExpanded = expandedWorkflows.has(workflow.id)
                  const runs = executionHistories[workflow.id] || []
                  
                  return (
                    <div key={workflow.id}>
                      <div className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleWorkflowExpansion(workflow.id)}
                            className="p-1 h-6 w-6"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <Workflow className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium">{workflow.name}</p>
                            <p className="text-sm text-gray-500">
                              {workflow.flow.nodes?.length || 0} nodes, {workflow.flow.edges?.length || 0} edges
                              {runs.length > 0 && (
                                <span className="ml-2 text-blue-600">• {runs.length} run{runs.length > 1 ? 's' : ''}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-500">Last modified: {formatDate(workflow.lastModified)}</span>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteWorkflow(workflow.id)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="px-5 pb-4 bg-gray-50">
                          <div className="ml-8">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Execution History</h4>
                            {runs.length > 0 ? (
                              <div className="space-y-2">
                                {runs.slice(0, 5).map((run) => {
                                  const isRunExpanded = expandedRuns.has(run.id)
                                  const logs = runDetails[run.id] || []
                                  
                                  return (
                                    <div key={run.id}>
                                      <div className="flex items-center justify-between bg-white p-3 rounded-md border text-sm">
                                        <div className="flex items-center space-x-3">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleRunExpansion(run.id)}
                                            className="p-1 h-5 w-5"
                                          >
                                            {isRunExpanded ? (
                                              <ChevronDown className="h-3 w-3" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3" />
                                            )}
                                          </Button>
                                          {getStatusIcon(run.status)}
                                          <div>
                                            <p className="font-medium">
                                              Run {run.id.slice(0, 8)}...
                                              <Badge 
                                                variant={run.status === 'completed' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}
                                                className="ml-2 text-xs"
                                              >
                                                {run.status}
                                              </Badge>
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              Started: {formatDate(run.startedAt)}
                                              {run.endedAt && (
                                                <span className="ml-2">• Duration: {calculateDuration(run.startedAt, run.endedAt)}</span>
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {isRunExpanded && (
                                        <div className="ml-6 mt-2 bg-gray-50 rounded-md p-4 border-l-4 border-blue-200">
                                          <h5 className="text-xs font-semibold text-gray-700 mb-3">Node Execution Logs</h5>
                                          {logs.length > 0 ? (
                                            <div className="space-y-3">
                                              {logs.map((log: ParsedNodeLog, index) => (
                                                <div key={log.id} className="bg-white p-3 rounded border text-xs">
                                                  <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center space-x-2">
                                                      {getStatusIcon(log.status)}
                                                      <span className="font-medium">Node: {log.nodeId}</span>
                                                      <Badge variant="outline" className="text-xs">
                                                        #{index + 1}
                                                      </Badge>
                                                    </div>
                                                    <span className="text-gray-500">
                                                      {formatDate(log.timestamp!)}
                                                    </span>
                                                  </div>
                                                  
                                                  {log.inputs && Object.keys(log.inputs).length > 0 && (
                                                    <div className="mb-2">
                                                      <p className="font-medium text-gray-700">Inputs:</p>
                                                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                                                        {formatData(log.inputs)}
                                                      </pre>
                                                    </div>
                                                  )}
                                                  
                                                  {log.outputs && Object.keys(log.outputs).length > 0 && (
                                                    <div className="mb-2">
                                                      <p className="font-medium text-gray-700">Outputs:</p>
                                                      <pre className="bg-green-50 p-2 rounded text-xs overflow-x-auto">
                                                        {formatData(log.outputs)}
                                                      </pre>
                                                    </div>
                                                  )}
                                                  
                                                  {log.error && (
                                                    <div className="mb-2">
                                                      <p className="font-medium text-red-700">Error:</p>
                                                      <pre className="bg-red-50 p-2 rounded text-xs overflow-x-auto text-red-800">
                                                        {log.error}
                                                      </pre>
                                                    </div>
                                                  )}
                                                  
                                                  {log.processingTime && (
                                                    <p className="text-gray-500 text-xs">
                                                      Processing time: {log.processingTime}ms
                                                    </p>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-center py-4">
                                              <FileText className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                                              <p className="text-xs text-gray-500">No detailed logs available</p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                                {runs.length > 5 && (
                                  <p className="text-xs text-gray-500 text-center py-2">
                                    and {runs.length - 5} more runs...
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <History className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm text-gray-500">No execution history found</p>
                                <p className="text-xs text-gray-400">Run this workflow to see execution logs</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {workflowData.length === 0 && (
                <div className="text-center py-12">
                  <Workflow className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No workflows available</p>
                  <p className="text-sm text-gray-400 mt-1">Create a workflow to see it here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Data Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center p-5 bg-gray-50 rounded-lg border">
                <div>
                  <h4 className="font-medium text-gray-900">Local Storage Usage</h4>
                  <p className="text-sm text-gray-600 mt-1">Used for storing settings and data</p>
                </div>
                <Badge variant="secondary" className="text-base px-3 py-1">{calculateStorageSize()}</Badge>
              </div>
              
              <div className="flex justify-between items-center p-5 bg-amber-50 rounded-lg border border-amber-200">
                <div>
                  <h4 className="font-medium text-amber-800">Clear Execution History</h4>
                  <p className="text-sm text-amber-700 mt-1">Delete all workflow execution history and logs</p>
                </div>
                <Button variant="outline" onClick={handleClearExecutionLogs} className="text-amber-800 border-amber-300 hover:bg-amber-100">
                  <History className="h-4 w-4 mr-2" />Clear History
                </Button>
              </div>
              
              <div className="flex justify-between items-center p-5 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <h4 className="font-medium text-red-800">Delete All Data</h4>
                  <p className="text-sm text-red-700 mt-1">Permanently delete all settings, chat history, and workflow data</p>
                </div>
                <Button variant="destructive" onClick={handleClearAllData}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete All
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DataView
