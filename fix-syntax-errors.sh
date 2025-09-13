#!/bin/bash

echo "🔧 Fixing Syntax Errors (Target: Under 500)"
echo "==========================================="

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

initial_errors=$(pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l)
echo -e "Initial errors: ${YELLOW}$initial_errors${NC}"

# Fix the syntax error pattern: onChange={(e: Type>)} => should be onChange={(e: Type>) =>
echo -e "\n${GREEN}Fixing onChange syntax errors...${NC}"
find src -name "*.tsx" | while read file; do
  # Fix the specific pattern with closing parenthesis in wrong place
  sed -i 's/onChange={(e: React\.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>)}/onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>)/g' "$file"
  
  # Fix shorter versions
  sed -i 's/onChange={(e: React\.ChangeEvent<HTMLInputElement>)}/onChange={(e: React.ChangeEvent<HTMLInputElement>)/g' "$file"
  sed -i 's/onChange={(e: React\.ChangeEvent<HTMLTextAreaElement>)}/onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)/g' "$file"
  sed -i 's/onChange={(e: React\.ChangeEvent<HTMLSelectElement>)}/onChange={(e: React.ChangeEvent<HTMLSelectElement>)/g' "$file"
  
  # Fix onKeyPress, onClick, etc.
  sed -i 's/onKeyPress={(e: React\.KeyboardEvent>)}/onKeyPress={(e: React.KeyboardEvent>)/g' "$file"
  sed -i 's/onClick={(e: React\.MouseEvent>)}/onClick={(e: React.MouseEvent>)/g' "$file"
done

# Fix arrow function syntax after the corrections
echo -e "\n${GREEN}Adding proper arrow function syntax...${NC}"
find src -name "*.tsx" | while read file; do
  # Add missing arrow for event handlers
  perl -i -pe 's/onChange=\{?\((e: React\.ChangeEvent<[^>]+>)\)([^=])/onChange={(e: React.ChangeEvent<HTMLInputElement>) =>$2/g' "$file"
  
  # Fix specific cases
  sed -i 's/onChange={(e: React\.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>)} =>/onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>/g' "$file"
done

# Remove duplicate closing braces
echo -e "\n${GREEN}Removing duplicate braces...${NC}"
find src -name "*.tsx" | while read file; do
  # Fix double closing braces at end of onChange
  perl -i -pe 's/\}\}\}/}}/g' "$file"
done

# Special fix for specific components
echo -e "\n${GREEN}Fixing specific component issues...${NC}"

# Fix ChatView.tsx
if [ -f "src/components/ChatView.tsx" ]; then
  sed -i 's/onChange={(e: React\.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>)} => setInputValue/onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue/g' src/components/ChatView.tsx
fi

# Fix Layout.tsx
if [ -f "src/components/Layout.tsx" ]; then
  # Fix all onChange handlers in Layout
  sed -i 's/onChange={(e: React\.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>)} =>/onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>/g' src/components/Layout.tsx
fi

# Fix SettingsView.tsx
if [ -f "src/components/SettingsView.tsx" ]; then
  sed -i 's/onChange={(e: React\.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>)} =>/onChange={(e: React.ChangeEvent<HTMLInputElement>) =>/g' src/components/SettingsView.tsx
fi

# Fix HTTPRequestNodeComponent.tsx
if [ -f "src/components/ReactFlowEditor/nodes/HTTPRequestNodeComponent.tsx" ]; then
  sed -i 's/onChange={(e: React\.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>)} =>/onChange={(e: React.ChangeEvent<HTMLInputElement>) =>/g' src/components/ReactFlowEditor/nodes/HTTPRequestNodeComponent.tsx
fi

# Count final errors
echo -e "\n${GREEN}Running final type check...${NC}"
final_errors=$(pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l)
reduction=$((initial_errors - final_errors))

echo -e "\n==========================================="
echo -e "Initial errors: ${YELLOW}$initial_errors${NC}"
echo -e "Final errors: ${YELLOW}$final_errors${NC}"
echo -e "Errors fixed: ${GREEN}$reduction${NC}"

if [ $final_errors -lt 500 ]; then
  echo -e "\n${GREEN}🎉 GOAL ACHIEVED! Under 500 errors!${NC}"
  echo -e "Final count: ${GREEN}$final_errors${NC} errors"
elif [ $final_errors -lt 550 ]; then
  echo -e "\n${GREEN}Almost there! Just ${YELLOW}$((final_errors - 499))${NC} more errors to fix.${NC}"
else
  echo -e "\n${YELLOW}Progress made. Continue fixing.${NC}"
fi