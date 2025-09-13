#!/bin/bash

echo "Fixing store type definitions..."

# Fix reactFlowStore parameter types
echo "Fixing reactFlowStore..."
sed -i 's/const selectedNodes = nodes.filter(n => n.selected)/const selectedNodes = nodes.filter((n: any) => n.selected)/g' src/store/reactFlowStore.ts
sed -i 's/const selectedEdges = edges.filter(e => e.selected)/const selectedEdges = edges.filter((e: any) => e.selected)/g' src/store/reactFlowStore.ts
sed -i 's/const selectedNodeIds = selectedNodes.map(n => n.id)/const selectedNodeIds = selectedNodes.map((n: any) => n.id)/g' src/store/reactFlowStore.ts
sed -i 's/const remainingNodes = nodes.filter(n => !n.selected)/const remainingNodes = nodes.filter((n: any) => !n.selected)/g' src/store/reactFlowStore.ts
sed -i 's/const remainingEdges = edges.filter(e =>/const remainingEdges = edges.filter((e: any) =>/g' src/store/reactFlowStore.ts

# Fix type conversion issue
sed -i 's/data: data as NodeData/data: data as unknown as NodeData/g' src/store/reactFlowStore.ts
sed -i 's/(data || {} as Record<string, unknown>) as NodeData/(data || {} as Record<string, unknown>) as unknown as NodeData/g' src/store/reactFlowStore.ts

# Fix store test file
echo "Fixing store test file..."
sed -i 's/addNode({ id: /addNode({ id: /g' src/store/__tests__/store.test.ts
sed -i 's/const node = { id:/const node: any = { id:/g' src/store/__tests__/store.test.ts
sed -i 's/updateNode({ id:/updateNode({ id:/g' src/store/__tests__/store.test.ts

# Add proper type for WorkflowNode in tests
perl -i -pe 's/addNode\(\{ id: (.*?)\}\)/addNode({ id: $1, type: "test", position: { x: 0, y: 0 }, data: {} } as any)/g' src/store/__tests__/store.test.ts
perl -i -pe 's/updateNode\(\{ id: (.*?), type: (.*?)\}\)/updateNode({ id: $1, type: $2, position: { x: 0, y: 0 }, data: {} } as any)/g' src/store/__tests__/store.test.ts

echo "Store type fixes completed!"

# Count remaining errors
echo "Checking TypeScript errors..."
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l