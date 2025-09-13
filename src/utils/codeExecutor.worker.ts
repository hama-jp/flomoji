/**
 * Code Executor Web Worker
 * 安全な隔離環境でユーザーコードを実行
 */

// 許可されたグローバルオブジェクト
const ALLOWED_GLOBALS = {
  // 基本オブジェクト
  Object,
  Array,
  String,
  Number,
  Boolean,
  Date,
  Math,
  JSON,
  RegExp,
  Map,
  Set,
  Promise,
  
  // 関数
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  encodeURIComponent,
  decodeURIComponent,
  encodeURI,
  decodeURI,
  
  // エラー
  Error,
  TypeError,
  ReferenceError,
  SyntaxError,
  RangeError,
  
  // その他ユーティリティ
  console: {
    log: (...args: any[]) => {
      self.postMessage({
        type: 'console',
        data: args.map(arg => {
          try {
            return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
          } catch {
            return String(arg);
          }
        }).join(' ')
      });
    }
  }
};

// コード実行関数
function executeCode(code: any, inputs: any, variables: any) {
  // サンドボックス環境の作成
  const sandbox = {
    ...ALLOWED_GLOBALS,
    // 入力値 - 単一の入力のみ
    input: inputs.input,
    // 変数（読み取り専用）
    variables: Object.freeze({ ...variables }),
  };
  
  // コードをラップして実行
  const wrappedCode = `
    'use strict';
    return (function(${Object.keys(sandbox).join(', ')}) {
      ${code}
    })(${Object.keys(sandbox).map(key => 'sandbox["' + key + '"]').join(', ')});
  `;
  
  try {
    // Function コンストラクタで実行（evalより安全）
    const fn = new Function('sandbox', wrappedCode);
    const result = fn(sandbox);
    
    // 結果のサイズチェック（10MB制限）
    const serialized = JSON.stringify(result);
    if (serialized && serialized.length > 10 * 1024 * 1024) {
      throw new Error('Result size exceeds 10MB limit');
    }
    
    return result;
  } catch (error: any) {
    throw error;
  }
}

// メッセージハンドラ
self.onmessage = async (event) => {
  const { id, code, inputs, variables, timeout = 5000 }: any = event.data;
  
  // タイムアウト処理
  const timeoutId = setTimeout(() => {
    self.postMessage({
      id,
      type: 'error',
      error: 'Code execution timeout (exceeded ' + timeout + 'ms)'
    });
    // Worker を終了
    self.close();
  }, timeout);
  
  try {
    // コード実行
    const result = await executeCode(code, inputs || {}, variables || {});
    
    clearTimeout(timeoutId);
    
    // 結果送信
    self.postMessage({
      id,
      type: 'success',
      result
    });
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // エラー送信
    self.postMessage({
      id,
      type: 'error',
      error: error.message || String(error)
    });
  }
};

// Worker 初期化完了通知
self.postMessage({ type: 'ready' });