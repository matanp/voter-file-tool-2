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

# Copy ecosystem config (will be done by Terraform)
# The ecosystem.config.js will be copied to /opt/voter-file-tool/apps/report-server/

# Save pm2 process list
pm2 save || true

# Setup pm2 to start on boot
pm2 startup | grep -v PM2 || true

echo "✅ pm2 installed and configured successfully"
