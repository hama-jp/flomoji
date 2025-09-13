#!/bin/bash

# Fix TS7006 errors in node components

# Fix CodeExecutionNodeComponent.tsx
sed -i 's/const updateData = (field, value)/const updateData = (field: string, value: any)/' src/components/ReactFlowEditor/nodes/CodeExecutionNodeComponent.tsx
sed -i 's/const handleLanguageChange = (value)/const handleLanguageChange = (value: string)/' src/components/ReactFlowEditor/nodes/CodeExecutionNodeComponent.tsx
sed -i 's/onChange={(e)/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)/' src/components/ReactFlowEditor/nodes/CodeExecutionNodeComponent.tsx
sed -i 's/onCheckedChange={(e)/onCheckedChange={(e: boolean)/' src/components/ReactFlowEditor/nodes/CodeExecutionNodeComponent.tsx

# Fix CustomNode.tsx  
sed -i 's/\.map((input)/\.map((input: any)/' src/components/ReactFlowEditor/nodes/CustomNode.tsx
sed -i 's/\.map((output)/\.map((output: any)/' src/components/ReactFlowEditor/nodes/CustomNode.tsx

# Fix HTTPRequestNodeComponent.tsx
sed -i 's/const updateData = (field, value)/const updateData = (field: string, value: any)/' src/components/ReactFlowEditor/nodes/HTTPRequestNodeComponent.tsx
sed -i 's/const handleMethodChange = (value)/const handleMethodChange = (value: string)/' src/components/ReactFlowEditor/nodes/HTTPRequestNodeComponent.tsx
sed -i 's/const handleTemplateToggle = (checked)/const handleTemplateToggle = (checked: boolean)/' src/components/ReactFlowEditor/nodes/HTTPRequestNodeComponent.tsx
sed -i 's/const handleTemplateChange = (value)/const handleTemplateChange = (value: string)/' src/components/ReactFlowEditor/nodes/HTTPRequestNodeComponent.tsx
sed -i 's/const getMethodColor = (method)/const getMethodColor = (method: string)/' src/components/ReactFlowEditor/nodes/HTTPRequestNodeComponent.tsx

echo "Fixed TS7006 errors in node components"
