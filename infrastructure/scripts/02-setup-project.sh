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

# Fix ownership if needed (in case directory was created with sudo)
# Use SSH_USER from master script if available, otherwise fall back to whoami
ACTUAL_USER="${SSH_USER:-$(whoami)}"
echo "📋 Setting ownership to: $ACTUAL_USER"
sudo chown -R $ACTUAL_USER:$ACTUAL_USER "$PROJECT_DIR" 2>/dev/null || true

# Configure git safe directory (fixes "dubious ownership" error)
git config --global --add safe.directory "$PROJECT_DIR" 2>/dev/null || true

# Ensure we're on the latest code
echo "🔄 Ensuring latest code..."
git reset --hard HEAD || true
git pull origin main || echo "⚠️  Could not pull latest (may be on correct branch)"

echo "✅ Project repository verified"
