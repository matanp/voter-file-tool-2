#!/bin/bash
# Install system dependencies and Node.js

set -e

echo "📦 Installing system dependencies..."

# Update and install necessary packages
sudo apt-get update -y
sudo apt-get install -y git curl wget gnupg

# Install comprehensive dependencies for Puppeteer/Chrome
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  xdg-utils

# Use NVM_DIR from master script if set, otherwise detect user home
# This ensures consistency with 00-setup-all.sh
if [ -z "$NVM_DIR" ]; then
  USER_HOME="${HOME:-$(eval echo ~$(whoami))}"
  NVM_DIR="$USER_HOME/.nvm"
else
  USER_HOME="$(dirname "$NVM_DIR")"
fi

# Setup bashrc if it doesn't exist (use detected user's home)
if [ ! -f "$USER_HOME/.bashrc" ]; then
  touch "$USER_HOME/.bashrc"
fi

# Install Node.js from NodeSource via nvm
# Temporarily unset NVM_DIR to let the install script detect the location automatically
# The install script will use $HOME/.nvm by default, which matches our intended location
echo "📦 Installing Node.js via nvm..."
echo "   Will install to: $NVM_DIR"
# Unset NVM_DIR temporarily - the install script will create $HOME/.nvm automatically
unset NVM_DIR
curl -fsSL -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
# Now set NVM_DIR to the location where nvm was installed
export NVM_DIR="$USER_HOME/.nvm"

# Add nvm to .bashrc (only if not already present)
if ! grep -q 'NVM_DIR' "$USER_HOME/.bashrc"; then
  echo 'export NVM_DIR="$HOME/.nvm"' >> "$USER_HOME/.bashrc"
  echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> "$USER_HOME/.bashrc"
fi

# Also add to .profile for better compatibility (login shells)
if [ ! -f "$USER_HOME/.profile" ]; then
  touch "$USER_HOME/.profile"
fi
if ! grep -q 'NVM_DIR' "$USER_HOME/.profile"; then
  echo 'export NVM_DIR="$HOME/.nvm"' >> "$USER_HOME/.profile"
  echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> "$USER_HOME/.profile"
fi

# Load nvm into the current session
# Use the NVM_DIR we set (should match what master script set)
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 22
nvm install 22
nvm use 22
nvm alias default 22

# Install pnpm globally
npm install -g pnpm

echo "✅ System dependencies and Node.js installed successfully"
