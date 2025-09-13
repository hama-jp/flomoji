#!/bin/bash

echo "Fixing UI component type definitions..."

# Fix components with className and other common props
find src/components/ui -name "*.tsx" -type f | while read file; do
  echo "Processing $file..."
  
  # Add type annotations for common props patterns
  # Pattern: { className, ...props } → { className?: string, ...props }
  sed -i 's/{ className,/{ className?: string,/g' "$file"
  
  # Pattern: { className } → { className?: string }
  sed -i 's/{ className }/{ className?: string }/g' "$file"
  
  # Pattern: { children, ...props } → { children?: React.ReactNode, ...props }
  sed -i 's/{ children,/{ children?: React.ReactNode,/g' "$file"
  
  # Pattern: { children } → { children?: React.ReactNode }
  sed -i 's/{ children }/{ children?: React.ReactNode }/g' "$file"
  
  # Pattern: { variant, ...props } → { variant?: string, ...props }
  sed -i 's/{ variant,/{ variant?: string,/g' "$file"
  
  # Fix multiple props on same line
  sed -i 's/{ className, children/{ className?: string, children?: React.ReactNode/g' "$file"
  
  # Fix asChild prop
  sed -i 's/{ asChild }/{ asChild?: boolean }/g' "$file"
  sed -i 's/{ asChild,/{ asChild?: boolean,/g' "$file"
done

echo "UI component type fixes completed!"

# Count remaining errors
echo "Checking TypeScript errors..."
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l