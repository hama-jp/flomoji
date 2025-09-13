#!/bin/bash

echo "Fixing incorrect if conditions with type annotations..."

# Fix all if conditions with incorrect type annotations
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/if (\([^:]*\): any)/if (\1)/g' {} \;

echo "If condition fixes completed!"

# Count remaining errors
echo "Checking TypeScript errors..."
pnpm tsc --noEmit 2>&1 | tail -1