/**
 * Code Execution Service
 * Web Worker を管理してコードを安全に実行
 */

class CodeExecutionService {
  constructor() {
    this.workers = new Map();
    this.messageId = 0;
    this.pendingExecutions = new Map();
  }

  /**
   * コードを実行
   * @param {string} code - 実行するJavaScriptコード
   * @param {Object} inputs - 入力データ
   * @param {Object} variables - ワークフロー変数
   * @param {number} timeout - タイムアウト時間（ミリ秒）
   * @returns {Promise<{result?: any, error?: string, logs?: string[]}>}
   */
  async execute(code, inputs = {}, variables = {}, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      const logs = [];
      
      // Worker の作成
      const worker = new Worker(
        new URL('./codeExecutor.worker.js', import.meta.url),
        { type: 'module' }
      );
      
      // メッセージハンドラ
      const handleMessage = (event) => {
        const data = event.data;
        
        if (data.type === 'console') {
          // console.log の出力を収集
          logs.push(data.data);
          return;
        }
        
        if (data.id !== id) return;
        
        // Worker のクリーンアップ
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        worker.terminate();
        this.workers.delete(id);
        this.pendingExecutions.delete(id);
        
        if (data.type === 'success') {
          resolve({ result: data.result, logs });
        } else if (data.type === 'error') {
          resolve({ error: data.error, logs });
        }
      };
      
      // エラーハンドラ
      const handleError = (error) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        worker.terminate();
        this.workers.delete(id);
        this.pendingExecutions.delete(id);
        
        resolve({ 
          error: `Worker error: ${error.message || error}`,
          logs 
        });
      };
      
      // リスナー登録
      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      
      // Worker と実行情報を保存
      this.workers.set(id, worker);
      this.pendingExecutions.set(id, { resolve, reject, logs });
      
      // コード実行リクエスト送信
      worker.postMessage({
        id,
        code,
        inputs,
        variables,
        timeout
      });
      
      // タイムアウト処理（バックアップ）
      setTimeout(() => {
        if (this.pendingExecutions.has(id)) {
          const execution = this.pendingExecutions.get(id);
          const worker = this.workers.get(id);
          
          if (worker) {
            worker.terminate();
            this.workers.delete(id);
          }
          
          this.pendingExecutions.delete(id);
          
          execution.resolve({
            error: `Code execution timeout (exceeded ${timeout}ms)`,
            logs: execution.logs
          });
        }
      }, timeout + 1000); // Worker のタイムアウト + 1秒の余裕
    });
  }

  /**
   * すべての Worker を終了
   */
  cleanup() {
    for (const [id, worker] of this.workers) {
      worker.terminate();
    }
    this.workers.clear();
    this.pendingExecutions.clear();
  }
}

// シングルトンインスタンス
const codeExecutionService = new CodeExecutionService();

// ページアンロード時にクリーンアップ
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    codeExecutionService.cleanup();
  });
}

export default codeExecutionService;