#!/bin/bash
# Script to rebuild Docker image and restart container, then display new token

set -e

echo "🔨 Building Docker image (this may take several minutes)..."
docker build --no-cache --progress=plain -t openclaw:local .

echo ""
echo "🔄 Recreating container..."
docker-compose up -d --force-recreate openclaw-gateway

echo ""
echo "⏳ Waiting for gateway to start..."
sleep 3

echo ""
echo "✅ Rebuild complete!"
echo ""

# Display the token
$(dirname "$0")/get-token.sh

echo ""
echo "🌐 Gateway is running at http://127.0.0.1:18789"
echo "🔌 Extension relay at http://127.0.0.1:18792"
