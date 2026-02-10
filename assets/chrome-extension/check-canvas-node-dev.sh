#!/bin/bash
# Quick canvas node health check for local OpenClaw development

echo "🔍 Checking Canvas Node Status (Dev Mode)..."
echo ""

# Navigate to openclaw root
OPENCLAW_ROOT="/Users/qiaoyang/Desktop/work/openclaw"
cd "$OPENCLAW_ROOT" || {
    echo "❌ Failed to navigate to $OPENCLAW_ROOT"
    exit 1
}
echo "Working directory: $(pwd)"
echo ""

# Detect available package manager/runtime
if command -v pnpm &> /dev/null; then
    CMD="pnpm openclaw"
elif command -v bun &> /dev/null; then
    CMD="bun run openclaw"
elif command -v npx &> /dev/null && command -v tsx &> /dev/null; then
    CMD="npx tsx src/cli/index.ts"
elif command -v npm &> /dev/null; then
    # OpenClaw requires pnpm for building - install it if not available
    echo "⚠️  pnpm not found. OpenClaw requires pnpm to build."
    echo "📦 Installing pnpm globally..."
    npm install -g pnpm

    if command -v pnpm &> /dev/null; then
        echo "✅ pnpm installed successfully!"
        CMD="pnpm openclaw"
    else
        echo "❌ Failed to install pnpm"
        exit 1
    fi
else
    echo "❌ No suitable package manager found"
    echo "Please install npm, pnpm, or bun first"
    exit 1
fi

echo "Using: $CMD"
echo ""

# Check if we can run openclaw from source
if [ ! -f "package.json" ]; then
    echo "❌ Not in OpenClaw repository root"
    exit 1
fi

# Check if node_modules exists, install if missing
echo "Checking for node_modules in $(pwd)..."
if [ ! -d "node_modules" ]; then
    echo "📦 node_modules not found. Installing dependencies with: pnpm install"
    echo "This will take a few minutes..."
    echo ""
    pnpm install
    INSTALL_STATUS=$?
    if [ $INSTALL_STATUS -ne 0 ]; then
        echo "❌ Failed to install dependencies (exit code: $INSTALL_STATUS)"
        exit 1
    fi
    echo ""
    echo "✅ Dependencies installed successfully!"
    echo ""
else
    echo "✅ node_modules found"
    echo ""
fi

echo "📋 Checking for connected nodes..."
echo ""

# Try to list nodes
NODE_OUTPUT=$($CMD nodes list 2>&1)
NODE_STATUS=$?

if [ $NODE_STATUS -ne 0 ]; then
    echo "❌ Failed to connect to Gateway"
    echo ""
    echo "Error output:"
    echo "$NODE_OUTPUT"
    echo ""
    echo "Troubleshooting:"
    echo "1. Start the gateway: $CMD gateway"
    echo "2. Check if port 18789 is in use: lsof -i :18789"
    echo "3. Load the Chrome extension (chrome://extensions/)"
    exit 1
fi

echo "$NODE_OUTPUT"
echo ""

# Check for chrome-canvas node
NODE_ID=$($CMD nodes list --json 2>/dev/null | grep -o 'chrome-canvas-[a-f0-9-]*' | head -1)

if [ -z "$NODE_ID" ]; then
    echo "❌ No Chrome canvas node found!"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Load extension in Chrome (chrome://extensions/)"
    echo "   - Enable Developer mode"
    echo "   - Click 'Load unpacked'"
    echo "   - Select: $OPENCLAW_ROOT/assets/chrome-extension"
    echo ""
    echo "2. Open extension options and verify:"
    echo "   - Canvas Node is enabled (checkbox)"
    echo "   - Gateway port is 18789"
    echo ""
    echo "3. Check extension console:"
    echo "   chrome://extensions/ → Service Worker"
    echo "   Look for: [Canvas Node] Connected to Gateway successfully"
    echo ""
    echo "4. Verify gateway is running:"
    echo "   $CMD gateway status"
    exit 1
fi

echo "✅ Chrome canvas node found: $NODE_ID"
echo ""

# Test canvas present
echo "🧪 Testing canvas present command..."
TEST_HTML="data:text/html,<html><head><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:linear-gradient(135deg,%23667eea%200%25,%23764ba2%20100%25);color:white;text-align:center}</style></head><body><div><h1 style='font-size:3em;margin:0'>✅</h1><h2 style='margin:0.5em%200'>Canvas Node Working!</h2><p style='opacity:0.7;font-size:0.9em'>Node: $NODE_ID</p></div></body></html>"

if $CMD nodes canvas present --node "$NODE_ID" --target "$TEST_HTML" 2>/dev/null; then
    echo "✅ Canvas node is working! Check for a popup window with a gradient background."
    echo ""
    echo "🎉 Canvas node is fully operational!"
    echo ""
    echo "Try these commands:"
    echo "  $CMD nodes canvas present --node $NODE_ID --target https://example.com"
    echo "  $CMD nodes canvas snapshot --node $NODE_ID --format jpg"
    echo "  $CMD nodes canvas navigate https://github.com --node $NODE_ID"
else
    echo "❌ Canvas command failed."
    echo "Check the extension console for errors."
    exit 1
fi
