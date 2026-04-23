import { useState, useEffect, useCallback, useMemo } from 'react'
import { Download, Upload, Trash2, FileText, MessageSquare, Workflow, History, Settings, ArrowUp, ArrowDown, Clock, CheckCircle, XCircle, Loader, ChevronDown, ChevronRight, RefreshCw, StopCircle, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { errorService } from '@/services/errorService'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import workflowManagerService from '../services/workflowManagerService'
import logService from '../services/logService'
import StorageService from '../services/storageService'
import schedulerService, { SchedulerService } from '../services/schedulerService'
import { ActiveScheduleExecution, Workflow as WorkflowType, ChatHistoryItem, Session, ParsedWorkflowRun, ParsedNodeLog, ScheduleConfig } from '../types'

type DataTab = 'chat' | 'operations' | 'workflows' | 'settings'

type ScheduledWorkflowItem = {
  workflow: WorkflowType | null
  schedule: ScheduleConfig & { isActive: boolean }
  nextExecution: Date | null
  activeExecution: ActiveScheduleExecution | null
  latestRun: ParsedWorkflowRun | null
}

const DataView = () => {
  const [activeTab, setActiveTab] = useState<DataTab>('operations')
  const [chatSessions, setChatSessions] = useState<Session[]>([])
  const [workflowData, setWorkflowData] = useState<WorkflowType[]>([])
  const [scheduledWorkflows, setScheduledWorkflows] = useState<ScheduledWorkflowItem[]>([])
  const [operationsLoading, setOperationsLoading] = useState(false)
  const [sortBy, setSortBy] = useState('timestamp') // 'timestamp' or 'name'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' or 'desc'
  const [expandedWorkflows, setExpandedWorkflows] = useState(new Set<string>()) // 展開されているワークフローID
  const [executionHistories, setExecutionHistories] = useState<Record<string, ParsedWorkflowRun[]>>({}) // workflowId -> 実行履歴配列
  const [expandedRuns, setExpandedRuns] = useState(new Set<string>()) // 展開されている実行ID
  const [runDetails, setRunDetails] = useState<Record<string, ParsedNodeLog[]>>({}) // runId -> ノードログ配列

  const groupChatMessages = useCallback((messages: ChatHistoryItem[]): Session[] => {
    const sessions: Session[] = []
    let currentSession: Session | null = null

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
  }, [])

  const loadOperationsData = useCallback(async (workflowsSnapshot?: WorkflowType[]) => {
    setOperationsLoading(true)

    try {
      const workflows = workflowsSnapshot || Object.values(workflowManagerService.getWorkflows())
      const workflowMap = new Map(workflows.map((workflow) => [workflow.id, workflow]))
      const activeExecutions = new Map(
        schedulerService.getActiveExecutions().map((execution) => [execution.workflowId, execution])
      )

      const items = await Promise.all(
        schedulerService.getAllSchedules().map(async (schedule) => {
          const runs = await logService.getRunsForWorkflow(schedule.workflowId)

          return {
            workflow: workflowMap.get(schedule.workflowId) || null,
            schedule,
            nextExecution: schedule.enabled ? schedulerService.getNextExecution(schedule.workflowId) : null,
            activeExecution: activeExecutions.get(schedule.workflowId) ?? null,
            latestRun: runs[0] ?? null
          }
        })
      )

      items.sort((a, b) => {
        if (Boolean(a.activeExecution) !== Boolean(b.activeExecution)) {
          return a.activeExecution ? -1 : 1
        }

        if (a.schedule.enabled !== b.schedule.enabled) {
          return a.schedule.enabled ? -1 : 1
        }

        return (a.workflow?.name || a.schedule.name).localeCompare(
          b.workflow?.name || b.schedule.name,
          'ja-JP'
        )
      })

      setScheduledWorkflows(items)
    } catch (error) {
      console.error('Failed to load operations data:', error)
      setScheduledWorkflows([])
    } finally {
      setOperationsLoading(false)
    }
  }, [])

  const loadCoreData = useCallback((): WorkflowType[] => {
    // チャット履歴を読み込み
    try {
      const history = StorageService.getChatHistory([])
      const sessions = groupChatMessages(history)
      setChatSessions(sessions)
    } catch (error) {
      errorService.logError(error as Error, {
        context: 'load_chat_history'
      }, {
        category: 'system',
        userMessage: 'チャット履歴の読み込みに失敗しました'
      })
      setChatSessions([])
    }

    // ワークフローデータを読み込み
    const workflows = Object.values(workflowManagerService.getWorkflows())
    setWorkflowData(workflows)
    return workflows
  }, [groupChatMessages])

  useEffect(() => {
    const workflows = loadCoreData()
    void loadOperationsData(workflows)
  }, [loadCoreData, loadOperationsData])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadOperationsData()
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [loadOperationsData])

  const handleExportData = (type: 'chat' | 'workflows' | 'all') => {
    let data: object = {}
    let filename: string = ''

    switch (type) {
      case 'chat':
        data = { chatHistory: StorageService.getChatHistory([]) }
        filename = 'chat_history.json'
        break
      case 'workflows':
        data = {
          workflows: workflowManagerService.getWorkflows(),
          schedules: StorageService.getSchedulerWorkflows({})
        }
        filename = 'workflow_data.json'
        break
      case 'all':
        data = {
          chatHistory: StorageService.getChatHistory([]),
          workflows: workflowManagerService.getWorkflows(),
          settings: StorageService.getSettings({}),
          schedules: StorageService.getSchedulerWorkflows({}),
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
          const workflows = data.workflows as Record<string, WorkflowType>
          Object.values(workflows).forEach((wf: WorkflowType) => workflowManagerService.saveWorkflow(wf))
        }
        if (data.settings) {
          StorageService.setSettings(data.settings)
        }

        if (data.schedules) {
          schedulerService.clearSchedules()
          const schedules = data.schedules as Record<string, ScheduleConfig>
          Object.entries(schedules).forEach(([workflowId, schedule]) => {
            schedulerService.setSchedule(workflowId, schedule)
          })
        }

        const workflows = loadCoreData()
        void loadOperationsData(workflows)
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
      workflowManagerService.deleteWorkflow(id)
      setExpandedWorkflows(prev => {
        const updated = new Set(prev)
        updated.delete(id)
        return updated
      })
      setExecutionHistories(prev => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })
      const workflows = loadCoreData()
      void loadOperationsData(workflows)
    }
  }

  const handleClearExecutionLogs = async () => {
    if (confirm('Delete all execution history? This action cannot be undone.')) {
      try {
        await logService.clearAllLogs()
        setExecutionHistories({})
        setExpandedRuns(new Set())
        setRunDetails({})
        await loadOperationsData()
        alert('Execution history has been deleted')
      } catch (error: any) {
        errorService.logError(error as Error, {
          context: 'delete_execution_history'
        }, {
          category: 'system',
          userMessage: '実行履歴の削除に失敗しました'
        })
        alert('Failed to delete execution history')
      }
    }
  }

  const handleClearAllData = () => {
    if (confirm('Delete all data? This action cannot be undone.')) {
      schedulerService.clearSchedules()
      StorageService.clear() // 全てのStorageServiceキーをクリア
      // 実行履歴も削除
      logService.clearAllLogs().catch(err => {
        errorService.logError(err, {
          context: 'clear_logs'
        }, {
          category: 'system',
          userMessage: 'ログのクリアに失敗しました'
        })
      })
      setExecutionHistories({})
      setExpandedWorkflows(new Set())
      setExpandedRuns(new Set())
      setRunDetails({})
      const workflows = loadCoreData()
      void loadOperationsData(workflows)
      alert('All data has been deleted')
    }
  }

  // ストレージサイズの計算をメモ化
  const storageSize = useMemo(() => {
    const usageInfo = StorageService.getUsageInfo()
    const totalSize = Object.values(usageInfo).reduce((total, info) => total + info.size, 0)
    return (totalSize / 1024).toFixed(1) + ' KB'
  }, [workflowData, scheduledWorkflows]) // 保存データが変更されたときに再計算

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'Unknown'
    try {
      return new Date(dateString).toLocaleString('ja-JP')
    } catch (e) {
      console.error("Error formatting date:", e);
      return String(dateString);
    }
  }

  const formatRelativeTime = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'Not scheduled'

    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) {
      return 'Unknown'
    }

    const diffMs = date.getTime() - Date.now()
    const diffMinutes = Math.round(diffMs / (1000 * 60))
    const formatter = new Intl.RelativeTimeFormat('ja-JP', { numeric: 'auto' })

    if (Math.abs(diffMinutes) < 60) {
      return formatter.format(diffMinutes, 'minute')
    }

    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    if (Math.abs(diffHours) < 24) {
      return formatter.format(diffHours, 'hour')
    }

    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    return formatter.format(diffDays, 'day')
  }

  const formatRunningTime = (runningTimeMs: number) => {
    const durationSeconds = Math.max(0, Math.round(runningTimeMs / 1000))
    if (durationSeconds < 60) return `${durationSeconds}s`
    return `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`
  }

  // ワークフローデータをソート（メモ化で最適化）
  const sortedWorkflowData = useMemo(() => {
    const sorted = [...workflowData]
    sorted.sort((a, b) => {
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
    return sorted
  }, [workflowData, sortBy, sortOrder])

  const operationsSummary = useMemo(() => ({
    total: scheduledWorkflows.length,
    enabled: scheduledWorkflows.filter((item) => item.schedule.enabled).length,
    running: scheduledWorkflows.filter((item) => item.activeExecution).length,
    attention: scheduledWorkflows.filter((item) => item.schedule.lastError || item.latestRun?.status === 'failed').length
  }), [scheduledWorkflows])

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

  const handleToggleSchedule = (workflowId: string, enabled: boolean) => {
    if (!schedulerService.toggleSchedule(workflowId, enabled)) {
      alert('Failed to update schedule state')
      return
    }

    void loadOperationsData()
  }

  const handleStopScheduledExecution = (workflowId: string) => {
    if (!confirm('Stop the current scheduled run?')) return

    if (!schedulerService.forceStopExecution(workflowId)) {
      alert('No running execution was found')
      return
    }

    void loadOperationsData()
  }

  const handleRemoveSchedule = (workflowId: string) => {
    if (!confirm('Remove this schedule?')) return

    if (!schedulerService.removeSchedule(workflowId)) {
      alert('Failed to remove schedule')
      return
    }

    void loadOperationsData()
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

  const focusWorkflowHistory = async (workflowId: string) => {
    setActiveTab('workflows')
    setExpandedWorkflows(prev => {
      const updated = new Set(prev)
      updated.add(workflowId)
      return updated
    })

    if (!executionHistories[workflowId]) {
      await loadExecutionHistory(workflowId)
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
          <p className="text-gray-600 mt-1">Manage workflow data, schedules, and execution history</p>
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

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DataTab)} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="chat">Chat History</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold">Chat Sessions ({chatSessions.length} items)</h3>
            </div>
            <Button variant="outline" onClick={() => handleExportData('chat')} disabled={chatSessions.length === 0}>
              <Download className="h-4 w-4 mr-2" />Export Chat History
            </Button>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {chatSessions.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No chat history available</p>
                  <p className="text-sm text-gray-400 mt-1">Start a chat to see saved conversations here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {chatSessions.map((session) => (
                    <div key={session.id} className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-gray-900">{session.title}</p>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-1">
                            <span>{session.messageCount} messages</span>
                            <span>Created: {formatDate(session.createdAt)}</span>
                            <span>Last activity: {formatDate(session.lastActivity)}</span>
                          </div>
                        </div>
                        <Badge variant="secondary">{session.messages.length} entries</Badge>
                      </div>

                      <div className="space-y-2">
                        {session.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`rounded-lg border p-3 ${
                              message.role === 'user'
                                ? 'bg-blue-50 border-blue-100'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-1">
                              <Badge variant={message.role === 'user' ? 'default' : 'outline'}>
                                {message.role}
                              </Badge>
                              <span className="text-xs text-gray-500">{formatDate(message.timestamp)}</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap text-gray-800">{message.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6 mt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Research Operations ({scheduledWorkflows.length} schedules)</h3>
              <p className="text-sm text-gray-500 mt-1">
                Monitor recurring research runs, next execution windows, and the latest outcomes.
              </p>
            </div>
            <Button variant="outline" onClick={() => void loadOperationsData()} disabled={operationsLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${operationsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Scheduled Workflows</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{operationsSummary.total}</p>
                  </div>
                  <Workflow className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Enabled Schedules</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{operationsSummary.enabled}</p>
                  </div>
                  <Clock className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Running Now</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{operationsSummary.running}</p>
                  </div>
                  <Activity className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Needs Attention</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{operationsSummary.attention}</p>
                  </div>
                  <XCircle className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {scheduledWorkflows.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No scheduled workflows configured</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Add a Schedule node to a research workflow to monitor it here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {scheduledWorkflows.map((item) => {
                    const workflowLabel = item.workflow?.name || item.schedule.name
                    const latestRunStatus = item.latestRun?.status
                    const runBadgeVariant = latestRunStatus === 'completed'
                      ? 'default'
                      : latestRunStatus === 'failed'
                        ? 'destructive'
                        : 'secondary'

                    return (
                      <div key={item.schedule.workflowId} className="p-5 space-y-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Workflow className="h-5 w-5 text-gray-500" />
                              <p className="font-medium text-gray-900">{workflowLabel}</p>
                              {item.activeExecution ? (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                  Running
                                </Badge>
                              ) : item.schedule.enabled ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline">Paused</Badge>
                              )}
                              {!item.workflow && (
                                <Badge variant="destructive">Missing Workflow</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {item.workflow
                                ? `${item.workflow.flow.nodes?.length || 0} nodes, ${item.workflow.flow.edges?.length || 0} edges`
                                : 'This workflow no longer exists. Remove the orphaned schedule or re-import the workflow.'}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {item.workflow && (
                              <Button
                                variant={item.schedule.enabled ? 'outline' : 'default'}
                                size="sm"
                                onClick={() => handleToggleSchedule(item.schedule.workflowId, !item.schedule.enabled)}
                              >
                                {item.schedule.enabled ? 'Pause Schedule' : 'Resume Schedule'}
                              </Button>
                            )}
                            {item.activeExecution && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStopScheduledExecution(item.schedule.workflowId)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <StopCircle className="h-4 w-4 mr-2" />
                                Stop Run
                              </Button>
                            )}
                            {item.workflow ? (
                              <Button variant="ghost" size="sm" onClick={() => void focusWorkflowHistory(item.schedule.workflowId)}>
                                View History
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => handleRemoveSchedule(item.schedule.workflowId)}>
                                Remove Schedule
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-lg border p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Cadence</p>
                            <p className="mt-1 font-medium text-gray-900">
                              {SchedulerService.humanReadableCron(item.schedule.cronExpression)}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">{item.schedule.cronExpression}</p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Next Run</p>
                            <p className="mt-1 font-medium text-gray-900">
                              {item.schedule.enabled && item.nextExecution ? formatRelativeTime(item.nextExecution) : 'Paused'}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {item.nextExecution ? formatDate(item.nextExecution) : 'Waiting for resume'}
                            </p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Last Executed</p>
                            <p className="mt-1 font-medium text-gray-900">
                              {item.schedule.lastExecuted ? formatDate(item.schedule.lastExecuted) : 'Never'}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {item.schedule.executionCount || 0} total run{(item.schedule.executionCount || 0) === 1 ? '' : 's'}
                            </p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              {item.activeExecution ? 'Running For' : 'Timeout Window'}
                            </p>
                            <p className="mt-1 font-medium text-gray-900">
                              {item.activeExecution
                                ? formatRunningTime(item.activeExecution.runningTime)
                                : `${item.schedule.timeoutMinutes || 30} minutes`}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {item.activeExecution ? 'Updated every 30 seconds' : 'Maximum run duration'}
                            </p>
                          </div>
                        </div>

                        {item.latestRun && (
                          <div className="rounded-lg border bg-gray-50 p-3 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(item.latestRun.status)}
                                <span className="font-medium text-gray-900">Latest Run</span>
                                <Badge variant={runBadgeVariant} className="text-xs">
                                  {item.latestRun.status}
                                </Badge>
                              </div>
                              <span className="text-xs text-gray-500">{formatDate(item.latestRun.startedAt)}</span>
                            </div>
                            <p className="mt-2 text-xs text-gray-600">
                              {item.latestRun.endedAt
                                ? `Duration: ${calculateDuration(item.latestRun.startedAt, item.latestRun.endedAt)}`
                                : 'This run is still in progress.'}
                            </p>
                          </div>
                        )}

                        {item.schedule.lastError && (
                          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                            <p className="text-sm font-medium text-red-800">Last Scheduler Error</p>
                            <p className="mt-1 text-sm text-red-700">{item.schedule.lastError.message}</p>
                            <p className="mt-1 text-xs text-red-600">
                              {formatDate(item.schedule.lastError.timestamp)}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
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
                <Badge variant="secondary" className="text-base px-3 py-1">{storageSize}</Badge>
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
