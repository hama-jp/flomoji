#!/bin/bash

echo "Fixing double arrow (=> =>) syntax errors..."

# Fix all double arrow patterns in TypeScript/React files
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/=> =>/=>/g' {} \;

echo "Double arrow fixes completed!"

# Count remaining errors
echo "Checking TypeScript errors..."
pnpm tsc --noEmit 2>&1 | tail -1