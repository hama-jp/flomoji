#!/bin/bash

echo "Fixing node component parameter types..."

# Fix common parameter patterns in node components
find src/components/ReactFlowEditor/nodes -name "*.tsx" -type f | while read file; do
  echo "Processing $file..."
  
  # Fix handleChange patterns: (field, value) => 
  sed -i 's/handleChange(\([^,]*\), \([^)]*\))/handleChange(\1: string, \2: any)/g' "$file"
  sed -i 's/const handleChange = (\([^,]*\), \([^)]*\))/const handleChange = (\1: string, \2: any)/g' "$file"
  
  # Fix event handlers: (e) =>
  sed -i 's/onChange={(e)/onChange={(e: React.ChangeEvent<HTMLInputElement>)/g' "$file"
  sed -i 's/onChange={(e: React.ChangeEvent<HTMLInputElement>: React.ChangeEvent<HTMLInputElement>)/onChange={(e: React.ChangeEvent<HTMLInputElement>)/g' "$file"
  sed -i 's/onClick={(e)/onClick={(e: React.MouseEvent)/g' "$file"
  sed -i 's/onKeyPress={(e)/onKeyPress={(e: React.KeyboardEvent)/g' "$file"
  
  # Fix checkbox onChange: (checked) =>
  sed -i 's/onCheckedChange={(checked)/onCheckedChange={(checked: boolean)/g' "$file"
  
  # Fix select onChange: (value) =>
  sed -i 's/onValueChange={(value)/onValueChange={(value: string)/g' "$file"
  
  # Fix textarea onChange
  sed -i 's/onChange={(e: React.ChangeEvent<HTMLInputElement>)/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)/g' src/components/ReactFlowEditor/nodes/*TextAreaElement*
  
done

echo "Node component type fixes completed!"

# Count remaining errors
echo "Checking TypeScript errors..."
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l