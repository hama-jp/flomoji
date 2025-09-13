import React, { useState, useEffect, memo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import useReactFlowStore from '../../../store/reactFlowStore';

import CustomNode from './CustomNode';

const TimestampNodeComponent = ({ id, data }: any) => {
  const updateNodeData = useReactFlowStore((state: any) => state.updateNodeData);
  const [currentTime, setCurrentTime] = useState('');

  // 現在時刻をリアルタイム表示するため
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const { timezone, format }: any = data;
      
      try {
        let formattedTime;
        const options: Intl.DateTimeFormatOptions = {
          timeZone: timezone || 'Asia/Tokyo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        };

        switch (format) {
          case 'iso':
            formattedTime = now.toISOString();
            break;
          case 'unix':
            formattedTime = Math.floor(now.getTime() / 1000).toString();
            break;
          case 'unixms':
            formattedTime = now.getTime().toString();
            break;
          case 'date-only':
            formattedTime = now.toLocaleDateString('ja-JP', {
              timeZone: timezone || 'Asia/Tokyo',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
            break;
          case 'time-only':
            formattedTime = now.toLocaleTimeString('ja-JP', {
              timeZone: timezone || 'Asia/Tokyo',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            break;
          default: // 'locale'
            formattedTime = now.toLocaleString('ja-JP', options);
        }
        
        setCurrentTime(formattedTime);
      } catch (error: any) {
        setCurrentTime(now.toLocaleString('ja-JP'));
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [data.timezone, data.format]);

  const onTimezoneChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = evt.target.value;
    updateNodeData(id, { timezone: newValue });
  };

  const onFormatChange = (value: string) => {
    updateNodeData(id, { format: value });
  };

  const onLabelChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = evt.target.value;
    updateNodeData(id, { label: newValue });
  };

  // タイムゾーンの候補
  const commonTimezones = [
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
    { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
    { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
    { value: 'Asia/Seoul', label: 'Asia/Seoul (KST)' }
  ];

  // フォーマットオプション
  const formatOptions = [
    { value: 'locale', label: 'ローカル形式', example: '2024/01/01 09:00:00' },
    { value: 'iso', label: 'ISO 8601', example: '2024-01-01T09:00:00.000Z' },
    { value: 'unix', label: 'Unix (秒)', example: '1704096000' },
    { value: 'unixms', label: 'Unix (ミリ秒)', example: '1704096000000' },
    { value: 'date-only', label: '日付のみ', example: '2024/01/01' },
    { value: 'time-only', label: '時刻のみ', example: '09:00:00' }
  ];

  const selectedFormat = formatOptions.find(opt => opt.value === (data.format || 'locale'));

  // TimestampNodeのハンドル設定を明示
  const nodeDataWithHandles = {
    ...data,
    inputs: [], // 入力なし
    outputs: [{ name: 'output', id: '0' }], // 出力あり
    colorClass: 'bg-gradient-to-r from-cyan-400 to-cyan-600 text-white'
  };

  return (
    <CustomNode data={nodeDataWithHandles} id={id}>
      <div className="space-y-3 min-w-[280px]">
        {/* ラベル */}
        <div className="space-y-1">
          <Label htmlFor={`label-${id}`} className="text-xs font-medium">
            ラベル
          </Label>
          <Input
            id={`label-${id}`}
            value={data.label || ''}
            onChange={onLabelChange}
            className="nodrag text-xs"
            placeholder="Current Time"
          />
        </div>

        {/* タイムゾーン */}
        <div className="space-y-1">
          <Label htmlFor={`timezone-${id}`} className="text-xs font-medium">
            タイムゾーン
          </Label>
          <Input
            id={`timezone-${id}`}
            value={data.timezone || 'Asia/Tokyo'}
            onChange={onTimezoneChange}
            className="nodrag text-xs font-mono"
            placeholder="Asia/Tokyo"
            list={`timezone-list-${id}`}
          />
          <datalist id={`timezone-list-${id}`}>
            {commonTimezones.map(tz => (
              <option key={tz.value} value={tz.value} />
            ))}
          </datalist>
          <div className="text-xs text-muted-foreground">
            よく使用: Asia/Tokyo, UTC, America/New_York
          </div>
        </div>

        {/* フォーマット選択 */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">
            出力フォーマット
          </Label>
          <Select value={data.format || 'locale'} onValueChange={onFormatChange}>
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formatOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      例: {option.example}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 現在時刻プレビュー */}
        <div className="pt-2 border-t border-gray-200">
          <div className="space-y-1">
            <Label className="text-xs font-medium text-green-600">
              リアルタイム出力
            </Label>
            <div className="bg-green-50 p-2 rounded border">
              <div className="text-xs font-mono text-green-800 break-all">
                {currentTime || '計算中...'}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              ⏱️ 毎秒更新 • 実行時はこの値が出力されます
            </div>
          </div>
        </div>

        {/* ヘルプテキスト */}
        <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
          🕒 現在時刻を指定フォーマットで出力します。入力接続は不要です。
        </div>
      </div>
    </CustomNode>
  );
};

export default memo(TimestampNodeComponent);