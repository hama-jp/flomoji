#!/bin/bash

# TypeScript Migration Script for Flomoji Project
# This script helps automate the migration from JavaScript to TypeScript

echo "🚀 Starting TypeScript Migration for Flomoji Project"
echo "=================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter variables
total_files=0
migrated_files=0
skipped_files=0

# Function to migrate a JavaScript file to TypeScript
migrate_file() {
    local file="$1"
    local new_file=""
    
    # Determine the new file extension
    if [[ "$file" == *.jsx ]]; then
        new_file="${file%.jsx}.tsx"
    elif [[ "$file" == *.js ]]; then
        new_file="${file%.js}.ts"
    else
        echo -e "${YELLOW}Skipping non-JS file: $file${NC}"
        ((skipped_files++))
        return
    fi
    
    # Check if TypeScript version already exists
    if [ -f "$new_file" ]; then
        echo -e "${YELLOW}TypeScript version already exists: $new_file${NC}"
        ((skipped_files++))
        return
    fi
    
    # Rename the file
    echo -e "${GREEN}Migrating: $file -> $new_file${NC}"
    git mv "$file" "$new_file" 2>/dev/null || mv "$file" "$new_file"
    ((migrated_files++))
    
    # Add basic type annotations for common patterns (optional)
    # This is a simple sed replacement, actual type fixing will need manual work
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS sed syntax
        sed -i '' 's/export default function/export default function/g' "$new_file"
        sed -i '' 's/module.exports =/export default/g' "$new_file"
    else
        # Linux sed syntax
        sed -i 's/export default function/export default function/g' "$new_file"
        sed -i 's/module.exports =/export default/g' "$new_file"
    fi
}

# Function to migrate files in a directory
migrate_directory() {
    local dir="$1"
    local pattern="$2"
    
    echo -e "\n${YELLOW}Processing directory: $dir${NC}"
    
    while IFS= read -r file; do
        ((total_files++))
        migrate_file "$file"
    done < <(find "$dir" -type f \( -name "*.js" -o -name "*.jsx" \) ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/build/*" ! -path "*/.vite/*")
}

# Main migration process
echo -e "\n📊 Analyzing JavaScript files..."

# Count total files
total_js_files=$(find . -type f \( -name "*.js" -o -name "*.jsx" \) ! -path "./node_modules/*" ! -path "./dist/*" ! -path "./build/*" ! -path "./.vite/*" | wc -l)
echo -e "Found ${YELLOW}$total_js_files${NC} JavaScript files to migrate"

# Ask for confirmation
read -p "Do you want to proceed with the migration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Migration cancelled${NC}"
    exit 1
fi

# Create a backup branch
current_branch=$(git branch --show-current)
backup_branch="backup-before-ts-migration-$(date +%Y%m%d-%H%M%S)"
echo -e "\n📦 Creating backup branch: ${GREEN}$backup_branch${NC}"
git checkout -b "$backup_branch" 2>/dev/null && git checkout "$current_branch" 2>/dev/null

# Migrate different categories of files
echo -e "\n🔄 Starting migration..."

# 1. Migrate configuration files (but keep some as .js)
echo -e "\n${YELLOW}Step 1: Migrating configuration files...${NC}"
for file in vite.config.js eslint.config.js; do
    if [ -f "$file" ]; then
        echo -e "${YELLOW}Keeping $file as JavaScript (config file)${NC}"
        ((skipped_files++))
    fi
done

# 2. Migrate source files
echo -e "\n${YELLOW}Step 2: Migrating source files...${NC}"
migrate_directory "src"

# 3. Summary
echo -e "\n=================================================="
echo -e "📈 ${GREEN}Migration Summary${NC}"
echo -e "=================================================="
echo -e "Total files found:    ${total_files}"
echo -e "Files migrated:       ${GREEN}${migrated_files}${NC}"
echo -e "Files skipped:        ${YELLOW}${skipped_files}${NC}"

# Type checking
echo -e "\n🔍 Running TypeScript compiler check..."
pnpm tsc --noEmit 2>&1 | head -20

echo -e "\n✅ ${GREEN}Migration script completed!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Fix TypeScript errors shown above"
echo -e "2. Run: ${GREEN}pnpm typecheck${NC} to see all type errors"
echo -e "3. Run: ${GREEN}pnpm test${NC} to ensure tests still pass"
echo -e "4. Commit changes when ready"
echo -e "\nBackup branch created: ${GREEN}$backup_branch${NC}"