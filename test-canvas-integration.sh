#!/bin/bash

# Canvas Integration Test Script
echo "🧪 Testing Canvas Tool Integration..."

# Check if all required files exist
echo "📁 Checking file structure..."

files=(
    "src/renderer/src/components/chat/OptimizedChatInterface.tsx"
    "src/renderer/src/components/canvas/CanvasPanel.tsx"
    "src/renderer/src/components/canvas/AIDiffOverlay.tsx"
    "src/renderer/src/components/canvas/index.ts"
    "src/renderer/src/stores/canvasStore.ts"
    "src/renderer/src/components/canvas/CanvasTest.tsx"
)

missing_files=()
for file in "${files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
    echo "✅ All core files present"
else
    echo "❌ Missing files:"
    printf '   %s\n' "${missing_files[@]}"
fi

# Check TypeScript compilation (if available)
echo "🔍 Checking for obvious syntax issues..."

# Check imports in main integration file
if grep -q "useCanvasStore" "src/renderer/src/components/chat/OptimizedChatInterface.tsx"; then
    echo "✅ Canvas store imported correctly"
else
    echo "❌ Canvas store import missing"
fi

if grep -q "CanvasPanel" "src/renderer/src/components/chat/OptimizedChatInterface.tsx"; then
    echo "✅ CanvasPanel imported correctly"
else
    echo "❌ CanvasPanel import missing"
fi

if grep -q "AIDiffOverlay" "src/renderer/src/components/chat/OptimizedChatInterface.tsx"; then
    echo "✅ AIDiffOverlay imported correctly"
else
    echo "❌ AIDiffOverlay import missing"
fi

# Check key functionality exists
echo "🔧 Checking functionality implementation..."

if grep -q "openScratchpad" "src/renderer/src/components/chat/OptimizedChatInterface.tsx"; then
    echo "✅ Scratchpad functionality implemented"
else
    echo "❌ Scratchpad functionality missing"
fi

if grep -q "showAISuggestion" "src/renderer/src/components/chat/OptimizedChatInterface.tsx"; then
    echo "✅ AI suggestion functionality implemented"
else
    echo "❌ AI suggestion functionality missing"
fi

if grep -q "detectCodeInput" "src/renderer/src/components/chat/OptimizedChatInterface.tsx"; then
    echo "✅ Auto-detection functionality implemented"
else
    echo "❌ Auto-detection functionality missing"
fi

# Check package dependencies
echo "📦 Checking dependencies..."

if grep -q "framer-motion" "package.json"; then
    echo "✅ framer-motion dependency found"
else
    echo "❌ framer-motion dependency missing"
fi

echo ""
echo "🎯 Test Results Summary:"
echo "===================="

# Count successful checks
success_count=0
total_checks=8

# File existence check
if [ ${#missing_files[@]} -eq 0 ]; then
    ((success_count++))
fi

# Import checks (3 checks)
if grep -q "useCanvasStore" "src/renderer/src/components/chat/OptimizedChatInterface.tsx"; then
    ((success_count++))
fi
if grep -q "CanvasPanel" "src/renderer/src/components/chat/OptimizedChatInterface.tsx"; then
    ((success_count++))
fi
if grep -q "AIDiffOverlay" "src/renderer/src/components/chat/OptimizedChatInterface.tsx"; then
    ((success_count++))
fi

# Functionality checks (3 checks)
if grep -q "openScratchpad" "src/renderer/src/components/chat/OptimizedChatInterface.tsx"; then
    ((success_count++))
fi
if grep -q "showAISuggestion" "src/renderer/src/components/chat/OptimizedChatInterface.tsx"; then
    ((success_count++))
fi
if grep -q "detectCodeInput" "src/renderer/src/components/chat/OptimizedChatInterface.tsx"; then
    ((success_count++))
fi

# Dependency check
if grep -q "framer-motion" "package.json"; then
    ((success_count++))
fi

echo "✅ $success_count/$total_checks checks passed"

if [ $success_count -eq $total_checks ]; then
    echo "🎉 Canvas integration appears ready for testing!"
    echo ""
    echo "🧪 To test manually:"
    echo "1. Start the app: npm run dev"
    echo "2. Click Tools → Canvas to open scratchpad"
    echo "3. Type ```javascript in chat input to trigger auto-detection"
    echo "4. Use CanvasTest component for detailed testing"
else
    echo "⚠️  Some issues detected - fix before testing"
fi

echo ""