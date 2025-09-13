/* eslint-disable @typescript-eslint/no-explicit-any */
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import schedulerService from './schedulerService';
import { ScheduleConfig } from '../types';
import { SchedulerService } from './schedulerService'; // SchedulerService クラスをインポート

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('schedulerService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // 全てのスケジュールを停止
    schedulerService.stopAllSchedules();
    // スケジュール管理マップをクリア
    (schedulerService as any).scheduledWorkflows.clear();
  });

  it('should validate cron expressions correctly', () => {
    expect(schedulerService.validateCronExpression('0 9 * * *')).toBe(true);
    expect(schedulerService.validateCronExpression('* * * * *')).toBe(true);
    expect(schedulerService.validateCronExpression('0 0 1 1 *')).toBe(true);
    expect(schedulerService.validateCronExpression('invalid')).toBe(false);
    expect(schedulerService.validateCronExpression('')).toBe(false);
  });

  it('should set and retrieve schedule configuration', () => {
    const workflowId = 'test-workflow';
    const scheduleConfig: ScheduleConfig = {
      workflowId: workflowId, // 追加
      cronExpression: '0 9 * * *',
      name: 'Test Schedule',
      enabled: false,
      onExecute: vi.fn()
    };

    const result = schedulerService.setSchedule(workflowId, scheduleConfig);
    expect(result).toBe(true);

    const retrievedConfig = schedulerService.getSchedule(workflowId);
    expect(retrievedConfig).toBeTruthy();
    if (retrievedConfig) {
      expect(retrievedConfig.name).toBe('Test Schedule');
      expect(retrievedConfig.cronExpression).toBe('0 9 * * *');
      expect(retrievedConfig.enabled).toBe(false);
    }
  });

  it('should not set schedule with invalid cron expression', () => {
    const workflowId = 'test-workflow';
    const scheduleConfig: ScheduleConfig = {
      workflowId: workflowId, // 追加
      cronExpression: 'invalid-cron',
      name: 'Test Schedule',
      enabled: false,
      onExecute: vi.fn()
    };

    const result = schedulerService.setSchedule(workflowId, scheduleConfig);
    expect(result).toBe(false);

    const retrievedConfig = schedulerService.getSchedule(workflowId);
    expect(retrievedConfig).toBeNull();
  });

  it('should toggle schedule enabled status', () => {
    const workflowId = 'test-workflow';
    const scheduleConfig: ScheduleConfig = {
      workflowId: workflowId, // 追加
      cronExpression: '0 9 * * *',
      name: 'Test Schedule',
      enabled: false,
      onExecute: vi.fn()
    };

    schedulerService.setSchedule(workflowId, scheduleConfig);
    
    const toggleResult = schedulerService.toggleSchedule(workflowId, true);
    expect(toggleResult).toBe(true);

    const updatedConfig = schedulerService.getSchedule(workflowId);
    expect(updatedConfig).toBeTruthy();
    if (updatedConfig) {
      expect(updatedConfig.enabled).toBe(true);
    }
  });

  it('should remove schedule', () => {
    const workflowId = 'test-workflow';
    const scheduleConfig: ScheduleConfig = {
      workflowId: workflowId, // 追加
      cronExpression: '0 9 * * *',
      name: 'Test Schedule',
      enabled: false,
      onExecute: vi.fn()
    };

    schedulerService.setSchedule(workflowId, scheduleConfig);
    expect(schedulerService.getSchedule(workflowId)).toBeTruthy();

    const removeResult = schedulerService.removeSchedule(workflowId);
    expect(removeResult).toBe(true);
    expect(schedulerService.getSchedule(workflowId)).toBeNull();
  });

  it('should get all schedules', () => {
    const workflowId1 = 'test-workflow-1';
    const workflowId2 = 'test-workflow-2';
    
    schedulerService.setSchedule(workflowId1, {
      workflowId: workflowId1, // 追加
      cronExpression: '0 9 * * *',
      name: 'Schedule 1',
      enabled: false,
      onExecute: vi.fn()
    });
    
    schedulerService.setSchedule(workflowId2, {
      workflowId: workflowId2, // 追加
      cronExpression: '0 10 * * *',
      name: 'Schedule 2',
      enabled: true,
      onExecute: vi.fn()
    });

    const allSchedules = schedulerService.getAllSchedules();
    expect(allSchedules).toHaveLength(2);
    expect(allSchedules.find(s => s.workflowId === workflowId1)).toBeTruthy();
    expect(allSchedules.find(s => s.workflowId === workflowId2)).toBeTruthy();
  });

  it('should provide cron expression presets', () => {
    const presets = SchedulerService.PRESETS; // 修正
    expect(presets['毎日 9:00']).toBe('0 9 * * *');
    expect(presets['毎時間']).toBe('0 * * * *');
    expect(presets['毎分']).toBe('* * * * *');
  });

  it('should convert common cron expressions to human readable format', () => {
    expect(SchedulerService.humanReadableCron('* * * * *')).toBe('毎分'); // 修正
    expect(SchedulerService.humanReadableCron('0 * * * *')).toBe('毎時間'); // 修正
    expect(SchedulerService.humanReadableCron('0 9 * * *')).toBe('毎日 9:00'); // 修正
    expect(SchedulerService.humanReadableCron('0 9 * * 1')).toBe('毎週月曜日 9:00'); // 修正
  });
});
