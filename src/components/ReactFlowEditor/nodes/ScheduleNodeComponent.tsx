import React, { useCallback, memo } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import StorageService from '../../../services/storageService';
import schedulerService, { SchedulerService } from '../../../services/schedulerService';
import useReactFlowStore from '../../../store/reactFlowStore';

import CustomNode from './CustomNode';

interface ScheduleNodeComponentProps {
  id: string;
  data: any;
}

const ScheduleNodeComponent: React.FC<ScheduleNodeComponentProps> = ({ id, data }) => {
  const updateNodeData = useReactFlowStore((state: any) => state.updateNodeData);
  const cronPresets = SchedulerService.getCronPresets();

  const onScheduleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { scheduleName: e.target.value });
  }, [id, updateNodeData]);

  const onCronExpressionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { cronExpression: e.target.value });
  }, [id, updateNodeData]);

  const onTimeoutChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    updateNodeData(id, { timeoutMinutes: Number.isNaN(parsed) ? 30 : parsed });
  }, [id, updateNodeData]);

  const onEnabledChange = useCallback((checked: boolean) => {
    updateNodeData(id, { enabled: checked });
  }, [id, updateNodeData]);

  const applyPreset = useCallback((cronExpression: string) => {
    updateNodeData(id, { cronExpression });
  }, [id, updateNodeData]);

  const getNextExecution = () => {
    const workflowId = StorageService.getCurrentWorkflowId();
    if (!workflowId || !data.enabled) {
      return null;
    }

    const nextExecution = schedulerService.getNextExecution(workflowId);
    if (!nextExecution) {
      return null;
    }

    return nextExecution.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCronDescription = () => {
    if (!data.cronExpression) return '';
    return SchedulerService.humanReadableCron(data.cronExpression);
  };

  return (
    <CustomNode data={data} id={id}>
      <div className="space-y-3 min-w-[280px]">
        <div className="space-y-1">
          <Label htmlFor={`schedule-name-${id}`} className="text-xs font-medium">
            スケジュール名
          </Label>
          <Input
            id={`schedule-name-${id}`}
            value={data.scheduleName || ''}
            onChange={onScheduleNameChange}
            className="nodrag text-xs"
            placeholder="例: Morning Research Digest"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`cron-${id}`} className="text-xs font-medium">
              Cron式
            </Label>
            <div className="text-xs text-muted-foreground font-mono">
              分 時 日 月 曜日<br />
              *  *  *  *  *
            </div>
          </div>
          <Input
            id={`cron-${id}`}
            value={data.cronExpression || ''}
            onChange={onCronExpressionChange}
            className="nodrag text-xs font-mono"
            placeholder="0 9 * * 1-5"
          />
          {data.cronExpression && (
            <div className="text-xs text-muted-foreground">
              {getCronDescription()}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {cronPresets.slice(0, 5).map((preset) => (
            <Button
              key={preset.value}
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={() => applyPreset(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="space-y-1">
          <Label htmlFor={`timeout-${id}`} className="text-xs font-medium">
            タイムアウト (分)
          </Label>
          <Input
            id={`timeout-${id}`}
            type="number"
            min="1"
            max="1440"
            value={data.timeoutMinutes || 30}
            onChange={onTimeoutChange}
            className="nodrag text-xs"
          />
        </div>

        <div className="flex items-center justify-between space-x-2">
          <Label htmlFor={`enabled-${id}`} className="text-xs font-medium">
            スケジュール有効
          </Label>
          <Switch
            id={`enabled-${id}`}
            checked={data.enabled || false}
            onCheckedChange={onEnabledChange}
          />
        </div>

        <div className="pt-2 border-t border-gray-200">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ステータス:</span>
              <span className={data.enabled ? 'text-green-600' : 'text-gray-500'}>
                {data.enabled ? '有効' : '無効'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">タイムゾーン:</span>
              <span>{data.timezone || 'Asia/Tokyo'}</span>
            </div>
            {data.enabled && (
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">次回実行:</span>
                <span className="text-blue-600 text-xs text-right">
                  {getNextExecution() || '保存後に更新'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
          💡 このノードはワークフロー全体をスケジュール実行します。ニュース監視なら平日朝のcronを入れておくと運用しやすいです。
        </div>
      </div>
    </CustomNode>
  );
};

export default memo(ScheduleNodeComponent);
