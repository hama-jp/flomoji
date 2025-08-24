/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import schedulerService from './schedulerService.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('schedulerService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // 全てのスケジュールを停止
    schedulerService.stopAllSchedules();
    // スケジュール管理マップをクリア
    schedulerService.scheduledWorkflows.clear();
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
    const scheduleConfig = {
      cronExpression: '0 9 * * *',
      name: 'Test Schedule',
      enabled: false,
      onExecute: vi.fn()
    };

    const result = schedulerService.setSchedule(workflowId, scheduleConfig);
    expect(result).toBe(true);

    const retrievedConfig = schedulerService.getSchedule(workflowId);
    expect(retrievedConfig).toBeTruthy();
    expect(retrievedConfig.name).toBe('Test Schedule');
    expect(retrievedConfig.cronExpression).toBe('0 9 * * *');
    expect(retrievedConfig.enabled).toBe(false);
  });

  it('should not set schedule with invalid cron expression', () => {
    const workflowId = 'test-workflow';
    const scheduleConfig = {
      cronExpression: 'invalid-cron',
      name: 'Test Schedule',
      enabled: false
    };

    const result = schedulerService.setSchedule(workflowId, scheduleConfig);
    expect(result).toBe(false);

    const retrievedConfig = schedulerService.getSchedule(workflowId);
    expect(retrievedConfig).toBeNull();
  });

  it('should toggle schedule enabled status', () => {
    const workflowId = 'test-workflow';
    const scheduleConfig = {
      cronExpression: '0 9 * * *',
      name: 'Test Schedule',
      enabled: false
    };

    schedulerService.setSchedule(workflowId, scheduleConfig);
    
    const toggleResult = schedulerService.toggleSchedule(workflowId, true);
    expect(toggleResult).toBe(true);

    const updatedConfig = schedulerService.getSchedule(workflowId);
    expect(updatedConfig.enabled).toBe(true);
  });

  it('should remove schedule', () => {
    const workflowId = 'test-workflow';
    const scheduleConfig = {
      cronExpression: '0 9 * * *',
      name: 'Test Schedule',
      enabled: false
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
      cronExpression: '0 9 * * *',
      name: 'Schedule 1',
      enabled: false
    });
    
    schedulerService.setSchedule(workflowId2, {
      cronExpression: '0 10 * * *',
      name: 'Schedule 2',
      enabled: true
    });

    const allSchedules = schedulerService.getAllSchedules();
    expect(allSchedules).toHaveLength(2);
    expect(allSchedules.find(s => s.workflowId === workflowId1)).toBeTruthy();
    expect(allSchedules.find(s => s.workflowId === workflowId2)).toBeTruthy();
  });

  it('should provide cron expression presets', () => {
    const presets = schedulerService.constructor.PRESETS;
    expect(presets['毎日 9:00']).toBe('0 9 * * *');
    expect(presets['毎時間']).toBe('0 * * * *');
    expect(presets['毎分']).toBe('* * * * *');
  });

  it('should convert common cron expressions to human readable format', () => {
    expect(schedulerService.constructor.humanReadableCron('* * * * *')).toBe('毎分');
    expect(schedulerService.constructor.humanReadableCron('0 * * * *')).toBe('毎時間');
    expect(schedulerService.constructor.humanReadableCron('0 9 * * *')).toBe('毎日 9:00');
    expect(schedulerService.constructor.humanReadableCron('0 9 * * 1')).toBe('毎週月曜日 9:00');
  });
});