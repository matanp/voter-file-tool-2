#!/bin/bash
# Wrapper script to start report-server with nvm loaded
# This ensures node and pnpm are available in PM2 context

set -e

# Detect user home directory (works for both root and regular users)
USER_HOME="${HOME:-$(eval echo ~$(whoami))}"
NVM_DIR="$USER_HOME/.nvm"

# Load nvm if it exists
if [ -s "$NVM_DIR/nvm.sh" ]; then
  \. "$NVM_DIR/nvm.sh"
else
  echo "❌ nvm not found at $NVM_DIR" >&2
  exit 1
fi

# Use Node.js 22 (default from nvm alias)
nvm use 22 || nvm use default || {
  echo "❌ Failed to load Node.js 22" >&2
  exit 1
}

# Change to report-server directory
cd "$(dirname "$0")" || {
  echo "❌ Failed to change to report-server directory" >&2
  exit 1
}

# Run pnpm start
exec pnpm start
