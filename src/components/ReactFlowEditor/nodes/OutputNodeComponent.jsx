import React from 'react';
import CustomNode from './CustomNode';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import nodeExecutionService from '../../../services/nodeExecutionService';

const OutputNodeComponent = ({ id, data }) => {
  
  // 実行コンテキストから結果を取得
  const contextResult = nodeExecutionService.executionContext[id];
  const displayResult = contextResult || data.result || 'No result yet...';
  
  // ファイルダウンロード処理
  const handleDownload = () => {
    if (!displayResult || displayResult === 'No result yet...') {
      return;
    }
    
    // Blobを作成してダウンロード
    const blob = new Blob([displayResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // 現在の日時をファイル名に使用
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `output_${timestamp}.txt`;
    
    // ダウンロードリンクを作成
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // クリーンアップ
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // OutputNodeのハンドル設定を明示
  const nodeDataWithHandles = {
    ...data,
    inputs: [{ name: 'input', id: '0' }], // 入力あり
    outputs: [], // 出力なし
    colorClass: 'bg-gradient-to-r from-purple-400 to-purple-600 text-white'
  };

  return (
    <CustomNode data={nodeDataWithHandles} id={id}>
      <div className="space-y-2">
        <Textarea
          value={displayResult}
          readOnly
          className="nodrag bg-gray-50 text-gray-700 resize-both w-full"
          style={{ resize: 'both', overflow: 'auto', minWidth: '200px', minHeight: '100px', width: '100%' }}
          placeholder="Execution result will appear here..."
          rows={4}
        />
        <Button
          onClick={handleDownload}
          disabled={!displayResult || displayResult === 'No result yet...'}
          size="sm"
          variant="outline"
          className="w-full"
        >
          <Download className="w-4 h-4" />
          Download as Text
        </Button>
      </div>
    </CustomNode>
  );
};

export default OutputNodeComponent;