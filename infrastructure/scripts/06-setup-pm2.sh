#!/bin/bash
# Install and configure pm2 for process management
# Note: This script is designed to be sourced by 00-setup-all.sh
# nvm and npm should already be available in the environment

set -e

# Verify npm is available (safety check - should already be loaded by master script)
if ! command -v npm &> /dev/null; then
  echo "❌ npm is not available. This script should be sourced by 00-setup-all.sh"
  exit 1
fi

echo "🔧 Setting up pm2..."

# Install pm2 globally
npm install -g pm2

# Create logs directory
mkdir -p /opt/voter-file-tool/apps/report-server/logs

# Ensure start.sh wrapper script is executable
if [ -f /opt/voter-file-tool/apps/report-server/start.sh ]; then
  chmod +x /opt/voter-file-tool/apps/report-server/start.sh
  echo "✅ start.sh wrapper script is executable"
else
  echo "⚠️  start.sh wrapper script not found (will be created from repo)"
fi

# Save pm2 process list
pm2 save || true

# Setup pm2 to start on boot
# The startup command generates a systemd service that runs as the current user
# This ensures PM2 processes have access to the user's nvm installation
STARTUP_OUTPUT=$(pm2 startup 2>&1 | grep -v PM2 || true)
if [ -n "$STARTUP_OUTPUT" ]; then
  echo "📋 PM2 startup command output:"
  echo "$STARTUP_OUTPUT"
  # Note: The user may need to run the generated command manually if sudo is required
fi

echo "✅ pm2 installed and configured successfully"
