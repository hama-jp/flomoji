#!/bin/bash

echo "Fixing UI component syntax errors..."

# Revert the problematic changes from the previous script
# The issue is that we added type annotations directly in destructuring patterns
# which is invalid TypeScript syntax

# Fix all UI components
find src/components/ui -name "*.tsx" -type f | while read file; do
  echo "Fixing $file..."
  
  # Remove inline type annotations from destructuring patterns
  sed -i 's/{ className?: string,/{ className,/g' "$file"
  sed -i 's/{ children?: React.ReactNode,/{ children,/g' "$file"
  sed -i 's/{ variant?: string,/{ variant,/g' "$file"
  sed -i 's/{ asChild?: boolean,/{ asChild,/g' "$file"
  
  # Fix standalone patterns  
  sed -i 's/{ className?: string }/{ className }/g' "$file"
  sed -i 's/{ children?: React.ReactNode }/{ children }/g' "$file"
  sed -i 's/{ variant?: string }/{ variant }/g' "$file"
  sed -i 's/{ asChild?: boolean }/{ asChild }/g' "$file"
  
  # Fix multiple props on same line
  sed -i 's/{ className?: string, children?: React.ReactNode/{ className, children/g' "$file"
done

echo "UI syntax fixes completed!"

# Count remaining errors
echo "Checking TypeScript errors..."
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l