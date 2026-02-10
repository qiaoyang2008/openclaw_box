#!/bin/bash
# Script to extract and display the OpenClaw gateway token after rebuild

CONFIG_FILE="${HOME}/.openclaw/openclaw.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Config file not found at $CONFIG_FILE"
    exit 1
fi

# Extract token using jq if available, otherwise use grep
if command -v jq &> /dev/null; then
    TOKEN=$(jq -r '.gateway.auth.token // empty' "$CONFIG_FILE")
else
    TOKEN=$(grep -o '"token"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | sed 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
fi

if [ -z "$TOKEN" ]; then
    echo "Error: Token not found in config file"
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                    OpenClaw Gateway Token                          ║"
echo "╠════════════════════════════════════════════════════════════════════╣"
echo "║                                                                    ║"
echo "║  $TOKEN  ║"
echo "║                                                                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "To update VSCode Control UI:"
echo "1. Open VSCode Settings (Cmd+,)"
echo "2. Search for 'openclaw gateway token'"
echo "3. Paste the token above"
echo ""
echo "Or update ~/.claude/config.json directly:"
echo "  \"gateway\": {"
echo "    \"token\": \"$TOKEN\""
echo "  }"
