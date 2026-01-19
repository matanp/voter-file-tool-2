#!/bin/bash
# Verify project repository is set up (cloning is done in bootstrap)

set -e

PROJECT_DIR="/opt/voter-file-tool"

echo "📥 Verifying project repository..."

# Verify repository exists and is accessible
if [ ! -d "$PROJECT_DIR/.git" ]; then
  echo "❌ Repository not found at $PROJECT_DIR"
  echo "   This should have been cloned in the bootstrap script"
  exit 1
fi

cd "$PROJECT_DIR"

# Ensure we're on the latest code
echo "🔄 Ensuring latest code..."
git reset --hard HEAD || true
git pull origin main || echo "⚠️  Could not pull latest (may be on correct branch)"

echo "✅ Project repository verified"
