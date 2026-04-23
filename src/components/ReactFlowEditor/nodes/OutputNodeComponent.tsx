import React, { memo } from 'react';

import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import CustomNode from './CustomNode';

const DOWNLOAD_CONFIG = {
  text: { extension: 'txt', mimeType: 'text/plain;charset=utf-8', label: 'Text' },
  json: { extension: 'json', mimeType: 'application/json;charset=utf-8', label: 'JSON' },
  markdown: { extension: 'md', mimeType: 'text/markdown;charset=utf-8', label: 'Markdown' }
} as const;

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const OutputNodeComponent = ({ id, data }: any) => {
  
  // propsのdata.resultを使用（実行結果はuseWorkflowExecutionで更新される）
  const displayResult = data.result || 'No result yet...';
  
  // ファイルダウンロード処理
  const handleDownload = () => {
    if (!displayResult || displayResult === 'No result yet...') {
      return;
    }

    const format = data.format || 'text';
    const config = DOWNLOAD_CONFIG[format as keyof typeof DOWNLOAD_CONFIG] || DOWNLOAD_CONFIG.text;

    // Blobを作成してダウンロード
    const blob = new Blob([displayResult], { type: config.mimeType });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const preferredName = sanitizeFileName(data.fileName || data.title || data.label || 'output');
    const filename = `${preferredName || 'output'}_${timestamp}.${config.extension}`;
    
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
          size={'sm' as const}
          variant={'outline' as const}
          className="w-full"
        >
          <Download className="w-4 h-4" />
          Download as {(DOWNLOAD_CONFIG[data.format as keyof typeof DOWNLOAD_CONFIG] || DOWNLOAD_CONFIG.text).label}
        </Button>
      </div>
    </CustomNode>
  );
};

export default memo(OutputNodeComponent);
