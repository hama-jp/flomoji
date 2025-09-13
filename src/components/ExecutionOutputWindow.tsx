import React, { useState } from 'react';

import { Minimize2, Maximize2, Terminal, CheckCircle, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ExecutionOutputWindowProps {
  isOpen: boolean;
  onClose: () => void;
  executionResult: any;
  debugLog: any[];
  executionState: any;
}

const ExecutionOutputWindow = ({ 
  isOpen, 
  onClose, 
  executionResult, 
  debugLog, 
  executionState 
}: ExecutionOutputWindowProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  // 右端に縦長で配置するための初期設定
  const [position, setPosition] = useState(() => {
    const rightMargin = 20; // 右端からの余白
    const topMargin = 80;   // 上部からの余白（ツールバーを避ける）
    return {
      x: window.innerWidth - 350 - rightMargin, // 350pxの幅 + 余白
      y: topMargin
    };
  });
  const [size, setSize] = useState({ width: 350, height: 700 }); // 縦長の初期サイズ
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
    if (isResizing) {
      const newWidth = Math.max(300, Math.min(500, resizeStart.width + (e.clientX - resizeStart.x))); // 300-500pxに制限
      const maxHeight = window.innerHeight - 100; // ビューポート高さより小さく
      const newHeight = Math.max(200, Math.min(maxHeight, resizeStart.height + (e.clientY - resizeStart.y)));
      setSize({
        width: newWidth,
        height: newHeight
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart]);

  // ウィンドウサイズ変更時に位置を調整
  React.useEffect(() => {
    const handleResize = () => {
      const rightMargin = 20;
      const newX = window.innerWidth - size.width - rightMargin;
      setPosition(prevPos => ({
        ...prevPos,
        x: Math.max(20, newX) // 左端にいかないように制限
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size.width]);

  const formatTimestamp = (timestamp: string | number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <Terminal className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Terminal className="h-4 w-4 text-blue-500" />;
      default:
        return <Terminal className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'bg-green-50 border-l-4 border-green-200';
      case 'error':
        return 'bg-red-50 border-l-4 border-red-200';
      case 'warn':
        return 'bg-yellow-50 border-l-4 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-l-4 border-blue-200';
      default:
        return 'bg-gray-50 border-l-4 border-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-2xl border"
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? '300px' : `${size.width}px`,
        height: isMinimized ? '40px' : `${size.height}px`,
        minWidth: '300px',
        maxWidth: '500px',   // 最大幅を制限して縦長を保つ
        minHeight: isMinimized ? '40px' : '200px',
        maxHeight: 'calc(100vh - 100px)' // ビューポートの高さを越えないように制限
      }}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between p-3 bg-gray-50 rounded-t-lg cursor-move border-b select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4 text-gray-600" />
          <span className="font-medium text-sm">Execution Output</span>
          {executionState?.running && (
            <Badge variant="secondary" className="text-xs">Running</Badge>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0"
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <XCircle className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* コンテンツ */}
      {!isMinimized && (
        <div className="h-full pb-12 overflow-hidden">
          <Tabs defaultValue="result" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 m-2 select-none">
              <TabsTrigger value="result" className="">Result</TabsTrigger>
              <TabsTrigger value="logs" className="">Debug Log ({debugLog?.length || 0})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="result" className="flex-1 p-3 overflow-auto">
              {executionResult ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    {executionResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">
                      {executionResult.success ? 'Execution Completed' : 'Execution Failed'}
                    </span>
                  </div>
                  
                  {executionResult.success ? (
                    <div className="space-y-2">
                      {executionResult.outputs && Object.keys(executionResult.outputs).length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Outputs:</h4>
                          <div className="space-y-1">
                            {Object.entries(executionResult.outputs).map(([key, value]: any) => (
                              <div key={key} className="bg-gray-50 p-2 rounded text-sm select-text">
                                <strong className="select-text">{key}:</strong> <span className="select-text">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {executionResult.variables && Object.keys(executionResult.variables).length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Variables:</h4>
                          <div className="space-y-1">
                            {Object.entries(executionResult.variables).map(([key, value]: any) => (
                              <div key={key} className="bg-blue-50 p-2 rounded text-sm select-text">
                                <strong className="select-text">{key}:</strong> <span className="select-text">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-50 p-3 rounded">
                      <p className="text-red-700 text-sm select-text">{executionResult.error}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No execution result yet</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="logs" className="flex-1 p-3 overflow-auto">
              {debugLog && debugLog.length > 0 ? (
                <div className="space-y-2">
                  {debugLog.map((log, index: any) => (
                    <div key={index} className={`flex items-start space-x-3 text-xs p-3 rounded ${getLogLevelColor(log.level)}`}>
                      {getLogLevelIcon(log.level)}
                      <div className="flex-1 min-w-0 select-text">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-gray-600 font-mono select-text">{formatTimestamp(log.timestamp)}</span>
                          <Badge variant={log.level === 'success' ? 'default' : log.level === 'error' ? 'destructive' : 'secondary'} className={`text-xs select-text`}>
                            {log.level.toUpperCase()}
                          </Badge>
                          {log.nodeId && (
                            <Badge variant="secondary" className="text-xs select-text">{log.nodeId}</Badge>
                          )}
                        </div>
                        <p className="mt-1 break-words font-medium select-text">{log.message}</p>
                        {log.data && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-gray-600 hover:text-gray-800 select-text">
                              Details {log.data.duration ? `(${Math.round(log.data.duration)}ms)` : ''}
                            </summary>
                            <pre className="mt-1 text-xs bg-white/70 p-2 rounded border overflow-x-auto select-text font-mono">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No debug logs yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
      
      {/* リサイズハンドル */}
      {!isMinimized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize select-none"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute bottom-1 right-1 w-3 h-3">
            <div className="absolute bottom-0 right-0 w-1 h-3 bg-gray-400 rounded-full"></div>
            <div className="absolute bottom-0 right-1 w-3 h-1 bg-gray-400 rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionOutputWindow;