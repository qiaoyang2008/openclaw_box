#!/bin/bash
# Diagnostic script for Chrome canvas node extension

echo "🔍 Canvas Node Extension Diagnostics"
echo "===================================="
echo ""

# Check if Chrome is running
if pgrep -x "Google Chrome" > /dev/null; then
    echo "✅ Chrome is running"
else
    echo "⚠️  Chrome is not running - please start Chrome first"
    echo ""
    exit 1
fi

echo ""
echo "📋 Extension Location:"
echo "   /Users/qiaoyang/Desktop/work/openclaw/assets/chrome-extension"
echo ""

# Check if extension files exist
echo "📁 Checking extension files..."
EXTENSION_DIR="/Users/qiaoyang/Desktop/work/openclaw/assets/chrome-extension"

if [ ! -f "$EXTENSION_DIR/manifest.json" ]; then
    echo "❌ manifest.json not found!"
    exit 1
fi

if [ ! -f "$EXTENSION_DIR/background.js" ]; then
    echo "❌ background.js not found!"
    exit 1
fi

if [ ! -f "$EXTENSION_DIR/canvas-node.js" ]; then
    echo "❌ canvas-node.js not found!"
    exit 1
fi

echo "✅ All required files present"
echo ""

# Check manifest.json for syntax errors
echo "🔍 Validating manifest.json..."
if python3 -m json.tool "$EXTENSION_DIR/manifest.json" > /dev/null 2>&1; then
    echo "✅ manifest.json is valid JSON"
else
    echo "❌ manifest.json has syntax errors!"
    exit 1
fi

echo ""
echo "📖 Next Steps:"
echo ""
echo "1. Open Chrome and go to: chrome://extensions/"
echo ""
echo "2. Make sure 'Developer mode' is ON (toggle in top-right)"
echo ""
echo "3. Click 'Load unpacked' button"
echo ""
echo "4. Navigate to and select:"
echo "   $EXTENSION_DIR"
echo ""
echo "5. After loading, click 'Service Worker' link under the extension"
echo ""
echo "6. Look for this message in the console:"
echo "   [Canvas Node] Connected to Gateway successfully ✅"
echo ""
echo "Would you like me to open Chrome to the extensions page? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "Opening chrome://extensions/ ..."
    open -a "Google Chrome" "chrome://extensions/"
fi
