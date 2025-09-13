#!/bin/bash

echo "Fixing more parameter types in node components..."

# Fix UpperCaseNodeComponent.tsx
sed -i 's/const updateData = (field, value)/const updateData = (field: string, value: any)/' src/components/ReactFlowEditor/nodes/UpperCaseNodeComponent.tsx

# Fix VariableSetNodeComponent.tsx  
sed -i 's/onChange={(evt)/onChange={(evt: React.ChangeEvent<HTMLInputElement>)/' src/components/ReactFlowEditor/nodes/VariableSetNodeComponent.tsx
sed -i 's/onValueChange={(evt)/onValueChange={(evt: string)/' src/components/ReactFlowEditor/nodes/VariableSetNodeComponent.tsx

# Fix WebAPINodeComponent.tsx
sed -i 's/const updateField = (field, value)/const updateField = (field: string, value: any)/' src/components/ReactFlowEditor/nodes/WebAPINodeComponent.tsx
sed -i 's/const addHeader = (field, value)/const addHeader = (field: string, value: any)/' src/components/ReactFlowEditor/nodes/WebAPINodeComponent.tsx
sed -i 's/\.map((input)/\.map((input: any)/' src/components/ReactFlowEditor/nodes/WebAPINodeComponent.tsx

# Fix TextCombinerNodeComponent.tsx
sed -i 's/onChange={(e)/onChange={(e: React.ChangeEvent<HTMLInputElement>)/' src/components/ReactFlowEditor/nodes/TextCombinerNodeComponent.tsx
sed -i 's/onValueChange={(value)/onValueChange={(value: string)/' src/components/ReactFlowEditor/nodes/TextCombinerNodeComponent.tsx

# Fix WhileNodeComponent.tsx
sed -i 's/onChange={(e)/onChange={(e: React.ChangeEvent<HTMLInputElement>)/' src/components/ReactFlowEditor/nodes/WhileNodeComponent.tsx

# Fix WebSearchNodeComponent.tsx
sed -i 's/onChange={(e)/onChange={(e: React.ChangeEvent<HTMLInputElement>)/' src/components/ReactFlowEditor/nodes/WebSearchNodeComponent.tsx
sed -i 's/onValueChange={(value)/onValueChange={(value: string)/' src/components/ReactFlowEditor/nodes/WebSearchNodeComponent.tsx

# Fix OutputNodeComponent.tsx
sed -i 's/onChange={(e)/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)/' src/components/ReactFlowEditor/nodes/OutputNodeComponent.tsx

echo "Fixed more parameter types"
