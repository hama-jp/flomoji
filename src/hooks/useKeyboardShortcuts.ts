/**
 * キーボードショートカット管理フック
 * グローバルなキーボードショートカットを登録・管理
 */

import { useEffect, useRef, useCallback } from 'react';

export interface ShortcutHandler {
  keys: string[]; // 例: ['ctrl+z', 'cmd+z']
  handler: (event: KeyboardEvent) => void;
  description?: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  target?: HTMLElement | Window;
}

/**
 * キーボードショートカットを管理するカスタムフック
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutHandler[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, target = window } = options;
  const shortcutsRef = useRef(shortcuts);

  // ショートカットを更新
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  // キーボードイベントをショートカット文字列に変換
  const eventToShortcut = useCallback((event: KeyboardEvent): string => {
    const parts: string[] = [];

    if (event.ctrlKey || event.metaKey) {
      parts.push(event.metaKey ? 'cmd' : 'ctrl');
    }
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');

    // 特殊キーの処理
    const key = event.key.toLowerCase();
    if (key === ' ') {
      parts.push('space');
    } else if (key === 'escape') {
      parts.push('esc');
    } else if (key === 'arrowup') {
      parts.push('up');
    } else if (key === 'arrowdown') {
      parts.push('down');
    } else if (key === 'arrowleft') {
      parts.push('left');
    } else if (key === 'arrowright') {
      parts.push('right');
    } else if (key === 'delete') {
      parts.push('del');
    } else if (key === 'backspace') {
      parts.push('backspace');
    } else if (key === 'enter') {
      parts.push('enter');
    } else if (key === 'tab') {
      parts.push('tab');
    } else if (key.length === 1) {
      parts.push(key);
    }

    return parts.join('+');
  }, []);

  // キーボードイベントハンドラー
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // テキスト入力中はショートカットを無効化
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' ||
                   target.tagName === 'TEXTAREA' ||
                   target.contentEditable === 'true';

    // 特定のショートカット（Ctrl+Z, Ctrl+Y など）は入力中でも有効
    const shortcutStr = eventToShortcut(event);
    const isUndoRedo = ['ctrl+z', 'cmd+z', 'ctrl+y', 'cmd+y', 'ctrl+shift+z', 'cmd+shift+z'].includes(shortcutStr);

    if (isInput && !isUndoRedo) {
      return;
    }

    // マッチするショートカットを探す
    for (const shortcut of shortcutsRef.current) {
      if (shortcut.keys.includes(shortcutStr)) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
          event.stopPropagation();
        }

        console.log(`Keyboard shortcut triggered: ${shortcutStr}`, shortcut.description);
        shortcut.handler(event);
        break;
      }
    }
  }, [enabled, eventToShortcut]);

  // イベントリスナーの登録
  useEffect(() => {
    if (!enabled) return;

    const targetElement = target || window;
    targetElement.addEventListener('keydown', handleKeyDown as any);

    return () => {
      targetElement.removeEventListener('keydown', handleKeyDown as any);
    };
  }, [enabled, target, handleKeyDown]);
}

/**
 * よく使われるショートカットのプリセット
 */
export const COMMON_SHORTCUTS = {
  // 編集操作
  UNDO: ['ctrl+z', 'cmd+z'] as const,
  REDO: ['ctrl+y', 'cmd+y', 'ctrl+shift+z', 'cmd+shift+z'] as const,
  SAVE: ['ctrl+s', 'cmd+s'] as const,
  COPY: ['ctrl+c', 'cmd+c'] as const,
  PASTE: ['ctrl+v', 'cmd+v'] as const,
  CUT: ['ctrl+x', 'cmd+x'] as const,
  DELETE: ['del', 'backspace'] as const,
  SELECT_ALL: ['ctrl+a', 'cmd+a'] as const,

  // ナビゲーション
  SEARCH: ['ctrl+f', 'cmd+f'] as const,
  ESCAPE: ['esc'] as const,
  ENTER: ['enter'] as const,

  // ワークフロー操作
  RUN: ['ctrl+enter', 'cmd+enter'] as const,
  STOP: ['ctrl+shift+enter', 'cmd+shift+enter'] as const,
  NEW: ['ctrl+n', 'cmd+n'] as const,
  OPEN: ['ctrl+o', 'cmd+o'] as const,
  EXPORT: ['ctrl+e', 'cmd+e'] as const,

  // ズーム
  ZOOM_IN: ['ctrl+plus', 'cmd+plus', 'ctrl+=', 'cmd+='] as const,
  ZOOM_OUT: ['ctrl+minus', 'cmd+minus', 'ctrl+-', 'cmd+-'] as const,
  ZOOM_RESET: ['ctrl+0', 'cmd+0'] as const,
  FIT_VIEW: ['ctrl+shift+0', 'cmd+shift+0'] as const,

  // デバッグ
  TOGGLE_DEBUG: ['ctrl+shift+d', 'cmd+shift+d'] as const,
  CLEAR_LOGS: ['ctrl+shift+l', 'cmd+shift+l'] as const,
} as const;

export default useKeyboardShortcuts;