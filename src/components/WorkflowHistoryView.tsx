import React, { useState, useEffect, useCallback } from 'react'

import { format } from 'date-fns'
import { Clock, CheckCircle, XCircle, StopCircle, ChevronDown, ChevronRight } from 'lucide-react'

import logService from '../services/logService'
import { ParsedWorkflowRun, ParsedNodeLog } from '../types'

const statusIcons = {
  running: Clock,
  completed: CheckCircle,
  failed: XCircle,
  stopped: StopCircle
}

const statusColors = {
  running: 'text-blue-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
  stopped: 'text-yellow-500'
}

interface WorkflowHistoryViewProps {
  workflowId?: string;
}

export default function WorkflowHistoryView({ workflowId = 'default' }: WorkflowHistoryViewProps) {
  const [runs, setRuns] = useState<ParsedWorkflowRun[]>([])
  const [selectedRun, setSelectedRun] = useState<ParsedWorkflowRun | null>(null)
  const [selectedRunLogs, setSelectedRunLogs] = useState<ParsedNodeLog[]>([])
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadWorkflowRuns = useCallback(async () => {
    try {
      setLoading(true)
      const workflowRuns = await logService.getRunsForWorkflow(workflowId)
      setRuns(workflowRuns)
    } catch (error: any) {
      console.error('Failed to fetch execution history:', error)
    } finally {
      setLoading(false)
    }
  }, [workflowId])

  useEffect(() => {
    loadWorkflowRuns()
  }, [loadWorkflowRuns])

  const handleRunClick = async (run: ParsedWorkflowRun) => {
    if (selectedRun?.id === run.id) {
      setSelectedRun(null)
      setSelectedRunLogs([])
      setExpandedRun(null)
      return
    }

    try {
      const logs = await logService.getLogsForRun(run.id)
      setSelectedRun(run)
      setSelectedRunLogs(logs)
      setExpandedRun(run.id)
    } catch (error: any) {
      console.error('Failed to fetch execution logs:', error)
    }
  }

  const formatDuration = (startedAt: string, endedAt?: string) => {
    if (!endedAt) return 'Running...'
    const start = new Date(startedAt)
    const end = new Date(endedAt)
    const duration = Math.round((end.getTime() - start.getTime()) / 1000)
    return `${duration}s`
  }

  const formatInputData = (inputData: Record<string, any>) => {
    if (!inputData || Object.keys(inputData).length === 0) {
      return 'No input data'
    }
    return Object.entries(inputData)
      .map(([key, value]: [string, any]) => `${key}: ${String(value).substring(0, 50)}${String(value).length > 50 ? '...' : ''}`)
      .join(', ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading execution history...</div>
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">No execution history</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Execution History</h3>
        <button
          onClick={loadWorkflowRuns}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {runs.map((run: ParsedWorkflowRun) => {
          const StatusIcon = statusIcons[run.status] || Clock
          const isExpanded = expandedRun === run.id

          return (
            <div key={run.id} className="border rounded-lg">
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                onClick={() => handleRunClick(run)}
              >
                <div className="flex items-center space-x-3">
                  <StatusIcon className={`w-5 h-5 ${statusColors[run.status]}`} />
                  <div>
                    <div className="font-medium">
                      {format(new Date(run.startedAt), 'yyyy/MM/dd HH:mm:ss')}
                    </div>
                    <div className="text-sm text-gray-500">
                      Duration: {formatDuration(run.startedAt, run.endedAt)} | 
                      Input: {formatInputData(run.inputData)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded ${statusColors[run.status]} bg-gray-100`}>
                    {run.status}
                  </span>
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>

              {isExpanded && selectedRunLogs.length > 0 && (
                <div className="border-t bg-gray-50 p-4">
                  <h4 className="font-medium mb-3">Node Execution Logs</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedRunLogs.map((log: ParsedNodeLog) => {
                      const LogStatusIcon = statusIcons[log.status as keyof typeof statusIcons] || Clock
                      return (
                        <div key={log.id} className="bg-white p-3 rounded border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <LogStatusIcon className={`w-4 h-4 ${statusColors[log.status as keyof typeof statusColors]}`} />
                              <span className="font-medium">Node: {log.nodeId}</span>
                              <span className={`px-2 py-1 text-xs rounded ${statusColors[log.status as keyof typeof statusColors]} bg-gray-100`}>
                                {log.status}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {format(new Date(log.timestamp), 'HH:mm:ss')}
                            </span>
                          </div>

                          {Object.keys(log.inputs).length > 0 && (
                            <div className="mb-2">
                              <div className="text-sm font-medium text-gray-700">Input:</div>
                              <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded mt-1">
                                {JSON.stringify(log.inputs, null, 2)}
                              </div>
                            </div>
                          )}

                          {Object.keys(log.outputs).length > 0 && (
                            <div className="mb-2">
                              <div className="text-sm font-medium text-gray-700">Output:</div>
                              <div className="text-sm text-gray-600 bg-gray-100 p-2 rounded mt-1">
                                {typeof log.outputs === 'string' 
                                  ? log.outputs 
                                  : JSON.stringify(log.outputs, null, 2)
                                }
                              </div>
                            </div>
                          )}

                          {log.error && (
                            <div className="mb-2">
                              <div className="text-sm font-medium text-red-700">Error:</div>
                              <div className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1">
                                {log.error}
                              </div>
                            </div>
                          )}

                          {log.processingTime && (
                            <div className="text-xs text-gray-500">
                              Processing time: {log.processingTime}ms
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {isExpanded && selectedRunLogs.length === 0 && (
                <div className="border-t bg-gray-50 p-4">
                  <div className="text-gray-500 text-center">No node logs available for this execution</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}