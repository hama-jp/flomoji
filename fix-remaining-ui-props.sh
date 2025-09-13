#!/bin/bash

echo "Fixing remaining UI component props..."

# Fix Button components still missing className
echo "Fixing remaining Button components..."
perl -i -pe 's/<Button\s+(?!.*className)/<Button className="" /g' src/**/*.tsx

# Fix Input components still missing className or type
echo "Fixing remaining Input components..."
perl -i -pe 's/<Input\s+(?!.*className)/<Input className="" /g' src/**/*.tsx
perl -i -pe 's/<Input\s+(?!.*type)/<Input type="text" /g' src/**/*.tsx

# Fix missing component props in specific files
echo "Fixing ChatView component..."
sed -i 's/<Input\s*value=/<Input type="text" value=/g' src/components/ChatView.tsx
sed -i 's/<Button\s*onClick=/<Button className="" variant={"default" as const} onClick=/g' src/components/ChatView.tsx
sed -i 's/<Button\s*disabled=/<Button className="" variant={"default" as const} disabled=/g' src/components/ChatView.tsx

# Fix ApiKeysSettings missing props
echo "Fixing ApiKeysSettings component..."
sed -i 's/<Button\s*variant=/<Button className="" variant=/g' src/components/ApiKeysSettings.tsx
sed -i 's/<Input\s*placeholder=/<Input className="" type="text" placeholder=/g' src/components/ApiKeysSettings.tsx

# Fix DataView state type issues
echo "Fixing DataView state types..."
sed -i 's/const \[chatHistory, setChatHistory\] = useState(\[\])/const [chatHistory, setChatHistory] = useState<any[]>([])/g' src/components/DataView.tsx
sed -i 's/const \[workflowData, setWorkflowData\] = useState(\[\])/const [workflowData, setWorkflowData] = useState<any[]>([])/g' src/components/DataView.tsx

# Fix ChatView state types
echo "Fixing ChatView state types..."
sed -i 's/const \[messages, setMessages\] = useState(\[\])/const [messages, setMessages] = useState<any[]>([])/g' src/components/ChatView.tsx
sed -i 's/const messagesEndRef = useRef()/const messagesEndRef = useRef<HTMLDivElement>(null)/g' src/components/ChatView.tsx

echo "Remaining UI props fixes completed!"

# Count remaining errors
echo "Checking TypeScript errors..."
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l