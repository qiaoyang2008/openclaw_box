#!/bin/bash
# Launch Chrome with OpenClaw extension (Browser Relay + Canvas Node)
# This creates a separate Chrome instance with the extension pre-loaded

set -e

EXTENSION_DIR="/Users/qiaoyang/Desktop/work/openclaw/assets/chrome-extension"
USER_DATA_DIR="/tmp/chrome-openclaw-dev"

echo "🚀 Launching Chrome with OpenClaw extension..."
echo ""
echo "Extension: $EXTENSION_DIR"
echo "Profile: $USER_DATA_DIR"
echo ""

# Kill any existing instance using this profile
pkill -f "chrome.*$USER_DATA_DIR" 2>/dev/null || true
sleep 1

# Launch Chrome
open -na "Google Chrome" --args \
  --load-extension="$EXTENSION_DIR" \
  --user-data-dir="$USER_DATA_DIR" \
  --no-first-run \
  --no-default-browser-check

echo "✅ Chrome launched!"
echo ""
echo "📝 Next steps:"
echo "1. Check extension is loaded at chrome://extensions/"
echo "2. Click 'Service Worker' to see connection logs"
echo "3. Run: pnpm openclaw nodes list"
echo ""
