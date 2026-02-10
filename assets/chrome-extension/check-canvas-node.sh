#!/bin/bash
# Quick canvas node health check

echo "🔍 Checking Canvas Node Status..."
echo ""

# Check if openclaw is available
if ! command -v openclaw &> /dev/null; then
    echo "❌ OpenClaw CLI not found. Install it first: npm install -g openclaw"
    exit 1
fi

# List nodes and check for chrome-canvas
echo "📋 Connected Nodes:"
openclaw nodes list 2>/dev/null

echo ""
NODE_ID=$(openclaw nodes list --json 2>/dev/null | grep -o 'chrome-canvas-[a-f0-9-]*' | head -1)

if [ -z "$NODE_ID" ]; then
    echo "❌ No Chrome canvas node found!"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check extension is loaded in Chrome (chrome://extensions/)"
    echo "2. Verify canvas node is enabled in extension options"
    echo "3. Check Gateway is running: openclaw gateway status"
    echo "4. Check extension console for errors (chrome://extensions/ → Service Worker)"
    exit 1
fi

echo "✅ Chrome canvas node found: $NODE_ID"
echo ""

# Test canvas present
echo "🧪 Testing canvas present command..."
if openclaw nodes canvas present --node "$NODE_ID" --target "data:text/html,<h1>Canvas Node Test ✅</h1><p>If you see this, your canvas node is working!</p>" 2>/dev/null; then
    echo "✅ Canvas node is working! Check for a popup window."
else
    echo "❌ Canvas command failed. Check gateway logs."
    exit 1
fi

echo ""
echo "🎉 Canvas node is fully operational!"
