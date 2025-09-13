#!/bin/bash

echo "Fixing duplicate attributes..."

# Fix duplicate className attributes
echo "Fixing duplicate className attributes..."
perl -i -pe 's/className="[^"]*"\s+className="[^"]*"/className=""/g' src/**/*.tsx
perl -i -pe 's/className=""\s+className="[^"]*"/className=""/g' src/**/*.tsx

# Fix duplicate type attributes in Input components
echo "Fixing duplicate type attributes..."
perl -i -pe 's/type="[^"]*"\s+type="[^"]*"/type="text"/g' src/**/*.tsx

# Fix specific issues in components
echo "Fixing specific component issues..."

# Fix Badge with duplicate className
sed -i 's/<Badge className="" variant={.*} className=/<Badge className=/g' src/**/*.tsx

# Fix Button with duplicate className
sed -i 's/<Button className=""\s*className=/<Button className=/g' src/**/*.tsx

# Fix Input with duplicate type or className
sed -i 's/<Input type="text" className=""\s*className=/<Input type="text" className=/g' src/**/*.tsx
sed -i 's/<Input className=""\s*className=/<Input className=/g' src/**/*.tsx

echo "Duplicate attributes fixes completed!"

# Count remaining errors
echo "Checking TypeScript errors..."
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l