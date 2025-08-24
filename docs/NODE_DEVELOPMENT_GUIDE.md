# ノード開発ガイド

## 概要
flomojiのノードは2つのファイルで構成されています：
1. **ノード定義ファイル** (`src/components/nodes/XXXNode.js`) - ビジネスロジック
2. **UIコンポーネント** (`src/components/ReactFlowEditor/nodes/XXXNodeComponent.jsx`) - UI表示

## クイックスタート

### 1. テンプレートをコピー

```bash
# ノード定義ファイル
cp src/components/nodes/TemplateNode.js.template src/components/nodes/MyCustomNode.js

# UIコンポーネント
cp src/components/ReactFlowEditor/nodes/TemplateNodeComponent.jsx.template \
   src/components/ReactFlowEditor/nodes/MyCustomNodeComponent.jsx
```

### 2. プレースホルダーを置換

以下のプレースホルダーを実際の値に置換：
- `%%NODE_NAME%%` → `MyCustom`
- `%%ICON%%` → `🎯`（お好みの絵文字）
- `%%COLOR%%` → `purple`（利用可能な色は下記参照）
- `%%COLOR_GRADIENT%%` → `bg-gradient-to-br from-purple-400 to-purple-600 text-white`

### 3. ノードを登録

#### `src/components/nodes/index.js` に追加：

```javascript
// インポートを追加
import MyCustomNode from './MyCustomNode.js';

// nodeTypesに追加
export const nodeTypes = {
  // ... 既存のノード
  my_custom: MyCustomNode,
};

// nodesByCategoryに追加
export const nodesByCategory = {
  // ... 既存のカテゴリ
  'custom': {  // または既存のカテゴリに追加
    name: 'Custom Nodes',
    nodes: {
      my_custom: MyCustomNode
    }
  }
};

// nodeTypesListに追加
export const nodeTypesList = [
  // ... 既存のノード
  'my_custom'
];
```

#### `src/components/ReactFlowEditor/index.jsx` に追加：

```javascript
// インポートを追加
import MyCustomNodeComponent from './nodes/MyCustomNodeComponent';

// nodeTypesに追加
const nodeTypes = {
  // ... 既存のノード
  my_custom: MyCustomNodeComponent,
};
```

## ノード定義の詳細

### 基本構造

```javascript
export const MyCustomNode = createNodeDefinition(
  'My Custom Node',    // 表示名
  '🎯',               // アイコン
  'purple',           // 色
  ['input1', 'input2'], // 入力ポート
  ['output', 'error'],  // 出力ポート
  {                     // デフォルト設定
    setting1: 'default',
    setting2: 100
  },
  executeMyCustomNode,  // 実行関数
  {                     // メタデータ
    description: 'カスタムノードの説明',
    category: 'custom'
  }
);
```

### 実行関数

```javascript
export async function executeMyCustomNode(data, inputs) {
  // data: UIで設定された値
  // inputs: 入力ポートから受け取った値
  
  const { setting1, setting2 } = data;
  const inputValue = inputs.input1 || data.defaultValue;
  
  try {
    // 処理ロジック
    const result = await processData(inputValue, setting1, setting2);
    
    // 成功時の戻り値
    return {
      output: result,
      error: null
    };
  } catch (error) {
    // エラー時の戻り値
    return {
      output: null,
      error: error.message
    };
  }
}
```

## UIコンポーネントの詳細

### 基本構造

```javascript
const MyCustomNodeComponent = memo(({ data = {}, id }) => {
  const updateNodeData = useReactFlowStore(state => state.updateNodeData);
  
  const updateData = (field, value) => {
    updateNodeData(id, { [field]: value });
  };
  
  const nodeDataWithHandles = {
    ...data,
    label: 'My Custom Node',
    icon: '🎯',
    inputs: [
      { name: 'input1', id: 'input1' },
      { name: 'input2', id: 'input2' }
    ],
    outputs: [
      { name: 'output', id: 'output' },
      { name: 'error', id: 'error' }
    ],
    colorClass: 'bg-gradient-to-br from-purple-400 to-purple-600 text-white'
  };
  
  return (
    <CustomNode data={nodeDataWithHandles} id={id}>
      {/* UIコンポーネント */}
    </CustomNode>
  );
});
```

### 利用可能なUI要素

テンプレートファイルには以下のUI要素の例が含まれています：

- **Input** - テキスト入力
- **Textarea** - 複数行テキスト
- **Select** - ドロップダウン選択
- **Switch** - オン/オフ切り替え
- **Checkbox** - チェックボックス
- **RadioGroup** - ラジオボタン
- **Slider** - スライダー
- **Collapsible** - 折りたたみ可能なセクション
- **Badge** - ステータス表示
- **Alert** - 警告・情報表示

### ドラッグ防止

入力要素には `nodrag` クラスを追加して、ノードのドラッグを防止：

```javascript
<Input className="nodrag" />
<Textarea className="nodrag" />
```

## 利用可能な色

NODE_COLORS (types.js)で定義されている色：
- `orange` - オレンジ
- `blue` - ブルー
- `green` - グリーン
- `teal` - ティール
- `pink` - ピンク
- `purple` - パープル
- `amber` - アンバー
- `cyan` - シアン

## カテゴリ

ノードを適切なカテゴリに配置：
- `input-output` - 入出力
- `ai` - AI生成
- `text-processing` - テキスト処理
- `control-flow` - 制御フロー
- `variables` - 変数
- `web-integration` - Web統合

## ベストプラクティス

### 1. エラーハンドリング
```javascript
if (!inputData) {
  throw new Error('入力データが必要です');
}
```

### 2. デフォルト値
```javascript
const { 
  setting = 'default',
  timeout = 30000 
} = data;
```

### 3. 非同期処理
```javascript
export async function executeNode(data, inputs) {
  try {
    const result = await fetchData();
    return { output: result, error: null };
  } catch (error) {
    return { output: null, error: error.message };
  }
}
```

### 4. 状態管理
```javascript
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
```

### 5. デバッグログ
```javascript
console.log('Node execution:', { data, inputs });
```

## 実装例

実際の実装例は以下のファイルを参考：

- **シンプルなノード**: `InputNode.js` / `InputNodeComponent.jsx`
- **API呼び出し**: `HTTPRequestNode.js` / `HTTPRequestNodeComponent.jsx`
- **複雑なUI**: `WebSearchNode.js` / `WebSearchNodeComponent.jsx`
- **制御フロー**: `IfNode.js` / `IfNodeComponent.jsx`

## テスト

新しいノードを作成したら、以下をテスト：

1. **ノードの配置**: パレットから配置できるか
2. **接続**: 他のノードと接続できるか
3. **データ保存**: 設定が保存されるか
4. **実行**: 正しく実行されるか
5. **エラー処理**: エラーが適切に処理されるか

## トラブルシューティング

### ノードが表示されない
- `index.js` への登録を確認
- `ReactFlowEditor/index.jsx` への登録を確認
- 開発サーバーの再起動

### ハンドルが表示されない
- `nodeDataWithHandles` の `inputs`/`outputs` 配列を確認
- `CustomNode` コンポーネントに正しく渡されているか確認

### データが保存されない
- `updateNodeData` が正しく呼ばれているか確認
- `nodrag` クラスが入力要素に設定されているか確認

## サポート

質問や問題がある場合は、既存のノード実装を参考にするか、Issueを作成してください。