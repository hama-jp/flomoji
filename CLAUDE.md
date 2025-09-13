## 開発環境について

### パッケージマネージャー
このプロジェクトでは **pnpm** を使用しています。npmではありません。

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm run dev

# ビルド
pnpm run build

# テスト実行
pnpm test
```

## Playwright MCP使用ルール

### 絶対的な禁止事項

1. **いかなる形式のコード実行も禁止**

   - Python、JavaScript、Bash等でのブラウザ操作
   - MCPツールを調査するためのコード実行
   - subprocessやコマンド実行によるアプローチ

2. **利用可能なのはMCPツールの直接呼び出しのみ**

   - playwright:browser_navigate
   - playwright:browser_screenshot
   - 他のPlaywright MCPツール

3. **エラー時は即座に報告**
   - 回避策を探さない
   - 代替手段を実行しない
   - エラーメッセージをそのまま伝える

実装が終わった後はplaywright mcpを使って実際にアクセスして実装した機能を一通り試してエラーがないか確認すること！

## Playwright MCPテスト実行の知見

### 基本的な使用手順
1. **ブラウザのインストール確認**
   ```
   mcp__playwright__browser_install
   ```
   - 初回実行時に必要
   - "No open tabs"メッセージが表示されれば準備完了

2. **基本的な操作フロー**
   ```
   browser_navigate → browser_snapshot/browser_take_screenshot → browser_type → browser_close
   ```

3. **利用可能な主要ツール**
   - `browser_navigate`: URLへのナビゲーション
   - `browser_take_screenshot`: スクリーンショット取得（`tmp/playwright/`に保存）
   - `browser_snapshot`: ページ構造の取得（アクセシビリティツリー形式）
   - `browser_type`: テキスト入力（要素のref指定必須）
   - `browser_click`: クリック操作
   - `browser_close`: ブラウザを閉じる

### 注意事項
1. **要素の指定方法**
   - `browser_snapshot`で取得した`ref`値を使用
   - `element`パラメータには人間が読める説明を記載
   - 例: `element="Google search input field", ref="e42"`

2. **エラーハンドリング**
   - 接続エラー（ERR_CONNECTION_RESET）が発生する場合は別のURLで試す
   - reCAPTCHAが表示される場合がある（Google検索など）
   - コンソールメッセージでエラーや警告を確認可能

3. **ファイル保存場所**
   - スクリーンショットは`tmp/playwright/`ディレクトリに自動保存
   - ファイル名を指定しても、実際のパスは`tmp/playwright/`配下になる

### テスト実行時のベストプラクティス
- 最初に`browser_snapshot`でページ構造を確認
- 操作前後でスクリーンショットを取得して視覚的に確認
- エラーが発生したら即座に報告（回避策を探さない）
- テスト終了時は必ず`browser_close`でブラウザを閉じる
