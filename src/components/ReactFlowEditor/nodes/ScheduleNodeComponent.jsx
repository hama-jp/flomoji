import React from 'react';
import CustomNode from './CustomNode';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import useReactFlowStore from '../../../store/reactFlowStore';
import schedulerService from '../../../services/schedulerService';

const ScheduleNodeComponent = ({ id, data }) => {
  const updateNodeData = useReactFlowStore(state => state.updateNodeData);

  const onCronExpressionChange = (evt) => {
    const newValue = evt.target.value;
    updateNodeData(id, { cronExpression: newValue });
  };

  const onScheduleNameChange = (evt) => {
    const newValue = evt.target.value;
    updateNodeData(id, { scheduleName: newValue });
  };

  const onEnabledChange = (checked) => {
    updateNodeData(id, { enabled: checked });
  };

  const onTimeoutChange = (evt) => {
    const newValue = parseInt(evt.target.value) || 30;
    updateNodeData(id, { timeoutMinutes: newValue });
  };

  // 次回実行時刻を取得
  const getNextExecution = () => {
    if (!data.enabled) return null;
    const nextRun = schedulerService.getNextExecution(id);
    return nextRun ? nextRun.toLocaleString('ja-JP') : null;
  };

  // Cron式の説明を生成
  const getCronDescription = () => {
    if (!data.cronExpression) return '';
    return schedulerService.constructor.humanReadableCron(data.cronExpression);
  };

  return (
    <CustomNode data={data} id={id}>
      <div className="space-y-3 min-w-[280px]">
        {/* スケジュール名 */}
        <div className="space-y-1">
          <Label htmlFor={`schedule-name-${id}`} className="text-xs font-medium">
            スケジュール名
          </Label>
          <Input
            id={`schedule-name-${id}`}
            value={data.scheduleName || ''}
            onChange={onScheduleNameChange}
            className="nodrag text-xs"
            placeholder="例: Daily Report"
          />
        </div>

        {/* Cron式 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor={`cron-${id}`} className="text-xs font-medium">
              Cron式
            </Label>
            <div className="text-xs text-muted-foreground font-mono">
              分 時 日 月 曜日<br/>
              *  *  *  *  *
            </div>
          </div>
          <Input
            id={`cron-${id}`}
            value={data.cronExpression || ''}
            onChange={onCronExpressionChange}
            className="nodrag text-xs font-mono"
            placeholder="0 9 * * *"
          />
          {data.cronExpression && (
            <div className="text-xs text-muted-foreground">
              {getCronDescription()}
            </div>
          )}
        </div>

        {/* タイムアウト設定 */}
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

        {/* 有効/無効スイッチ */}
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

        {/* ステータス表示 */}
        <div className="pt-2 border-t border-gray-200">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ステータス:</span>
              <span className={data.enabled ? 'text-green-600' : 'text-gray-500'}>
                {data.enabled ? '有効' : '無効'}
              </span>
            </div>
            {data.enabled && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">次回実行:</span>
                <span className="text-blue-600 text-xs">
                  {getNextExecution() || '計算中...'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ヘルプテキスト */}
        <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
          💡 このノードはワークフロー全体をスケジュール実行します。エッジ接続は不要です。
        </div>
      </div>
    </CustomNode>
  );
};

export default ScheduleNodeComponent;