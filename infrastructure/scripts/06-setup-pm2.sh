#!/bin/bash
# Install and configure pm2 for process management

set -e

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
