# Web API Node Documentation

## 概要

Web API ノードは、任意のREST APIと通信できる汎用的なノードです。認証、リトライ、タイムアウトなどの高度な機能をサポートしています。

## 機能

### 基本機能
- **HTTPメソッド対応**: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- **動的パラメータ**: 入力ポートから動的にURL、ヘッダー、ボディを設定可能
- **レスポンス形式**: JSON, XML, Text, Binary の自動検出またはマニュアル指定

### 認証機能
- **Bearer Token**: Authorization ヘッダーに Bearer トークンを設定
- **API Key**: カスタムヘッダーまたはクエリパラメータでAPIキーを送信
- **Basic認証**: ユーザー名とパスワードによる基本認証
- **なし**: 認証不要のエンドポイント用

### 高度な機能
- **パスパラメータ**: URL内の `{param}` または `:param` 形式のパラメータを置換
- **クエリパラメータ**: URLにクエリパラメータを自動追加
- **リトライ機構**: 失敗時の自動リトライ（回数と遅延を設定可能）
- **タイムアウト**: リクエストのタイムアウト時間を設定可能
- **エラーハンドリング**: HTTPエラーステータスの適切な処理

## 入出力ポート

### 入力ポート
| ポート名 | 説明 | 型 |
|---------|------|-----|
| `url` | APIエンドポイントのURL（オプション、UIで設定も可） | string |
| `headers` | HTTPヘッダー（オプション） | object |
| `body` | リクエストボディ（オプション） | any |
| `query` | クエリパラメータ（オプション） | object |
| `path` | パスパラメータ（オプション） | object |

### 出力ポート
| ポート名 | 説明 | 型 |
|---------|------|-----|
| `output` | APIレスポンスのデータ | any |
| `error` | エラーメッセージ（エラー時のみ） | string |
| `response` | 完全なレスポンス情報（ステータス、ヘッダー等） | object |

## 使用例

### 1. 基本的なGETリクエスト
```javascript
// ノード設定
{
  url: "https://api.example.com/users",
  method: "GET"
}
```

### 2. 認証付きPOSTリクエスト
```javascript
// ノード設定
{
  url: "https://api.example.com/posts",
  method: "POST",
  authentication: {
    type: "bearer",
    token: "your-token-here"
  },
  bodyType: "json",
  body: JSON.stringify({
    title: "New Post",
    content: "Post content"
  })
}
```

### 3. パスパラメータとクエリパラメータの使用
```javascript
// ノード設定
{
  url: "https://api.example.com/users/{userId}/posts",
  method: "GET",
  pathParams: {
    userId: 123
  },
  queryParams: {
    limit: 10,
    sort: "date"
  }
}
// 結果のURL: https://api.example.com/users/123/posts?limit=10&sort=date
```

### 4. リトライ機能の設定
```javascript
// ノード設定
{
  url: "https://api.example.com/data",
  method: "GET",
  retryCount: 3,      // 3回まで再試行
  retryDelay: 2000,   // 2秒待機してから再試行
  timeout: 10000      // 10秒でタイムアウト
}
```

## UI設定ガイド

### 基本設定
1. **API URL**: 接続先のAPIエンドポイントURLを入力
2. **Method**: HTTPメソッドを選択（GET, POST等）

### 詳細設定（展開可能）
1. **Authentication**: 認証タイプを選択し、必要な情報を入力
2. **Headers**: JSON形式でカスタムヘッダーを設定
3. **Body Type & Content**: POSTやPUT時のボディ形式と内容を設定
4. **Response Type**: レスポンスの形式を指定（通常は自動検出で問題なし）
5. **Retry Settings**: リトライ回数と遅延時間を設定
6. **Timeout**: タイムアウト時間をミリ秒単位で設定

## エラー処理

ノードは以下のエラー状況を適切に処理します：

- **ネットワークエラー**: 接続失敗、タイムアウト
- **HTTPエラー**: 4xx, 5xx ステータスコード
- **パースエラー**: JSONやXMLの解析失敗
- **設定エラー**: 無効なURL、必須パラメータの欠落

エラー発生時は `error` ポートにエラーメッセージが出力され、`response` ポートに詳細情報が含まれます。

## ベストプラクティス

1. **認証情報の管理**: APIキーやトークンは環境変数や安全な場所に保管
2. **エラーハンドリング**: `error` ポートを別のノードに接続してエラー処理を実装
3. **レート制限**: APIのレート制限を考慮してリトライ設定を調整
4. **タイムアウト**: 適切なタイムアウト時間を設定（デフォルトは30秒）
5. **ログ確認**: 開発時はブラウザのコンソールでリクエスト詳細を確認

## トラブルシューティング

### よくある問題と解決方法

| 問題 | 原因 | 解決方法 |
|------|------|----------|
| CORS エラー | ブラウザのセキュリティ制限 | サーバー側でCORSを設定、またはプロキシを使用 |
| 認証失敗 | トークンの期限切れまたは誤り | 認証情報を確認・更新 |
| タイムアウト | レスポンスが遅い | タイムアウト時間を延長 |
| JSONパースエラー | レスポンスがJSON形式でない | Response Typeを適切に設定 |

## 技術仕様

- **実装ファイル**: `src/components/nodes/WebAPINode.js`
- **UIコンポーネント**: `src/components/ReactFlowEditor/nodes/WebAPINodeComponent.jsx`
- **ノードタイプ**: `web_api`
- **カテゴリ**: Web Integration
- **アイコン**: 🔌

## 更新履歴

- **v1.0.0** (2025-01-07): 初回リリース
  - 基本的なHTTPリクエスト機能
  - 複数の認証方式サポート
  - リトライ機能
  - 動的パラメータ対応