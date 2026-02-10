#!/bin/bash
# Enable development mode for OpenClaw Gateway to auto-approve local nodes

echo "🔧 Configuring OpenClaw Gateway for Development Mode"
echo "===================================================="
echo ""

# Navigate to openclaw root
OPENCLAW_ROOT="/Users/qiaoyang/Desktop/work/openclaw"
cd "$OPENCLAW_ROOT" || {
    echo "❌ Failed to navigate to $OPENCLAW_ROOT"
    exit 1
}

# Detect available package manager/runtime
if command -v pnpm &> /dev/null; then
    CMD="pnpm openclaw"
elif command -v bun &> /dev/null; then
    CMD="bun run openclaw"
elif command -v npx &> /dev/null && command -v tsx &> /dev/null; then
    CMD="npx tsx src/cli/index.ts"
else
    echo "❌ No suitable package manager found"
    echo "Please install pnpm, bun, or npm first"
    exit 1
fi

echo "Using: $CMD"
echo ""

# Check for config file
CONFIG_DIR="$HOME/.openclaw"
CONFIG_FILE="$CONFIG_DIR/openclaw.yml"

echo "📁 Config location: $CONFIG_FILE"
echo ""

# Create config directory if it doesn't exist
mkdir -p "$CONFIG_DIR"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "📝 Creating new config file..."
    cat > "$CONFIG_FILE" << 'EOF'
# OpenClaw Development Configuration
gateway:
  nodes:
    # DEVELOPMENT ONLY: Auto-approve node connections from localhost
    # This allows the Chrome extension to connect without authentication
    # WARNING: Only use this in development environments!
    dangerouslyAllowLocalWithoutAuth: true
EOF
    echo "✅ Config file created"
else
    echo "📝 Config file already exists"
    echo ""

    # Check if the setting already exists
    if grep -q "dangerouslyAllowLocalWithoutAuth" "$CONFIG_FILE"; then
        echo "⚠️  Setting already exists in config"
        echo ""
        echo "Current setting:"
        grep -A 1 "dangerouslyAllowLocalWithoutAuth" "$CONFIG_FILE"
    else
        echo "➕ Adding development mode setting..."

        # Add the setting to the config file
        if grep -q "gateway:" "$CONFIG_FILE"; then
            # gateway section exists, add nodes section
            if grep -q "nodes:" "$CONFIG_FILE"; then
                # nodes section exists, add the setting
                sed -i.bak '/nodes:/a\    dangerouslyAllowLocalWithoutAuth: true' "$CONFIG_FILE"
            else
                # Add nodes section under gateway
                sed -i.bak '/gateway:/a\  nodes:\n    dangerouslyAllowLocalWithoutAuth: true' "$CONFIG_FILE"
            fi
        else
            # No gateway section, append to end
            cat >> "$CONFIG_FILE" << 'EOF'

gateway:
  nodes:
    dangerouslyAllowLocalWithoutAuth: true
EOF
        fi

        echo "✅ Setting added"
    fi
fi

echo ""
echo "📖 Configuration Summary:"
echo "========================"
echo ""
echo "Setting: gateway.nodes.dangerouslyAllowLocalWithoutAuth = true"
echo ""
echo "This allows nodes connecting from localhost (127.0.0.1) to skip"
echo "authentication requirements during the connection handshake."
echo ""
echo "⚠️  WARNING: This is for DEVELOPMENT ONLY!"
echo "   Do not use this setting in production environments."
echo ""
echo "✅ Next steps:"
echo ""
echo "1. Restart the Gateway:"
echo "   $CMD gateway"
echo ""
echo "2. Load the Chrome extension (chrome://extensions/)"
echo ""
echo "3. Check canvas node status:"
echo "   $CMD nodes list"
echo ""
echo "The Chrome extension should now connect automatically!"
echo ""
