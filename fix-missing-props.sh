#!/bin/bash

echo "Fixing missing props in UI components..."

# Fix Button components missing className
echo "Fixing Button components..."
find src -name "*.tsx" -exec sed -i 's/<Button\s\+variant=/<Button className="" variant=/g' {} \;
find src -name "*.tsx" -exec sed -i 's/<Button\s\+size=/<Button className="" size=/g' {} \;
find src -name "*.tsx" -exec sed -i 's/<Button\s\+children=/<Button className="" children=/g' {} \;

# Add missing size prop to Buttons that have variant but no size
perl -i -pe 's/<Button(\s+[^>]*variant[^>]*)>/<Button$1 size={"default" as const}>/g if !/size=/s' src/**/*.tsx

# Fix Input components missing type
echo "Fixing Input components..."
find src -name "*.tsx" -exec sed -i 's/<Input\s\+value=/<Input type="text" value=/g' {} \;
find src -name "*.tsx" -exec sed -i 's/<Input\s\+placeholder=/<Input type="text" placeholder=/g' {} \;
find src -name "*.tsx" -exec sed -i 's/<Input\s\+onChange=/<Input type="text" onChange=/g' {} \;

# Fix Alert components missing variant
echo "Fixing Alert components..."
find src -name "*.tsx" -exec sed -i 's/<Alert\s\+className=/<Alert variant={"default" as const} className=/g' {} \;

# Fix Badge components missing variant
echo "Fixing Badge components..."
perl -i -pe 's/<Badge(\s+[^>]*)>/<Badge$1 variant={"default" as const}>/g if !/variant=/s' src/**/*.tsx

# Fix TabsTrigger missing className
echo "Fixing TabsTrigger components..."
perl -i -pe 's/<TabsTrigger(\s+[^>]*)>/<TabsTrigger$1 className="">/g if !/className=/s' src/**/*.tsx

# Fix DropdownMenuItem missing className
echo "Fixing DropdownMenuItem components..."
perl -i -pe 's/<DropdownMenuItem(\s+[^>]*)>/<DropdownMenuItem$1 className="">/g if !/className=/s' src/**/*.tsx

# Fix Checkbox missing className
echo "Fixing Checkbox components..."
perl -i -pe 's/<Checkbox(\s+[^>]*)>/<Checkbox$1 className="">/g if !/className=/s' src/**/*.tsx

echo "Missing props fixes completed!"

# Count remaining errors
echo "Checking TypeScript errors..."
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l