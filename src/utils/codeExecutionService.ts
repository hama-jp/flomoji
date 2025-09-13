class CodeExecutionService {
  private workers: Map<string, Worker>;
  private messageId: number;
  private pendingExecutions: Map<string, {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    logs: any[];
  }>;

  constructor() {
    this.workers = new Map();
    this.messageId = 0;
    this.pendingExecutions = new Map();
  }

  async executeCode(
    code: string,
    inputs: any = {},
    variables: any = {},
    options: any = {}
  ): Promise<{ result: any; logs: any[]; error?: string }> {
    const id = String(++this.messageId);
    const logs: any[] = [];

    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('./codeExecutor.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (event: MessageEvent) => {
        const { type, data } = event.data;

        switch (type) {
          case 'log':
            logs.push(data);
            break;
          case 'result':
            worker.terminate();
            this.workers.delete(id);
            this.pendingExecutions.delete(id);
            resolve({ result: data, logs });
            break;
          case 'error':
            worker.terminate();
            this.workers.delete(id);
            this.pendingExecutions.delete(id);
            resolve({ result: undefined, logs, error: data });
            break;
        }
      };

      worker.onerror = (error: ErrorEvent) => {
        console.error('Worker error:', error);
        worker.terminate();
        this.workers.delete(id);
        this.pendingExecutions.delete(id);
        reject(error);
      };

      const timeout = options.timeout || 30000;
      const timeoutId = setTimeout(() => {
        worker.terminate();
        this.workers.delete(id);
        this.pendingExecutions.delete(id);
        resolve({
          result: undefined,
          logs,
          error: `Code execution timed out after ${timeout}ms`
        });
      }, timeout);

      this.workers.set(id, worker);
      this.pendingExecutions.set(id, { resolve, reject, logs });

      worker.postMessage({
        id,
        code,
        inputs,
        variables,
        timeout
      });

      if (options.onTimeout) {
        setTimeout(() => {
          if (this.pendingExecutions.has(id)) {
            const execution = this.pendingExecutions.get(id);
            if (execution) {
              worker.terminate();
              this.workers.delete(id);
              this.pendingExecutions.delete(id);
              options.onTimeout();
            }
          }
        }, timeout);
      }
    });
  }

  terminateAll() {
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();
    this.pendingExecutions.clear();
  }
}

export default new CodeExecutionService();
