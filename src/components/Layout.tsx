
import React, { useState, useEffect, useCallback } from 'react'

import { Menu, Settings, MessageSquare, Workflow, Database, X, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { useStore, selectSidebarOpen, useUIActions } from '../store'

import EnhancedNodePalette from './EnhancedNodePalette'

interface NodeData {
  label?: string;
  inputType?: string;
  value?: string;
  fileContent?: string;
  fileName?: string;
  systemPrompt?: string;
  temperature?: number;
  provider?: string;
  model?: string;
  conditionType?: string;
  condition?: string;
  variable?: string;
  operator?: string;
  format?: string;
  result?: string;
  variableName?: string;
  useInput?: boolean;
  maxIterations?: number;
}

interface Node {
  id: string;
  type: string;
  data: NodeData;
  // Add other properties of a node if known, e.g., position, etc.
}

interface NodePropertiesPanelProps {
  editingNode: Node | null;
  onEditingNodeChange: (node: Node) => void;
}

const NodePropertiesPanel = ({ editingNode, onEditingNodeChange }: NodePropertiesPanelProps) => {
  // React Hooksは条件の前に配置する必要があります
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 動的なテキストエリア高さを計算（ウィンドウ高さの30%を基準）
  const calculateTextAreaHeight = useCallback((minRows = 3) => {
    const baseHeight = Math.floor(windowHeight * 0.3);
    const minHeight = minRows * 20; // 1行あたり約20px
    return Math.max(baseHeight, minHeight);
  }, [windowHeight]);

  // 条件付きレンダーは全てのHooksの後に配置
  if (!editingNode) return null;

  const handleDataChange = (partialData: Partial<NodeData>) => {
    if (!editingNode) return;
    const newEditingNodeData = { ...editingNode.data, ...partialData };
    onEditingNodeChange({ ...editingNode, data: newEditingNodeData });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; // Use optional chaining for files
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        if (event.target && event.target.result) { // Null check for event.target and its result
          handleDataChange({
            fileContent: event.target.result as string,
            fileName: file.name,
            value: `ファイル: ${file.name}` // Display file name in the text area as a visual cue
          });
        }
      };
      reader.readAsText(file);
    } else {
      alert('Please select a TXT file.');
    }
  };

  return (
    <div className="p-3">
      <h3 className="font-semibold mb-3 text-sm text-gray-700">Node Properties</h3>
      <div className="space-y-2">
        <div><label className="block text-xs font-medium mb-1 text-gray-600">Node Name</label><input type="text" value={editingNode.data.label} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDataChange({ label: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" /></div>
        {editingNode.type === 'input' && (
          <>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">Input Type</label>
              <select
                value={editingNode.data.inputType || 'text'}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDataChange({ inputType: e.target.value, value: '', fileContent: undefined, fileName: undefined })}
                className="w-full px-2 py-1.5 text-sm border rounded-md"
              >
                <option value="text">Text</option>
                <option value="file">File (txt)</option>
              </select>
            </div>
            {(editingNode.data.inputType === 'file') ? (
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600">Input File</label>
                <input type="file" accept=".txt" onChange={handleFileChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                {editingNode.data.fileName && <p className="text-xs text-gray-500 mt-1">Loaded: {editingNode.data.fileName}</p>}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600">Input Value</label>
                <textarea
                  value={editingNode.data.value || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleDataChange({ value: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border rounded-md resize-none"
                  style={{ height: `${calculateTextAreaHeight(3)}px` }}
                  placeholder="Set input value for execution"
                />
              </div>
            )}
          </>
        )}
        {editingNode.type === 'llm' && (
          <>
            <div><label className="block text-xs font-medium mb-1 text-gray-600">System Prompt</label><textarea value={editingNode.data.systemPrompt || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleDataChange({ systemPrompt: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md resize-none" style={{ height: `${calculateTextAreaHeight(5)}px` }} placeholder="Enter instructions for LLM role and response..." /></div>
            <div><label className="block text-xs font-medium mb-1 text-gray-600">Temperature</label><input type="number" value={editingNode.data.temperature || 0.7} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDataChange({ temperature: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 text-sm border rounded-md" min="0" max="2" step="0.1" /></div>
            
            {/* プロバイダー選択 */}
            <div><label className="block text-xs font-medium mb-1 text-gray-600">Provider</label><select value={editingNode.data.provider || 'openai'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDataChange({ provider: e.target.value, model: e.target.value === 'openai' ? 'gpt-5-nano' : e.target.value === 'anthropic' ? 'claude-3-5-sonnet-20241022' : e.target.value === 'local' ? 'llama2' : 'custom-model' })} className="w-full px-2 py-1.5 text-sm border rounded-md"><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="local">Local LLM</option><option value="custom">Custom API</option></select></div>
            
            {/* モデル選択 */}
            <div><label className="block text-xs font-medium mb-1 text-gray-600">Model</label>
            {(editingNode.data.provider === 'local' || editingNode.data.provider === 'custom') ? (
              <input type="text" value={editingNode.data.model || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDataChange({ model: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" placeholder="Enter model name" />
            ) : (
              <select value={editingNode.data.model || (editingNode.data.provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-5-nano')} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDataChange({ model: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md">
                {editingNode.data.provider === 'anthropic' ? (
                  <>
                    <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022</option>
                    <option value="claude-3-haiku-20240307">claude-3-haiku-20240307</option>
                    <option value="claude-3-opus-20240229">claude-3-opus-20240229</option>
                  </>
                ) : (
                  <>
                    <option value="gpt-5">gpt-5</option>
                    <option value="gpt-5-mini">gpt-5-mini</option>
                    <option value="gpt-5-nano">gpt-5-nano</option>
                  </>
                )}
              </select>
            )}
            </div>
          </>
        )}
        {editingNode.type === 'if' && ( <><div><label className="block text-xs font-medium mb-1 text-gray-600">Condition Type</label><select value={editingNode.data.conditionType || 'llm'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDataChange({ conditionType: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md"><option value="llm">LLM Judgment</option><option value="variable">Variable Comparison</option></select></div>{editingNode.data.conditionType === 'llm' ? (<><div><label className="block text-xs font-medium mb-1 text-gray-600">Judgment Condition</label><textarea value={editingNode.data.condition || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleDataChange({ condition: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" rows={3} placeholder="Enter condition for LLM to judge" /></div><div><label className="block text-xs font-medium mb-1 text-gray-600">Temperature</label><input type="number" value={editingNode.data.temperature || 0.7} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDataChange({ temperature: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 text-sm border rounded-md" min="0" max="2" step="0.1" /></div>            {/* プロバイダー選択 */}
            <div><label className="block text-xs font-medium mb-1 text-gray-600">Provider</label><select value={editingNode.data.provider || 'openai'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDataChange({ provider: e.target.value, model: e.target.value === 'openai' ? 'gpt-5-nano' : e.target.value === 'anthropic' ? 'claude-3-5-sonnet-20241022' : e.target.value === 'local' ? 'llama2' : 'custom-model' })} className="w-full px-2 py-1.5 text-sm border rounded-md"><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="local">Local LLM</option><option value="custom">Custom API</option></select></div>
            
            {/* モデル選択 */}
            <div><label className="block text-xs font-medium mb-1 text-gray-600">Model</label>
            {(editingNode.data.provider === 'local' || editingNode.data.provider === 'custom') ? (
              <input type="text" value={editingNode.data.model || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDataChange({ model: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" placeholder="Enter model name" />
            ) : (
              <select value={editingNode.data.model || (editingNode.data.provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-5-nano')} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDataChange({ model: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md">
                {editingNode.data.provider === 'anthropic' ? (
                  <>
                    <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022</option>
                    <option value="claude-3-haiku-20240307">claude-3-haiku-20240307</option>
                    <option value="claude-3-opus-20240229">claude-3-opus-20240229</option>
                  </>
                ) : (
                  <>
                    <option value="gpt-5">gpt-5</option>
                    <option value="gpt-5-mini">gpt-5-mini</option>
                    <option value="gpt-5-nano">gpt-5-nano</option>
                  </>
                )}
              </select>
            )}
            </div></>) : (<><div><label className="block text-xs font-medium mb-1 text-gray-600">Variable Name</label><input type="text" value={editingNode.data.variable || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDataChange({ variable: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" placeholder="Variable name to compare" /></div><div><label className="block text-xs font-medium mb-1 text-gray-600">Operator</label><select value={editingNode.data.operator || '=='} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDataChange({ operator: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md"><option value="==">== (Equal)</option><option value="!=">!= (Not Equal)</option><option value="<">&lt; (Less Than)</option><option value="<=">&lt;= (Less Than or Equal)</option><option value=">">&gt; (Greater Than)</option><option value=">=">&gt;= (Greater Than or Equal)</option></select></div><div><label className="block text-xs font-medium mb-1 text-gray-600">Comparison Value</label><input type="text" value={editingNode.data.value || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDataChange({ value: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" placeholder="Value to compare" /></div></>)}</> )}
        {editingNode.type === 'while' && ( <><div><label className="block text-xs font-medium mb-1 text-gray-600">Condition Type</label><select value={editingNode.data.conditionType || 'variable'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDataChange({ conditionType: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md"><option value="variable">Variable Comparison</option><option value="llm">LLM Judgment</option></select></div>{editingNode.data.conditionType === 'variable' ? (<><div><label className="block text-xs font-medium mb-1 text-gray-600">Variable Name</label><input type="text" value={editingNode.data.variable || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDataChange({ variable: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" placeholder="Variable name to compare" /></div><div><label className="block text-xs font-medium mb-1 text-gray-600">Operator</label><select value={editingNode.data.operator || '<'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDataChange({ operator: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md"><option value="==">== (Equal)</option><option value="!=">!= (Not Equal)</option><option value="<">&lt; (Less Than)</option><option value="<=">&lt;= (Less Than or Equal)</option><option value=">">&gt; (Greater Than)</option><option value=">=">&gt;= (Greater Than or Equal)</option></select></div><div><label className="block text-xs font-medium mb-1 text-gray-600">Comparison Value</label><input type="text" value={editingNode.data.value || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDataChange({ value: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" placeholder="Value to compare" /></div></>) : (<div><label className="block text-xs font-medium mb-1 text-gray-600">Continue Condition</label><textarea value={editingNode.data.condition || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleDataChange({ condition: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" rows={3} placeholder="Enter condition to continue iteration" /></div>)}<div><label className="block text-xs font-medium mb-1 text-gray-600">Max Iterations</label><input type="number" value={editingNode.data.maxIterations || 100} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDataChange({ maxIterations: parseInt(e.target.value) })} className="w-full px-2 py-1.5 text-sm border rounded-md" min="1" max="1000" /></div></> )}
        {editingNode.type === 'output' && ( <><div><label className="block text-xs font-medium mb-1 text-gray-600">Output Format</label><select value={editingNode.data.format || 'text'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDataChange({ format: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md"><option value="text">Text</option><option value="json">JSON</option><option value="markdown">Markdown</option></select></div><div><label className="block text-xs font-medium mb-1 text-gray-600">Execution Result</label><textarea value={String(editingNode.data.result || '')} readOnly className="w-full px-3 py-2 border rounded-md bg-gray-100 resize-none" style={{ height: `${calculateTextAreaHeight(5)}px` }} /></div></> )}
        {editingNode.type === 'variable_set' && (
          <>
            <div><label className="block text-xs font-medium mb-1 text-gray-600">Variable Name</label><input type="text" value={editingNode.data.variableName || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDataChange({ variableName: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" placeholder="Variable name to set" /></div>
            <div><label className="block text-xs font-medium mb-1 text-gray-600">Value Setting Method</label><select value={editingNode.data.useInput ? 'input' : 'manual'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDataChange({ useInput: e.target.value === 'input' })} className="w-full px-2 py-1.5 text-sm border rounded-md"><option value="manual">Direct Input</option><option value="input">Input from Connection</option></select></div>
            {!editingNode.data.useInput && (
              <div><label className="block text-xs font-medium mb-1 text-gray-600">Set Value</label><textarea value={editingNode.data.value || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleDataChange({ value: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" rows={3} placeholder="Value to set to variable" /></div>
            )}
          </>
        )}
      </div>
    </div>
  )
}


interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  editingNode: any;
  onEditingNodeChange: (node: any) => void;
  onOpenCopilot?: () => void;
}

const Layout = ({ children, currentView, onViewChange, editingNode, onEditingNodeChange, onOpenCopilot }: LayoutProps) => {
  const sidebarOpen = useStore(selectSidebarOpen)
  const { setSidebarOpen }: any = useUIActions()

  const menuItems = [
    { id: 'workflow', label: 'Workflow', icon: Workflow },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="h-screen flex bg-gray-100" style={{ padding: '5px' }}>
      <div className="flex flex-1 bg-gray-50 rounded-lg overflow-hidden shadow-sm">
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-white shadow-lg flex flex-col rounded-l-lg overflow-hidden`}>
        {sidebarOpen && (
          <>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-800">🌊 flomoji</h1>
                </div>
                <Button variant={'ghost'} size={'sm'} onClick={() => setSidebarOpen(false)} className="md:hidden"><X className="h-4 w-4" /></Button>
              </div>
            </div>
            
            <nav className="flex-shrink-0 p-3">
              <ul className="space-y-1">
                {menuItems.map((item: any) => (
                  <li key={item.id}>
                    <Button variant={currentView === item.id ? 'default' : 'ghost'} size={'sm'} onClick={() => onViewChange(item.id)} className="w-full justify-start h-8">
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Button>
                  </li>
                ))}
              </ul>
            </nav>

            {currentView === 'workflow' && (
              <div className="flex-1 flex flex-col overflow-hidden border-t">
                {editingNode ? (
                  <div className="flex-1 overflow-y-auto">
                    <NodePropertiesPanel editingNode={editingNode} onEditingNodeChange={onEditingNodeChange} />
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden">
                    <EnhancedNodePalette />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b p-4">
          <div className="flex items-center">
            <Button variant={'ghost'} size={'sm'} onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-4"><Menu className="h-4 w-4" /></Button>
            <h2 className="text-lg font-semibold text-gray-800">{menuItems.find(item => item.id === currentView)?.label || 'ダッシュボード'}</h2>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      </div>
    </div>
  )
}

export default Layout
