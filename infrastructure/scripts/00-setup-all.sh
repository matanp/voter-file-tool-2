#!/bin/bash
# Master setup script that sources all individual setup scripts
# This ensures environment variables (nvm, pnpm, etc.) persist across all steps

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/opt/voter-file-tool"

# Install the pnpm version pinned in package.json ("packageManager"), not whatever is latest.
# A newer pnpm tries to switch to the pinned version on every command, which broke report-server startup.
PNPM_VERSION=$(sed -n 's/.*"packageManager": *"pnpm@\([^"]*\)".*/\1/p' "$SCRIPT_DIR/../../package.json")
if [ -z "$PNPM_VERSION" ]; then
  echo "❌ Could not read the pnpm version from packageManager in $SCRIPT_DIR/../../package.json" >&2
  exit 1
fi
export PNPM_VERSION

echo "🚀 Starting complete setup process..."

# Detect the SSH user (the user who will actually log in via SSH)
# This is typically the first non-root user with a home directory
# For Bitnami images, it's usually "bitnami"
# For Ubuntu/Debian, it might be "ubuntu" or the first user created
if [ "$(whoami)" = "root" ]; then
  # If running as root, detect the SSH user
  # Check for common SSH users in order of preference
  if id "bitnami" &>/dev/null; then
    SSH_USER="bitnami"
  elif id "ubuntu" &>/dev/null; then
    SSH_USER="ubuntu"
  else
    # Find the first non-root user with a home directory
    SSH_USER=$(getent passwd | awk -F: '$3 >= 1000 && $1 != "nobody" {print $1; exit}')
  fi
  
  if [ -z "$SSH_USER" ]; then
    echo "⚠️  Could not detect SSH user, using root"
    SSH_USER="root"
  fi
else
  # Already running as a non-root user
  SSH_USER="$(whoami)"
fi

SSH_USER_HOME=$(eval echo ~$SSH_USER)
echo "📋 Detected SSH user: $SSH_USER (home: $SSH_USER_HOME)"

# Load nvm once at the start (will be available to all sourced scripts)
# Use SSH user's home for installation (even if running as root)
USER_HOME="$SSH_USER_HOME"
export NVM_DIR="$USER_HOME/.nvm"

# Export variables so they're available to all sourced scripts
export USER_HOME
export SSH_USER
export SSH_USER_HOME

# Load nvm if it exists, otherwise it will be installed by 01-install-dependencies.sh
# If running as root but installing for SSH user, we'll load nvm after installation
if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
  echo "📦 Will install nvm for SSH user: $SSH_USER"
  # Don't try to load nvm yet - it will be installed by 01-install-dependencies.sh
elif [ -s "$NVM_DIR/nvm.sh" ]; then
  echo "📦 Loading nvm from $NVM_DIR..."
  \. "$NVM_DIR/nvm.sh"
else
  echo "📦 nvm not found at $NVM_DIR (will be installed by dependency script)"
fi

# Ensure pnpm is available after nvm loads (if nvm was already installed)
# Skip if we're root installing for another user (will be done in dependency script)
if [ "$(whoami)" != "root" ] || [ -z "$SSH_USER" ] || [ "$SSH_USER" = "root" ]; then
  if command -v npm &> /dev/null && [ "$(pnpm --version 2>/dev/null)" != "$PNPM_VERSION" ]; then
    echo "📦 Installing pnpm@$PNPM_VERSION globally..."
    npm install -g "pnpm@$PNPM_VERSION" || {
      echo "⚠️  Failed to install pnpm (will be installed by 01-install-dependencies.sh)"
    }
  fi
fi

# Source all setup scripts in order
# Using 'source' instead of 'bash' ensures environment variables persist
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/7: Installing system dependencies and Node.js"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
source "$SCRIPT_DIR/01-install-dependencies.sh"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/7: Verifying project repository"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
source "$SCRIPT_DIR/02-setup-project.sh"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/7: Building workspace packages"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
source "$SCRIPT_DIR/03-build-packages.sh"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4/7: Setting up environment variables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
source "$SCRIPT_DIR/04-setup-env.sh"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5/7: Setting up nginx"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
source "$SCRIPT_DIR/05-setup-nginx.sh"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6/7: Setting up pm2"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
source "$SCRIPT_DIR/06-setup-pm2.sh"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 7/7: Starting services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
source "$SCRIPT_DIR/07-start-services.sh"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Complete setup finished successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
