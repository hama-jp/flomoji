#!/bin/bash

echo "Fixing final type errors..."

# Fix ApiKeysSettings parameter types
sed -i 's/const saveApiKey = (id, keyData)/const saveApiKey = (id: string, keyData: any)/g' src/components/ApiKeysSettings.tsx
sed -i 's/const deleteApiKey = (id)/const deleteApiKey = (id: string)/g' src/components/ApiKeysSettings.tsx
sed -i 's/const getProviderIcon = (provider)/const getProviderIcon = (provider: string)/g' src/components/ApiKeysSettings.tsx
sed -i 's/const getProviderColor = (provider)/const getProviderColor = (provider: string)/g' src/components/ApiKeysSettings.tsx

# Fix Button components missing className props
sed -i 's/<Button\s*variant={/{<Button className="" variant={/g' src/components/ApiKeysSettings.tsx
sed -i 's/<Badge\s*variant=/<Badge className="" variant=/g' src/components/ApiKeysSettings.tsx

# Fix Input components missing props
sed -i 's/<Input\s*placeholder=/<Input className="" type="text" placeholder=/g' src/components/ApiKeysSettings.tsx

# Fix AlertDescription missing className
sed -i 's/<AlertDescription>/<AlertDescription className="">/g' src/components/ApiKeysSettings.tsx

# Remove duplicate Button variant/className attributes
perl -i -pe 's/<Button\s+className=""\s+className="[^"]*"/<Button className=""/g' src/components/ApiKeysSettings.tsx

echo "Type error fixes completed!"

# Count remaining errors
echo "Checking TypeScript errors..."
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l