# キーボードショートカット一覧

Flomojiワークフローエディターで利用可能なキーボードショートカットの一覧です。

## 編集操作

| ショートカット | 機能 | 説明 |
|---|---|---|
| `Ctrl+Z` / `Cmd+Z` | 元に戻す (Undo) | 直前の操作を取り消します |
| `Ctrl+Y` / `Cmd+Y`<br>`Ctrl+Shift+Z` / `Cmd+Shift+Z` | やり直す (Redo) | 取り消した操作をやり直します |
| `Ctrl+S` / `Cmd+S` | 保存 | 現在のワークフローを保存します |
| `Delete` / `Backspace` | 削除 | 選択中のノードやエッジを削除します |
| `Ctrl+A` / `Cmd+A` | すべて選択 | すべてのノードを選択します |
| `Escape` | 選択解除 | 選択をクリアし、開いているメニューを閉じます |

## ワークフロー実行

| ショートカット | 機能 | 説明 |
|---|---|---|
| `Ctrl+Enter` / `Cmd+Enter` | 実行 | ワークフローを実行します |
| `Ctrl+Shift+Enter` / `Cmd+Shift+Enter` | 停止 | 実行中のワークフローを停止します |

## 今後追加予定の機能

### ナビゲーション
- `Ctrl+F` / `Cmd+F` - 検索
- `Ctrl+Plus` / `Cmd+Plus` - ズームイン
- `Ctrl+Minus` / `Cmd+Minus` - ズームアウト
- `Ctrl+0` / `Cmd+0` - ズームリセット
- `Ctrl+Shift+0` / `Cmd+Shift+0` - 全体表示

### ファイル操作
- `Ctrl+N` / `Cmd+N` - 新規ワークフロー作成
- `Ctrl+O` / `Cmd+O` - ワークフローを開く
- `Ctrl+E` / `Cmd+E` - エクスポート

### 編集操作
- `Ctrl+C` / `Cmd+C` - コピー
- `Ctrl+V` / `Cmd+V` - ペースト
- `Ctrl+X` / `Cmd+X` - カット

### デバッグ
- `Ctrl+Shift+D` / `Cmd+Shift+D` - デバッグモード切り替え
- `Ctrl+Shift+L` / `Cmd+Shift+L` - ログクリア

## 使用上の注意

- テキスト入力中は、Undo/Redo以外のショートカットは無効になります
- ブラウザの標準ショートカットと競合する場合があります
- 一部のショートカットはOSやブラウザによって動作が異なる場合があります

## 技術的な実装詳細

キーボードショートカットは以下のファイルで実装されています：

- `/src/hooks/useKeyboardShortcuts.ts` - ショートカット管理フック
- `/src/components/ReactFlowEditor/index.tsx` - エディター内でのショートカット定義
- `/src/store/reactFlowStore.ts` - Undo/Redo機能の状態管理

### カスタマイズ方法

新しいショートカットを追加する場合は、`useKeyboardShortcuts` フックを使用します：

```typescript
useKeyboardShortcuts([
  {
    keys: ['ctrl+n', 'cmd+n'],
    handler: () => {
      // 処理内容
    },
    description: 'New workflow'
  }
]);
```

---
*作成日: 2025-09-13*
*バージョン: 1.0*