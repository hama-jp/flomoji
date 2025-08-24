# 🔧 ノード開発ガイド

このガイドでは、flomoji に新しいワークフローノードを追加する方法を詳しく説明します。

> 📌 **新しいノード開発ガイド**: テンプレートを使った簡単な開発方法については、[NODE_DEVELOPMENT_GUIDE.md](./NODE_DEVELOPMENT_GUIDE.md) を参照してください。

## 📚 基本概念

### ノードとは？
ノードはワークフローの基本構成要素で、特定の処理を実行する独立したユニットです。
各ノードは入力を受け取り、処理を実行し、出力を生成します。

### ノードの構成要素

```javascript
{
  // 識別情報
  id: 'unique-node-id',
  type: 'node-type',
  
  // 位置とサイズ
  position: { x: 100, y: 200 },
  size: { width: 200, height: 150 },
  
  // ノード固有のデータ
  data: {
    label: 'ノード名',
    // タイプ固有のプロパティ
  }
}
```

## 🎯 ステップバイステップガイド

### Step 1: ノードファイルの作成

`src/components/nodes/` ディレクトリに新しいファイルを作成します。

```javascript
// src/components/nodes/MyCustomNode.js
import { createNodeDefinition } from './types.js'

// ノードの実行ロジック
async function executeMyCustomNode(node, inputs, context) {
  // inputs: 入力ポートから受け取ったデータ
  // context: 実行コンテキスト（変数など）
  
  const inputValue = inputs.input || ''
  
  // ノード固有の処理
  const result = processData(inputValue, node.data)
  
  // 結果を返す
  return result
}

// ノード定義
export const MyCustomNode = createNodeDefinition(
  'カスタムノード',     // 表示名
  '🎯',                // アイコン
  'purple',            // 色
  ['input'],           // 入力ポート
  ['output'],          // 出力ポート
  {                    // デフォルトデータ
    setting1: 'default',
    setting2: true
  },
  executeMyCustomNode, // 実行関数
  {                    // メタデータ
    description: 'カスタム処理を実行します',
    category: 'custom'
  }
)

export default MyCustomNode
```

### Step 2: ノードの登録

`src/components/nodes/index.js` にエクスポートを追加：

```javascript
// 既存のインポート
import InputNode from './InputNode.js'
import OutputNode from './OutputNode.js'
// ...

// 新しいノードをインポート
import MyCustomNode from './MyCustomNode.js'

// エクスポートに追加
export const nodeTypes = {
  input: InputNode,
  output: OutputNode,
  // ...
  myCustom: MyCustomNode  // 追加
}
```

### Step 3: UIプロパティパネルの追加（オプション）

複雑な設定UIが必要な場合、`src/components/Layout.jsx` のNodePropertiesPanelに追加：

```jsx
{selectedNode?.type === 'myCustom' && (
  <div className="space-y-4">
    <div>
      <Label>設定1</Label>
      <Input
        value={selectedNode.data.setting1 || ''}
        onChange={(e) => updateNodeData(selectedNode.id, {
          ...selectedNode.data,
          setting1: e.target.value
        })}
      />
    </div>
    <div>
      <Label>
        <input
          type="checkbox"
          checked={selectedNode.data.setting2}
          onChange={(e) => updateNodeData(selectedNode.id, {
            ...selectedNode.data,
            setting2: e.target.checked
          })}
        />
        設定2を有効化
      </Label>
    </div>
  </div>
)}
```

## 🎨 実装例

### 例1: シンプルなテキスト処理ノード

```javascript
// TextUpperCaseNode.js
import { createNodeDefinition } from './types.js'

async function executeTextUpperCase(node, inputs) {
  const text = inputs.input || ''
  return text.toUpperCase()
}

export const TextUpperCaseNode = createNodeDefinition(
  '大文字変換',
  '🔠',
  'blue',
  ['input'],
  ['output'],
  {},
  executeTextUpperCase,
  {
    description: 'テキストを大文字に変換します',
    category: 'text-processing'
  }
)
```

### 例2: 条件分岐ノード

```javascript
// ConditionalNode.js
import { createNodeDefinition } from './types.js'

async function executeConditional(node, inputs, context) {
  const condition = evaluateCondition(
    node.data.condition,
    inputs,
    context
  )
  
  // 条件に応じて異なるポートに出力
  return {
    true: condition ? inputs.input : null,
    false: !condition ? inputs.input : null
  }
}

export const ConditionalNode = createNodeDefinition(
  '条件分岐',
  '🔀',
  'yellow',
  ['input'],
  ['true', 'false'],  // 複数の出力ポート
  {
    condition: '',
    operator: '==',
    value: ''
  },
  executeConditional,
  {
    description: '条件に基づいて処理を分岐します',
    category: 'control-flow'
  }
)
```

### 例3: API呼び出しノード

