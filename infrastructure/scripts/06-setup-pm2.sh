#!/bin/bash
# Install and configure pm2 for process management
# Note: This script is designed to be sourced by 00-setup-all.sh
# nvm and npm should already be available in the environment

set -e

# Get SSH user from master script if set
SSH_USER="${SSH_USER:-$(whoami)}"
SSH_USER_HOME="${SSH_USER_HOME:-${USER_HOME:-$HOME}}"

echo "🔧 Setting up pm2 for user: $SSH_USER..."

# If running as root but installing for another user, install pm2 as that user
if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
  # Verify npm is available for the SSH user
  if ! sudo -u "$SSH_USER" bash -c "export HOME='$SSH_USER_HOME' && export NVM_DIR='$SSH_USER_HOME/.nvm' && [ -s \"\$NVM_DIR/nvm.sh\" ] && \. \"\$NVM_DIR/nvm.sh\" && command -v npm" &>/dev/null; then
    echo "❌ npm is not available for user $SSH_USER. This script should be sourced by 00-setup-all.sh"
    exit 1
  fi
  
  # Install pm2 globally as the SSH user
  sudo -u "$SSH_USER" bash -c "export HOME='$SSH_USER_HOME' && export NVM_DIR='$SSH_USER_HOME/.nvm' && [ -s \"\$NVM_DIR/nvm.sh\" ] && \. \"\$NVM_DIR/nvm.sh\" && nvm use default && npm install -g pm2"
  
  # Load nvm for current session to use pm2 commands
  export HOME="$SSH_USER_HOME"
  export NVM_DIR="$SSH_USER_HOME/.nvm"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
    nvm use default
  fi
else
  # Verify npm is available (safety check - should already be loaded by master script)
  if ! command -v npm &> /dev/null; then
    echo "❌ npm is not available. This script should be sourced by 00-setup-all.sh"
    exit 1
  fi
  
  # Install pm2 globally
  npm install -g pm2
fi

# Create logs directory and set ownership
mkdir -p /opt/voter-file-tool/apps/report-server/logs
if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
  chown -R "$SSH_USER:$SSH_USER" /opt/voter-file-tool/apps/report-server/logs
fi

# Ensure start.sh wrapper script is executable
if [ -f /opt/voter-file-tool/apps/report-server/start.sh ]; then
  chmod +x /opt/voter-file-tool/apps/report-server/start.sh
  echo "✅ start.sh wrapper script is executable"
else
  echo "⚠️  start.sh wrapper script not found (will be created from repo)"
fi

# Save pm2 process list (as the SSH user if we're root)
if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
  sudo -u "$SSH_USER" bash -c "export HOME='$SSH_USER_HOME' && export NVM_DIR='$SSH_USER_HOME/.nvm' && [ -s \"\$NVM_DIR/nvm.sh\" ] && \. \"\$NVM_DIR/nvm.sh\" && nvm use default && pm2 save" || true
else
  pm2 save || true
fi

# Setup pm2 to start on boot
# The startup command generates a systemd service that runs as the current user
# This ensures PM2 processes have access to the user's nvm installation
if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
  STARTUP_OUTPUT=$(sudo -u "$SSH_USER" bash -c "export HOME='$SSH_USER_HOME' && export NVM_DIR='$SSH_USER_HOME/.nvm' && [ -s \"\$NVM_DIR/nvm.sh\" ] && \. \"\$NVM_DIR/nvm.sh\" && nvm use default && pm2 startup" 2>&1 | grep -v PM2 || true)
else
  STARTUP_OUTPUT=$(pm2 startup 2>&1 | grep -v PM2 || true)
fi
if [ -n "$STARTUP_OUTPUT" ]; then
  echo "📋 PM2 startup command output:"
  echo "$STARTUP_OUTPUT"
  # Note: The user may need to run the generated command manually if sudo is required
fi

echo "✅ pm2 installed and configured successfully"
