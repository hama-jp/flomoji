/**
 * Undo/Redo履歴管理フック
 * ワークフローの状態変更を履歴として管理し、アンドゥ/リドゥ機能を提供
 */

import { useState, useCallback, useRef } from 'react';

export interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseUndoRedoOptions {
  maxHistorySize?: number; // 履歴の最大サイズ（デフォルト: 50）
}

interface UseUndoRedoReturn<T> {
  state: T;
  setState: (newState: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (initialState: T) => void;
  historySize: number;
}

export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
): UseUndoRedoReturn<T> {
  const { maxHistorySize = 50 } = options;

  // 履歴管理用の状態
  const [history, setHistory] = useState<UndoRedoState<T>>({
    past: [],
    present: initialState,
    future: []
  });

  // 最後の操作タイムスタンプ（デバウンス用）
  const lastUpdateRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 状態を設定（履歴に追加）
  const setState = useCallback((newState: T) => {
    const now = Date.now();

    // デバウンス処理（連続した変更を1つの履歴として扱う）
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setHistory(prev => {
        const newPast = [...prev.past, prev.present];

        // 履歴サイズの制限
        if (newPast.length > maxHistorySize) {
          newPast.shift();
        }

        return {
          past: newPast,
          present: newState,
          future: [] // 新しい状態を設定したら、未来の履歴はクリア
        };
      });

      lastUpdateRef.current = now;
    }, 300); // 300ms のデバウンス
  }, [maxHistorySize]);

  // アンドゥ
  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) {
        console.log('Undo: No history to undo');
        return prev;
      }

      const previousState = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, -1);

      console.log('Undo: Reverting to previous state', {
        historyLength: prev.past.length,
        futureLength: prev.future.length + 1
      });

      return {
        past: newPast,
        present: previousState,
        future: [prev.present, ...prev.future]
      };
    });
  }, []);

  // リドゥ
  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) {
        console.log('Redo: No history to redo');
        return prev;
      }

      const nextState = prev.future[0];
      const newFuture = prev.future.slice(1);

      console.log('Redo: Applying next state', {
        historyLength: prev.past.length + 1,
        futureLength: newFuture.length
      });

      return {
        past: [...prev.past, prev.present],
        present: nextState,
        future: newFuture
      };
    });
  }, []);

  // 履歴をリセット
  const reset = useCallback((newInitialState: T) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    setHistory({
      past: [],
      present: newInitialState,
      future: []
    });
  }, []);

  return {
    state: history.present,
    setState,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    reset,
    historySize: history.past.length + history.future.length + 1
  };
}

export default useUndoRedo;