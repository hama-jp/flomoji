import React, { useState, useRef } from 'react';
import {
  Save, FolderOpen, FilePlus, Download, Upload, Edit3, Check, X,
  MoreHorizontal, Trash2, Copy, Play, Square, SkipForward, Bug,
  Pause, RotateCcw, ChevronRight, Gauge, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

import { Workflow } from '@/types';
import { useDebuggerStore } from '../store/debuggerStore';
import { cn } from '../lib/utils';

interface WorkflowToolbarProps {
  currentWorkflow: Workflow | null;
  workflows: Workflow[];
  onSave: () => void;
  onLoad: (workflowId: string) => void;
  onCreate: (name: string) => void;
  onRename: (newName: string) => void;
  onDelete: (workflowId: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onDuplicate: (workflow: Workflow) => void;
  hasUnsavedChanges: boolean;
  onRunAll: () => void;
  onStop: () => void;
  onStepForward: () => void;
  isExecuting: boolean;
  onOpenCopilot?: () => void;
}

const WorkflowToolbar = ({
  currentWorkflow,
  workflows = [],
  onSave,
  onLoad,
  onCreate,
  onRename,
  onDelete,
  onExport,
  onImport,
  onDuplicate,
  hasUnsavedChanges = false,
  onRunAll,
  onStop,
  onStepForward,
  isExecuting = false,
  onOpenCopilot
}: WorkflowToolbarProps) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const {
    debugMode, setDebugMode, executionStatus, setExecutionStatus,
    executionSpeed, setExecutionSpeed, clearExecutionHistory,
    stepForward: debugStepForward, abortExecution
  } = useDebuggerStore();

  const speedPresets = {
    slow: 1000,
    normal: 500,
    fast: 100,
    instant: 0
  };

  const getCurrentSpeedPreset = () => {
    if (executionSpeed >= 1000) return 'slow';
    if (executionSpeed >= 500) return 'normal';
    if (executionSpeed >= 100) return 'fast';
    return 'instant';
  };

  const handleStartRename = () => {
    setNewName(currentWorkflow?.name || '');
    setIsRenaming(true);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const handleConfirmRename = () => {
    if (newName.trim() && newName !== currentWorkflow?.name) {
      onRename?.(newName.trim());
      toast.success('Workflow renamed successfully');
    }
    setIsRenaming(false);
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
    setNewName('');
  };

  const handleCreateNew = () => {
    if (newName.trim()) {
      onCreate?.(newName.trim());
      setNewName('');
      setShowCreateDialog(false);
      toast.success('New workflow created');
    }
  };

  const handleLoad = (workflowId: string) => {
    onLoad?.(workflowId);
    setShowLoadDialog(false);
    toast.success('Workflow loaded');
  };

  const handleSave = () => {
    onSave?.();
    toast.success('Workflow saved');
  };

  const handleExport = () => {
    onExport?.();
    toast.success('Workflow exported');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport?.(file);
      event.target.value = '';
    }
  };

  const handleDuplicate = () => {
    if (currentWorkflow) {
      onDuplicate?.(currentWorkflow);
      toast.success('Workflow duplicated');
    }
  };

  const handleDelete = (workflowId: string | undefined) => {
    if (workflowId) {
      onDelete?.(workflowId);
      toast.success('Workflow deleted');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200/60 px-4 py-2 flex items-center justify-between shadow-sm">
      {/* Left side: Workflow Management */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {isRenaming ? (
            <div className="flex items-center gap-1">
              <Input
                ref={renameInputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmRename();
                  if (e.key === 'Escape') handleCancelRename();
                }}
                onBlur={handleConfirmRename}
                className="h-8 w-48 text-sm"
              />
              <Button size="sm" variant="ghost" onClick={handleConfirmRename} className="h-8 w-8 p-0">
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelRename} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {currentWorkflow?.name || 'Untitled Workflow'}
              </span>
              {hasUnsavedChanges && (
                <Badge className="text-xs px-1.5 py-0.5" variant="default">
                  unsaved
                </Badge>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleStartRename}
                className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-300" />

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleSave} disabled={!hasUnsavedChanges}>
            <Save className="h-4 w-4 mr-1.5" />
            Save
          </Button>

          <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <FolderOpen className="h-4 w-4 mr-1.5" />
                Load
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Load Workflow</DialogTitle>
                <DialogDescription>
                  Choose a workflow to load. Your current unsaved changes will be lost.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {workflows.length > 0 ? (
                  workflows.map((workflow: any) => (
                    <div
                      key={workflow.id}
                      className={`flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer ${
                        workflow.id === currentWorkflow?.id ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                      }`}
                      onClick={() => handleLoad(workflow.id)}
                    >
                      <div>
                        <h4 className="font-medium text-sm">{workflow.name}</h4>
                        <p className="text-xs text-gray-500">
                          {workflow.flow?.nodes?.length || 0} nodes • Modified {formatDate(workflow.lastModified)}
                        </p>
                      </div>
                      {workflow.id === currentWorkflow?.id && (
                        <Badge className="text-xs" variant="default">Current</Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No workflows found</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <FilePlus className="h-4 w-4 mr-1.5" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workflow</DialogTitle>
                <DialogDescription>
                  Enter a name for your new workflow. Your current workflow will be saved automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  type="text"
                  placeholder="Enter workflow name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateNew} disabled={!newName.trim()}>
                  Create Workflow
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Workflow
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export to File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImportClick}>
                <Upload className="h-4 w-4 mr-2" />
                Import from File
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDelete(currentWorkflow?.id)}
                className="text-red-600"
                disabled={workflows.length <= 1}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Workflow
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Right side: Execution Controls */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenCopilot}
          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 hover:text-white"
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          Copilot
        </Button>
        <Button
          size="sm"
          variant={debugMode !== 'off' ? 'default' : 'outline'}
          onClick={() => setDebugMode(debugMode === 'off' ? 'step' : 'off')}
          className={cn(
            "transition-all",
            debugMode !== 'off' && "bg-orange-600 hover:bg-orange-700"
          )}
          title={debugMode === 'off' ? "Enable Debug Mode" : "Disable Debug Mode"}
        >
          <Bug className="h-4 w-4" />
        </Button>

        {debugMode !== 'off' ? (
          <>
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 rounded-lg border border-orange-200">
              {executionStatus !== 'running' ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setExecutionStatus('running');
                    onRunAll?.();
                  }}
                  disabled={!currentWorkflow}
                  className="h-7 text-green-600 hover:bg-green-100"
                  title="Play"
                >
                  <Play className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExecutionStatus('paused')}
                  className="h-7 text-orange-600 hover:bg-orange-100"
                  title="Pause"
                >
                  <Pause className="h-4 w-4" />
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (executionStatus === 'paused') {
                    debugStepForward();
                    onStepForward?.();
                  }
                }}
                disabled={executionStatus !== 'paused'}
                className="h-7 text-blue-600 hover:bg-blue-100 disabled:text-gray-300"
                title="Step Forward"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  abortExecution();
                  clearExecutionHistory();
                  setExecutionStatus('idle');
                  onStop?.();
                }}
                className="h-7 text-red-600 hover:bg-red-100"
                title="Reset"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              <div className="w-px h-5 bg-gray-300 mx-1" />

              <div className="flex items-center gap-1">
                <Gauge className="h-4 w-4 text-gray-500" />
                <select
                  value={getCurrentSpeedPreset()}
                  onChange={(e) => {
                    const preset = e.target.value as keyof typeof speedPresets;
                    setExecutionSpeed(speedPresets[preset]);
                  }}
                  className="text-xs px-1 py-0.5 border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="slow">Slow</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Fast</option>
                  <option value="instant">Instant</option>
                </select>
              </div>
            </div>

            {executionStatus !== 'idle' && (
              <Badge
                className={cn(
                  "text-xs",
                  executionStatus === 'running' && "bg-green-100 text-green-700",
                  executionStatus === 'paused' && "bg-orange-100 text-orange-700",
                  executionStatus === 'completed' && "bg-blue-100 text-blue-700"
                )}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full mr-1",
                  executionStatus === 'running' && "bg-green-500 animate-pulse",
                  executionStatus === 'paused' && "bg-orange-500",
                  executionStatus === 'completed' && "bg-blue-500"
                )} />
                {executionStatus}
              </Badge>
            )}
          </>
        ) : (
          <>
            <Button
              size="sm"
              onClick={onRunAll}
              disabled={isExecuting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="h-4 w-4 mr-1.5" />
              Run
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onStop}
              disabled={!isExecuting}
            >
              <Square className="h-4 w-4 mr-1.5" />
              Stop
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onStepForward}
              disabled={isExecuting}
            >
              <SkipForward className="h-4 w-4 mr-1.5" />
              Step
            </Button>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        className="hidden"
      />
    </div>
  );
};

export default WorkflowToolbar;
