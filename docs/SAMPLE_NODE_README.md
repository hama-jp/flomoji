# サンプルノード実装例

## UpperCaseNode

テンプレートを使用して作成したサンプルノードです。文字列を大文字に変換する簡単な機能を実装しています。

### ファイル構成

1. **ノード定義**: `src/components/nodes/UpperCaseNode.js`
   - 大文字変換ロジック
   - オプション: プレフィックス追加、空白削除
   - メタデータ出力（文字数、特殊文字の有無など）

2. **UIコンポーネント**: `src/components/ReactFlowEditor/nodes/UpperCaseNodeComponent.jsx`
   - デフォルトテキスト入力
   - プレフィックス設定
   - 空白削除オプション
   - 設定状態の表示

### サンプルノードを有効にする方法

このサンプルノードをテストしたい場合は、以下の手順で有効化できます：

#### 1. `src/components/nodes/index.js` に追加

```javascript
// インポートを追加
import UpperCaseNode from './UpperCaseNode.js';

// nodeTypesに追加
export const nodeTypes = {
  // ... 既存のノード
  uppercase: UpperCaseNode,
};

// nodesByCategoryの'text-processing'に追加
'text-processing': {
  name: 'Text Processing', 
  nodes: {
    text_combiner: TextCombinerNode,
    uppercase: UpperCaseNode  // 追加
  }
},

// nodeTypesListに追加
export const nodeTypesList = [
  // ... 既存のノード
  'uppercase'
];
```

#### 2. `src/components/ReactFlowEditor/index.jsx` に追加

```javascript
// インポートを追加
import UpperCaseNodeComponent from './nodes/UpperCaseNodeComponent';

// nodeTypesに追加
const nodeTypes = {
  // ... 既存のノード
  uppercase: UpperCaseNodeComponent,
};
```

### 使用例

1. ノードパレットから「Text Processing」カテゴリを開く
2. 「Upper Case」ノードをドラッグ＆ドロップ
3. 入力ノードと接続
4. オプションを設定:
   - プレフィックス追加
   - 前後の空白削除
5. ワークフローを実行

### 入出力例

**入力**: `"  hello world  "`

**設定**:
- addPrefix: true
- prefix: "RESULT: "
- trimSpaces: true

**出力**: `"RESULT: HELLO WORLD"`

**メタデータ**:
```json
{
  "originalLength": 14,
  "resultLength": 19,
  "hasNumbers": false,
  "hasSpecialChars": false
}
```

### 学習ポイント

このサンプルノードから学べること：

1. **基本的なノード構造**
   - 入力/出力ポートの定義
   - データ処理ロジック
   - エラーハンドリング

2. **UI要素の使用**
   - Switch（トグル）
   - Input（テキスト入力）
   - Textarea（複数行入力）
   - Badge（状態表示）

3. **データフロー**
   - 入力ポートからのデータ受信
   - デフォルト値の処理
   - 複数の出力ポート（output, metadata, error）

4. **オプション設定**
   - 条件付きUI表示
   - 設定の永続化
   - リアルタイム更新

### カスタマイズのヒント

このサンプルを基に、以下のような機能を追加できます：

- 小文字変換モード
- キャメルケース/スネークケース変換
- 文字数制限
- 正規表現による置換
- 複数の変換を連鎖

### 注意事項

このサンプルノードは学習目的で作成されています。本番環境で使用する場合は、以下を考慮してください：

- エラーハンドリングの強化
- パフォーマンスの最適化
- 国際化対応
- アクセシビリティ対応
- 単体テストの追加