#!/bin/bash

echo "Fixing node component prop types..."

# Create a common type definition for node props
for file in src/components/ReactFlowEditor/nodes/*NodeComponent.tsx; do
  if grep -q "memo(({" "$file"; then
    # Add proper type annotation for props
    sed -i 's/memo(({ data = {}, id })/memo(({ data = {}, id }: { data?: any; id: string })/' "$file"
  fi
done

echo "Fixed node component prop types"
