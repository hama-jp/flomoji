import React, { useState, useRef } from 'react';

import { 
  Save, 
  FolderOpen, 
  FilePlus, 
  Download, 
  Upload, 
  Edit3, 
  Check, 
  X, 
  MoreHorizontal,
  Trash2,
  Copy,
  Play,
  Square,
  SkipForward
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

import { Workflow } from '@/types';

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
  // Execution controls
  onRunAll,
  onStop,
  onStepForward,
  isExecuting = false
}: WorkflowToolbarProps) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 800, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

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
      event.target.value = ''; // Reset input
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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    setIsDragging(true);
    if (!dragRef.current) return;
    const rect = dragRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 400, e.clientX - offsetX)),
        y: Math.max(0, Math.min(window.innerHeight - 80, e.clientY - offsetY))
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      ref={dragRef}
      className={`fixed z-50 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/60 p-3 flex items-center gap-3 min-w-fit max-w-4xl select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      {/* Drag Handle & Workflow Name & Status */}
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div className="flex flex-col gap-1 opacity-40 hover:opacity-60 cursor-grab">
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
        </div>
        
        <div className="flex items-center gap-2">
        {isRenaming ? (
          <div className="flex items-center gap-1">
            <Input
              ref={renameInputRef}
              value={newName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') handleConfirmRename();
                if (e.key === 'Escape') handleCancelRename();
              }}
              onBlur={handleConfirmRename}
              className="h-7 w-48 text-sm"
            />
            <Button size={'sm' as const} variant={'ghost' as const} onClick={handleConfirmRename} className="h-7 w-7 p-0">
              <Check className="h-3 w-3" />
            </Button>
            <Button size={'sm' as const} variant={'ghost' as const} onClick={handleCancelRename} className="h-7 w-7 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900">
              {currentWorkflow?.name || 'Untitled Workflow'}
            </span>
            {hasUnsavedChanges && (
              <Badge className="text-xs px-1.5 py-0.5" variant={"default" as const}>
                unsaved
              </Badge>
            )}
            <Button
              size={'sm' as const}
              variant={'ghost' as const}
              onClick={handleStartRename}
              className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
            >
              <Edit3 className="h-3 w-3" />
            </Button>
          </div>
        )}
        </div>
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Main Actions */}
      <div className="flex items-center gap-1 cursor-auto">
        <Button size={'sm' as const} variant={'outline' as const} onClick={handleSave} disabled={!hasUnsavedChanges}>
          <Save className="h-4 w-4 mr-1.5" />
          Save
        </Button>

        {/* Load Workflow Dialog */}
        <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
          <DialogTrigger asChild>
            <Button size={'sm' as const} variant={'outline' as const}>
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
                      <Badge className="text-xs" variant={"default" as const}>Current</Badge>
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

        {/* Create New Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size={'sm' as const} variant={'outline' as const}>
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleCreateNew()}
              />
            </div>
            <DialogFooter>
              <Button variant={'outline' as const} size={"default" as const} onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateNew} disabled={!newName.trim()}>
                Create Workflow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* File Operations Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size={'sm' as const} variant={'outline' as const}>
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

      <div className="w-px h-6 bg-gray-300" />

      {/* Execution Controls */}
      <div className="flex items-center gap-1 cursor-auto">
        <Button
          size={'sm' as const} 
          onClick={onRunAll}
          disabled={isExecuting}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Play className="h-4 w-4 mr-1.5" />
          Run
        </Button>
        
        <Button
          size={'sm' as const} 
          variant={'outline' as const}
          onClick={onStop}
          disabled={!isExecuting}
        >
          <Square className="h-4 w-4 mr-1.5" />
          Stop
        </Button>
        
        <Button
          size={'sm' as const} 
          variant={'outline' as const}
          onClick={onStepForward}
          disabled={isExecuting}
        >
          <SkipForward className="h-4 w-4 mr-1.5" />
          Step
        </Button>
        
      </div>


      {/* Hidden file input */}
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