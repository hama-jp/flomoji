#!/bin/bash

echo "Fixing parameter types in node components..."

# Fix CodeExecutionNodeComponent.tsx
sed -i 's/handlePresetChange = (value)/handlePresetChange = (value: string)/' src/components/ReactFlowEditor/nodes/CodeExecutionNodeComponent.tsx
sed -i 's/setCodeTheme(e)/setCodeTheme(e: string)/' src/components/ReactFlowEditor/nodes/CodeExecutionNodeComponent.tsx
sed -i 's/setShowAdvanced(e)/setShowAdvanced(e: boolean)/' src/components/ReactFlowEditor/nodes/CodeExecutionNodeComponent.tsx

# Fix CustomNode.tsx
sed -i 's/\.map((input))/\.map((input: any))/' src/components/ReactFlowEditor/nodes/CustomNode.tsx
sed -i 's/\.map((output))/\.map((output: any))/' src/components/ReactFlowEditor/nodes/CustomNode.tsx

# Fix IfNodeComponent.tsx
sed -i 's/onChange={(evt)/onChange={(evt: React.ChangeEvent<HTMLInputElement>)/' src/components/ReactFlowEditor/nodes/IfNodeComponent.tsx

# Fix InputNodeComponent.tsx
sed -i 's/onChange={(evt)/onChange={(evt: React.ChangeEvent<HTMLTextAreaElement>)/' src/components/ReactFlowEditor/nodes/InputNodeComponent.tsx

# Fix LLMNodeComponent.tsx
sed -i 's/onChange={(evt)/onChange={(evt: React.ChangeEvent<HTMLTextAreaElement>)/' src/components/ReactFlowEditor/nodes/LLMNodeComponent.tsx

# Fix ScheduleNodeComponent.tsx
sed -i 's/onValueChange={(evt)/onValueChange={(evt: string)/' src/components/ReactFlowEditor/nodes/ScheduleNodeComponent.tsx
sed -i 's/onChange={(evt)/onChange={(evt: React.ChangeEvent<HTMLInputElement>)/' src/components/ReactFlowEditor/nodes/ScheduleNodeComponent.tsx
sed -i 's/onCheckedChange={(checked)/onCheckedChange={(checked: boolean)/' src/components/ReactFlowEditor/nodes/ScheduleNodeComponent.tsx

# Fix TextNodeComponent.tsx
sed -i 's/onChange={(evt)/onChange={(evt: React.ChangeEvent<HTMLTextAreaElement>)/' src/components/ReactFlowEditor/nodes/TextNodeComponent.tsx

# Fix TimestampNodeComponent.tsx
sed -i 's/onChange={(evt)/onChange={(evt: React.ChangeEvent<HTMLInputElement>)/' src/components/ReactFlowEditor/nodes/TimestampNodeComponent.tsx
sed -i 's/onValueChange={(value)/onValueChange={(value: string)/' src/components/ReactFlowEditor/nodes/TimestampNodeComponent.tsx

echo "Fixed parameter types in node components"
