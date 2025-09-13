import Dexie, { Table } from 'dexie';
import { nanoid } from 'nanoid';

// Database table interfaces
interface WorkflowRun {
  id?: string;
  workflowId: string;
  startedAt: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  inputData: string;
  endedAt?: string;
  updatedAt?: string;
}

interface NodeLog {
  id?: string;
  runId: string;
  nodeId: string;
  timestamp: string;
  status: string;
  inputs: string;
  outputs: string;
  error?: string | null;
  processingTime?: number | null;
}

// Dexie database class
class LogDatabase extends Dexie {
  workflow_runs!: Table<WorkflowRun>;
  node_logs!: Table<NodeLog>;

  constructor() {
    super('llm_agent_logs');
    this.version(1).stores({
      workflow_runs: 'id, workflowId, startedAt, status',
      node_logs: 'id, runId, nodeId, timestamp'
    });
  }
}

const db = new LogDatabase();

// Type definitions for service methods
interface RunData {
  status?: 'running' | 'completed' | 'failed' | 'stopped';
  [key: string]: any;
}

interface NodeLogData {
  runId: string;
  nodeId: string;
  status: string;
  inputs?: any;
  outputs?: any;
  error?: string;
  processingTime?: number;
}

export const logService = {
  async createRun(workflowId: string, inputData?: any): Promise<string> {
    const id = nanoid();
    const runData: WorkflowRun = {
      id,
      workflowId,
      startedAt: new Date().toISOString(),
      status: 'running',
      inputData: JSON.stringify(inputData || {})
    };
    
    await db.workflow_runs.add(runData);
    return id;
  },

  async updateRun(runId: string, data: RunData): Promise<void> {
    const updateData: Partial<WorkflowRun> = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    if (data.status === 'completed' || data.status === 'failed' || data.status === 'stopped') {
      updateData.endedAt = new Date().toISOString();
    }
    
    await db.workflow_runs.update(runId, updateData);
  },

  async addNodeLog(logData: NodeLogData): Promise<string> {
    const id = nanoid();
    const nodeLogData: NodeLog = {
      id,
      runId: logData.runId,
      nodeId: logData.nodeId,
      timestamp: new Date().toISOString(),
      status: logData.status,
      inputs: JSON.stringify(logData.inputs || {}),
      outputs: JSON.stringify(logData.outputs || {}),
      error: logData.error || null,
      processingTime: logData.processingTime || null
    };
    
    await db.node_logs.add(nodeLogData);
    return id;
  },

  async getRunsForWorkflow(workflowId: string): Promise<any[]> {
    const runs = await db.workflow_runs
      .where('workflowId')
      .equals(workflowId)
      .toArray();
    
    // Sort by date (newest first)
    runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    
    return runs.map(run => ({
      ...run,
      inputData: JSON.parse(run.inputData || '{}')
    }));
  },

  async getLogsForRun(runId: string): Promise<any[]> {
    const logs = await db.node_logs
      .where('runId')
      .equals(runId)
      .toArray();
    
    // Sort by timestamp
    logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    return logs.map(log => ({
      ...log,
      inputs: JSON.parse(log.inputs || '{}'),
      outputs: JSON.parse(log.outputs || '{}')
    }));
  },

  async clearAllLogs(): Promise<void> {
    await db.workflow_runs.clear();
    await db.node_logs.clear();
  },

  async getRun(runId: string): Promise<any | null> {
    const run = await db.workflow_runs.get(runId);
    if (run) {
      return {
        ...run,
        inputData: JSON.parse(run.inputData || '{}')
      };
    }
    return null;
  }
};

export default logService;