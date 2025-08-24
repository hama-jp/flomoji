/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TimestampNode from './TimestampNode.js';

describe('TimestampNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct node definition properties', () => {
    expect(TimestampNode.name).toBe('Timestamp');
    expect(TimestampNode.icon).toBe('🕒');
    expect(TimestampNode.inputs).toEqual([]);
    expect(TimestampNode.outputs).toEqual(['output']);
    expect(TimestampNode.category).toBe('input-output');
  });

  it('should have proper default data', () => {
    expect(TimestampNode.defaultData).toEqual({
      timezone: 'Asia/Tokyo',
      format: 'locale',
      label: 'Current Time'
    });
  });

  it('should execute correctly with default settings (locale format)', async () => {
    const node = {
      id: 'timestamp-1',
      data: {
        timezone: 'Asia/Tokyo',
        format: 'locale',
        label: 'Current Time'
      }
    };

    const inputs = {};
    const context = {
      addLog: vi.fn(),
      variables: {}
    };

    const result = await TimestampNode.execute(node, inputs, context);

    expect(context.addLog).toHaveBeenCalledWith(
      'info',
      'タイムスタンプノードを実行中',
      'timestamp-1',
      {
        timezone: 'Asia/Tokyo',
        format: 'locale'
      }
    );

    expect(context.addLog).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('現在時刻を取得:'),
      'timestamp-1',
      expect.objectContaining({
        timezone: 'Asia/Tokyo',
        format: 'locale'
      })
    );

    // 結果が文字列で、日付らしい形式であることを確認
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(context.variables['timestamp-1']).toBe(result);
  });

  it('should execute correctly with ISO format', async () => {
    const node = {
      id: 'timestamp-2',
      data: {
        timezone: 'UTC',
        format: 'iso',
        label: 'ISO Time'
      }
    };

    const inputs = {};
    const context = {
      addLog: vi.fn(),
      variables: {}
    };

    const result = await TimestampNode.execute(node, inputs, context);

    // ISO形式の結果を確認（YYYY-MM-DDTHH:mm:ss.sssZのパターン）
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(context.variables['timestamp-2']).toBe(result);
  });

  it('should execute correctly with Unix timestamp format', async () => {
    const node = {
      id: 'timestamp-3',
      data: {
        timezone: 'UTC',
        format: 'unix',
        label: 'Unix Time'
      }
    };

    const inputs = {};
    const context = {
      addLog: vi.fn(),
      variables: {}
    };

    const result = await TimestampNode.execute(node, inputs, context);

    // Unix timestampは数字のみの文字列
    expect(result).toMatch(/^\d+$/);
    expect(parseInt(result)).toBeGreaterThan(1000000000); // 2001年以降
    expect(context.variables['timestamp-3']).toBe(result);
  });

  it('should execute correctly with date-only format', async () => {
    const node = {
      id: 'timestamp-4',
      data: {
        timezone: 'Asia/Tokyo',
        format: 'date-only',
        label: 'Date Only'
      }
    };

    const inputs = {};
    const context = {
      addLog: vi.fn(),
      variables: {}
    };

    const result = await TimestampNode.execute(node, inputs, context);

    // 日付形式（YYYY/MM/DD）の確認
    expect(result).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    expect(context.variables['timestamp-4']).toBe(result);
  });

  it('should execute correctly with time-only format', async () => {
    const node = {
      id: 'timestamp-5',
      data: {
        timezone: 'Asia/Tokyo',
        format: 'time-only',
        label: 'Time Only'
      }
    };

    const inputs = {};
    const context = {
      addLog: vi.fn(),
      variables: {}
    };

    const result = await TimestampNode.execute(node, inputs, context);

    // 時刻形式（HH:mm:ss）の確認
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(context.variables['timestamp-5']).toBe(result);
  });

  it('should handle invalid timezone gracefully', async () => {
    const node = {
      id: 'timestamp-error',
      data: {
        timezone: 'Invalid/Timezone',
        format: 'locale',
        label: 'Error Test'
      }
    };

    const inputs = {};
    const context = {
      addLog: vi.fn(),
      variables: {}
    };

    const result = await TimestampNode.execute(node, inputs, context);

    // エラーが発生してもフォールバック値が返される
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(context.variables['timestamp-error']).toBe(result);
    
    // エラーログが記録される
    expect(context.addLog).toHaveBeenCalledWith(
      'error',
      expect.stringContaining('タイムゾーン設定エラー'),
      'timestamp-error',
      expect.objectContaining({
        timezone: 'Invalid/Timezone'
      })
    );
  });
});