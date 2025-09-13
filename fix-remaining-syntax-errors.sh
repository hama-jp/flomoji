#!/bin/bash

echo "Fixing remaining syntax errors..."

# Fix switch statements with incorrect type annotations
echo "Fixing switch statements..."
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/switch (\([^:]*\): any)/switch (\1)/g' {} \;

# Fix select onChange handlers - should use HTMLSelectElement not HTMLInputElement
echo "Fixing select onChange handlers..."
find src -type f -name "*.tsx" -exec sed -i 's/<select\([^>]*\)onChange={(e: React.ChangeEvent<HTMLInputElement>)/<select\1onChange={(e: React.ChangeEvent<HTMLSelectElement>)/g' {} \;

# Fix textarea onChange handlers - should use HTMLTextAreaElement not HTMLInputElement  
echo "Fixing textarea onChange handlers..."
find src -type f -name "*.tsx" -exec sed -i 's/<textarea\([^>]*\)onChange={(e: React.ChangeEvent<HTMLInputElement>)/<textarea\1onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)/g' {} \;

echo "Syntax error fixes completed!"

# Count remaining errors
echo "Checking TypeScript errors..."
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l