```javascript
// APICallNode.js
import { createNodeDefinition } from './types.js'

async function executeAPICall(node, inputs) {
  const { url, method, headers } = node.data
  const body = inputs.input
  
  try {
    const response = await fetch(url, {
      method: method || 'GET',
      headers: headers ? JSON.parse(headers) : {},
      body: method !== 'GET' ? JSON.stringify(body) : undefined
    })
    
    const data = await response.json()
    return data
  } catch (error) {
    throw new Error(`API呼び出しエラー: ${error.message}`)
  }
}

export const APICallNode = createNodeDefinition(
  'API呼び出し',
  '🌐',
  'green',
  ['input'],
  ['output', 'error'],
  {
    url: '',
    method: 'GET',
    headers: '{}'
  },
  executeAPICall,
  {
    description: '外部APIを呼び出します',
    category: 'integration'
  }
)
```

## 🔌 ポートシステム (React Flow)

### 入力ポート
- ノードが受け取るデータの接続点
- 複数の入力ポートを定義可能
- React Flowの`targetHandle`でポートを識別
- 名前付きポートで特定のデータを受け取る

### 出力ポート
- ノードが生成するデータの接続点
- React Flowの`sourceHandle`でポートを識別
- 複数の出力ポートで分岐処理が可能
- 条件に応じた出力の振り分け

### ポートの命名規則
```javascript
// 単一ポート (React Flow handle: '0')
['input'] / ['output']

// 複数ポート (React Flow handle: '0', '1', ...)
['input1', 'input2'] / ['success', 'error']

// 特殊ポート（ループ用）
['input', 'loop'] / ['output', 'loop']
```

**React Flow でのポートマッピング**:
- ポートのインデックスが`sourceHandle`/`targetHandle`に対応
- 例: `['input1', 'input2']` → handle '0', '1'

## 🎯 高度な機能

### 変数の操作

```javascript
async function executeWithVariables(node, inputs, context) {
  // 変数の読み取り
  const currentValue = context.variables[node.data.variableName]
  
  // 変数の設定
  context.variables[node.data.variableName] = newValue
  
  return result
}
```

### ストリーミング対応

```javascript
async function* executeStreaming(node, inputs, context) {
  const chunks = await getDataChunks(inputs)
  
  for await (const chunk of chunks) {
    // チャンクごとに結果を生成
    yield processChunk(chunk)
  }
}
```

### エラーハンドリング

```javascript
async function executeWithErrorHandling(node, inputs, context) {
  try {
    const result = await riskyOperation(inputs)
    return { success: result }
  } catch (error) {
    // エラーを適切に処理
    console.error(`Node ${node.id} error:`, error)
    
    // エラーポートに出力
    return { error: error.message }
  }
}
```

## 🧪 テストの作成

```javascript
// MyCustomNode.test.js
import { describe, it, expect } from 'vitest'
import MyCustomNode from './MyCustomNode'

describe('MyCustomNode', () => {
  it('should process input correctly', async () => {
    const node = {
      id: 'test-node',
      type: 'myCustom',
      data: {
        setting1: 'test'
      }
    }
    
    const inputs = { input: 'test data' }
    const context = { variables: {} }
    
    const result = await MyCustomNode.execute(node, inputs, context)
    
    expect(result).toBe('expected output')
  })
  
  it('should handle edge cases', async () => {
    // エッジケースのテスト
  })
})
```

## 📋 チェックリスト

新しいノードを追加する際の確認事項：

- [ ] ノードファイルを作成した
- [ ] `createNodeDefinition` を使用して定義した
- [ ] 実行関数を実装した
- [ ] `index.js` にエクスポートを追加した
- [ ] React Flow エディターでテストした
- [ ] 必要に応じてUIパネルを追加した
- [ ] エラーハンドリングを実装した
- [ ] テストを作成した
- [ ] ドキュメントを更新した

## 💡 ベストプラクティス

### 1. 単一責任の原則
各ノードは一つの明確な目的を持つべきです。

### 2. エラーハンドリング
予期しない入力に対して適切にエラー処理を行います。

### 3. デフォルト値
すべての設定にはデフォルト値を提供します。

### 4. 型の一貫性
入出力の型を一貫させ、予測可能な動作を保証します。

### 5. パフォーマンス
大量のデータを扱う場合は、ストリーミングやチャンク処理を検討します。

## 🚨 よくある間違い

### 1. 非同期処理の忘れ
```javascript
// ❌ 間違い
function executeNode(node, inputs) {
  fetch(url).then(...)  // Promiseを返していない
}

// ✅ 正しい
async function executeNode(node, inputs) {
  return await fetch(url)
}
```

### 2. コンテキストの変更忘れ
```javascript
// ❌ 間違い
context.variables.myVar = value  // 直接変更

// ✅ 正しい
context.variables = {
  ...context.variables,
  myVar: value
}
```

### 3. エラーの握りつぶし
```javascript
// ❌ 間違い
try {
  // 処理
} catch (error) {
  // 何もしない
}

// ✅ 正しい
try {
  // 処理
} catch (error) {
  console.error('Node error:', error)
  throw new Error(`処理失敗: ${error.message}`)
}
```

## 📚 参考リソース

- [types.js](../src/components/nodes/types.js) - ノード定義の型情報
- [nodeExecutionService.js](../src/services/nodeExecutionService.js) - 実行エンジンの実装
- [既存ノードの実装](../src/components/nodes/) - 実装例
- [React Flow ドキュメント](https://reactflow.dev/) - React Flow 公式ドキュメント

---

質問がある場合は、GitHubのIssuesまたはDiscussionsでお気軽にお問い合わせください。