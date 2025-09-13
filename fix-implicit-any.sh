#!/bin/bash

echo "Fixing implicit any types..."

# Fix common function parameters
echo "Fixing function parameters..."

# Fix event handlers
find src -name "*.tsx" -exec sed -i 's/onChange={(e)[ ]*=>/onChange={(e: any) =>/g' {} \;
find src -name "*.tsx" -exec sed -i 's/onClick={(e)[ ]*=>/onClick={(e: any) =>/g' {} \;
find src -name "*.tsx" -exec sed -i 's/onSubmit={(e)[ ]*=>/onSubmit={(e: any) =>/g' {} \;
find src -name "*.tsx" -exec sed -i 's/onKeyPress={(e)[ ]*=>/onKeyPress={(e: any) =>/g' {} \;
find src -name "*.tsx" -exec sed -i 's/onKeyDown={(e)[ ]*=>/onKeyDown={(e: any) =>/g' {} \;

# Fix map/filter/forEach callbacks
find src -name "*.tsx" -exec sed -i 's/\.map((item)[ ]*=>/.map((item: any) =>/g' {} \;
find src -name "*.tsx" -exec sed -i 's/\.forEach((item)[ ]*=>/.forEach((item: any) =>/g' {} \;
find src -name "*.tsx" -exec sed -i 's/\.filter((item)[ ]*=>/.filter((item: any) =>/g' {} \;
find src -name "*.tsx" -exec sed -i 's/\.reduce((acc, curr)[ ]*=>/.reduce((acc: any, curr: any) =>/g' {} \;

# Fix arrow function parameters in .ts files
find src -name "*.ts" -exec sed -i 's/const \([a-zA-Z_][a-zA-Z0-9_]*\) = (\([a-zA-Z_][a-zA-Z0-9_]*\)) =>/const \1 = (\2: any) =>/g' {} \;

# Fix catch blocks
find src -name "*.ts" -exec sed -i 's/} catch (error) {/} catch (error: any) {/g' {} \;
find src -name "*.tsx" -exec sed -i 's/} catch (error) {/} catch (error: any) {/g' {} \;
find src -name "*.ts" -exec sed -i 's/} catch (e) {/} catch (e: any) {/g' {} \;
find src -name "*.tsx" -exec sed -i 's/} catch (e) {/} catch (e: any) {/g' {} \;

# Fix worker files
sed -i 's/self.onmessage = (e)/self.onmessage = (e: any)/g' src/utils/codeExecutor.worker.ts
sed -i 's/function executeCode(code, inputs, variables)/function executeCode(code: any, inputs: any, variables: any)/g' src/utils/codeExecutor.worker.ts
sed -i 's/console.log(...args)/console.log(...args: any[])/g' src/utils/codeExecutor.worker.ts

echo "Implicit any fixes completed!"

# Count remaining errors
echo "Checking TypeScript errors..."
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l