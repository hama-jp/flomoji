#!/bin/bash

echo "🔧 Fixing common TypeScript errors automatically..."

# Fix implicit any in function parameters
echo "Fixing implicit any parameters..."
find src -name "*.tsx" -o -name "*.ts" | while read file; do
  # Fix event handlers
  sed -i 's/onChange: (e)/onChange: (e: React.ChangeEvent<HTMLInputElement>)/g' "$file"
  sed -i 's/onClick: (e)/onClick: (e: React.MouseEvent)/g' "$file"
  
  # Add React import if missing
  if ! grep -q "import.*React" "$file" && grep -q "React\." "$file"; then
    sed -i '1i import React from "react";' "$file"
  fi
done

# Fix common UI component props
echo "Fixing UI component props..."
find src/components -name "*.tsx" | while read file; do
  # Add default empty string for className when missing
  sed -i 's/<Card>/<Card className="">/g' "$file"
  sed -i 's/<CardHeader>/<CardHeader className="">/g' "$file"
  sed -i 's/<CardContent>/<CardContent className="">/g' "$file"
  sed -i 's/<CardTitle>/<CardTitle className="">/g' "$file"
  sed -i 's/<CardDescription>/<CardDescription className="">/g' "$file"
  
  # Fix Button variant and size props
  sed -i 's/variant: "outline"/variant: "outline" as const/g' "$file"
  sed -i 's/variant: "default"/variant: "default" as const/g' "$file"
  sed -i 's/variant: "ghost"/variant: "ghost" as const/g' "$file"
  sed -i 's/variant: "destructive"/variant: "destructive" as const/g' "$file"
  sed -i 's/size: "sm"/size: "sm" as const/g' "$file"
  sed -i 's/size: "icon"/size: "icon" as const/g' "$file"
  
  # Fix Input type prop
  sed -i 's/<Input placeholder/<Input className="" type="text" placeholder/g' "$file"
done

echo "✅ Automatic fixes applied. Running type check..."
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l