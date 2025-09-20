import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Send,
  Bot,
  User,
  Sparkles,
  Check,
  X as XIcon,
  Eye,
  AlertCircle,
  Settings,
  Trash2,
  Download,
  Upload,
  Loader2,
} from 'lucide-react';
import useReactFlowStore from '../store/reactFlowStore';
import { Edge } from '@xyflow/react';
import CopilotOrchestratorService, {
  CopilotRequest,
  CopilotResponse,
  CopilotSuggestion,
} from '../services/copilot/CopilotOrchestratorService';
import StorageService from '../services/storageService';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  suggestions?: CopilotSuggestion[];
  timestamp: Date;
  isError?: boolean;
}

interface WorkflowCopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkflowCopilotPanel: React.FC<WorkflowCopilotPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-5');
  const previewActive = useReactFlowStore(state => state.previewActive);
  const beginPreview = useReactFlowStore(state => state.beginPreview);
  const endPreview = useReactFlowStore(state => state.endPreview);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const copilotService = useRef<CopilotOrchestratorService | null>(null);

  const { nodes, edges, setNodes, setEdges, addNode, updateNodeData } = useReactFlowStore();

  useEffect(() => {
    if (!copilotService.current) {
      copilotService.current = new CopilotOrchestratorService();
    }

    // Load model preference from settings
    const settings = StorageService.getSettings();
    if (settings.model && ['gpt-5', 'gpt-5-mini', 'gpt-5-nano'].includes(settings.model)) {
      setSelectedModel(settings.model);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isOpen && previewActive) {
      endPreview(false);
    }
  }, [isOpen, previewActive, endPreview]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (previewActive) {
      endPreview(false);
    }

    // Check if API key is set in settings
    const settings = StorageService.getSettings();
    if (!settings.apiKey) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        type: 'assistant',
        content: '⚠️ Please configure your API key in the Settings view first.',
        timestamp: new Date(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const request: CopilotRequest = {
        message: input,
        context: {
          nodes,
          edges,
        },
      };

      const response: CopilotResponse = await copilotService.current!.processRequest(request);

      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        type: 'assistant',
        content: response.explanation || 'I\'ve analyzed your request and prepared some suggestions.',
        suggestions: response.suggestions,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.preview) {
        beginPreview({
          nodes: response.preview.nodes,
          edges: response.preview.edges,
        });
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        type: 'assistant',
        content: (error as Error).message.includes('API key')
          ? '⚠️ Please configure your API key in the Settings view.'
          : `Error: ${(error as Error).message || 'Failed to process request'}`,
        timestamp: new Date(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySuggestion = async (suggestion: CopilotSuggestion) => {
    try {
      await copilotService.current!.applySuggestion(suggestion.id);

      // Apply the suggestion to the actual workflow
      switch (suggestion.type) {
        case 'add_node':
          addNode(suggestion.data.node);
          break;
        case 'update_node':
          updateNodeData(suggestion.data.nodeId, suggestion.data.updates);
          break;
        case 'remove_node':
          const filteredNodes = nodes.filter(n => n.id !== suggestion.data.nodeId);
          const filteredEdges = edges.filter(
            e => e.source !== suggestion.data.nodeId && e.target !== suggestion.data.nodeId
          );
          setNodes(filteredNodes);
          setEdges(filteredEdges);
          break;
        case 'connect_nodes':
          setEdges([...edges, suggestion.data.edge]);
          break;
        case 'disconnect_nodes':
          const remainingEdges = edges.filter((e: Edge) => e.id !== suggestion.data.edgeId);
          setEdges(remainingEdges);
          break;
      }
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
    }
  };

  const handleRejectSuggestion = async (suggestion: CopilotSuggestion) => {
    try {
      await copilotService.current!.rejectSuggestion(suggestion.id);
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
    }
  };

  const handleApplyPreview = () => {
    endPreview(true);
  };

  const handleCancelPreview = () => {
    endPreview(false);
  };

  const handleClearConversation = () => {
    setMessages([]);
    copilotService.current?.clearMemory();
  };

  const handleExportConversation = () => {
    const data = copilotService.current?.exportConversation();
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `copilot-conversation-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleSaveModel = () => {
    // Save model preference
    const currentSettings = StorageService.getSettings();
    StorageService.setSettings({
      ...currentSettings,
      model: selectedModel,
    });

    // Reinitialize copilot with new model
    if (copilotService.current) {
      copilotService.current = new CopilotOrchestratorService();
    }
    setShowSettings(false);

    // Show success message
    const successMessage: Message = {
      id: `msg-${Date.now()}`,
      type: 'assistant',
      content: `✅ Model changed to ${selectedModel}. You can now use the Workflow Copilot.`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, successMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Workflow Copilot</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportConversation}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleClearConversation}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (previewActive) endPreview(false);
              onClose();
            }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              API Key is configured in Settings view.
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border rounded dark:bg-gray-900 dark:border-gray-700"
              >
                <option value="gpt-5">GPT-5</option>
                <option value="gpt-5-mini">GPT-5 Mini</option>
                <option value="gpt-5-nano">GPT-5 Nano</option>
              </select>
            </div>
            <button
              onClick={handleSaveModel}
              className="w-full px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Preview Mode Banner */}
      {previewActive && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Preview Mode
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleApplyPreview}
                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
              >
                Apply
              </button>
              <button
                onClick={handleCancelPreview}
                className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium mb-2">Welcome to Workflow Copilot</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              I can help you create, improve, and debug workflows. Try asking:
            </p>
            <div className="mt-4 space-y-2 text-left max-w-xs mx-auto">
              <button
                onClick={() => setInput('Create a workflow to fetch data from an API and save to a file')}
                className="w-full p-2 text-xs bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-left"
              >
                📊 "Create a data processing workflow"
              </button>
              <button
                onClick={() => setInput('Add error handling to my workflow')}
                className="w-full p-2 text-xs bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-left"
              >
                🛡️ "Add error handling"
              </button>
              <button
                onClick={() => setInput('Optimize this workflow for performance')}
                className="w-full p-2 text-xs bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-left"
              >
                ⚡ "Optimize for performance"
              </button>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.isError
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                  : 'bg-gray-100 dark:bg-gray-800'
              } rounded-lg p-3`}
            >
              <div className="flex items-start space-x-2">
                {message.type === 'user' ? (
                  <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : message.isError ? (
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.suggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className="bg-white dark:bg-gray-700 rounded p-2 border dark:border-gray-600"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-xs font-medium">{suggestion.description}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Type: {suggestion.type} • Confidence: {Math.round(suggestion.confidence * 100)}%
                              </p>
                            </div>
                            <div className="flex space-x-1 ml-2">
                              <button
                                onClick={() => handleApplySuggestion(suggestion)}
                                className="p-1 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
                                title="Apply"
                              >
                                <Check className="w-3 h-3 text-green-600" />
                              </button>
                              <button
                                onClick={() => handleRejectSuggestion(suggestion)}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                                title="Reject"
                              >
                                <XIcon className="w-3 h-3 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t dark:border-gray-700 p-4">
        <div className="flex space-x-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to create or improve your workflow..."
            className="flex-1 px-3 py-2 border rounded-lg resize-none dark:bg-gray-800 dark:border-gray-700"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowCopilotPanel;
