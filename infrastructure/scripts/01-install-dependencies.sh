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
  if [ -n "$SSH_USER" ] && [ -n "$SSH_USER_HOME" ]; then
    # Use SSH user if detected by master script
    USER_HOME="$SSH_USER_HOME"
  else
    USER_HOME="${HOME:-$(eval echo ~$(whoami))}"
  fi
  NVM_DIR="$USER_HOME/.nvm"
else
  USER_HOME="$(dirname "$NVM_DIR")"
fi

# If running as root but installing for another user, ensure proper ownership
if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
  echo "📋 Installing nvm for SSH user: $SSH_USER"
  # Ensure the user's home directory and .nvm directory are owned by the SSH user
  if [ -d "$USER_HOME" ]; then
    chown -R "$SSH_USER:$SSH_USER" "$USER_HOME" 2>/dev/null || true
  fi
fi

# Setup bashrc if it doesn't exist (use detected user's home)
if [ ! -f "$USER_HOME/.bashrc" ]; then
  touch "$USER_HOME/.bashrc"
  if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
    chown "$SSH_USER:$SSH_USER" "$USER_HOME/.bashrc"
  fi
fi

# Install Node.js from NodeSource via nvm
# Ensure HOME is set correctly (the install script needs it)
export HOME="$USER_HOME"
# Create the .nvm directory first to ensure it exists
mkdir -p "$USER_HOME/.nvm"
if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
  chown -R "$SSH_USER:$SSH_USER" "$USER_HOME/.nvm"
fi
# Set NVM_DIR so the install script knows where to install
export NVM_DIR="$USER_HOME/.nvm"
echo "📦 Installing Node.js via nvm..."
echo "   Installing to: $NVM_DIR"
echo "   HOME is set to: $HOME"
echo "   For user: ${SSH_USER:-$(whoami)}"

# If installing for another user, we need to run the install as that user
if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
  # Run nvm install as the SSH user
  sudo -u "$SSH_USER" bash -c "export HOME='$USER_HOME' && export NVM_DIR='$NVM_DIR' && curl -fsSL -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash"
  # Fix ownership in case root created some files
  chown -R "$SSH_USER:$SSH_USER" "$USER_HOME/.nvm" 2>/dev/null || true
else
  # Run the install script - it will use NVM_DIR if set and directory exists
  curl -fsSL -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
fi
# Verify nvm was installed
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "❌ nvm installation failed - nvm.sh not found at $NVM_DIR/nvm.sh" >&2
  exit 1
fi

# Load nvm into current session (even if installed for another user, we need it for pnpm installation)
if [ -s "$NVM_DIR/nvm.sh" ]; then
  \. "$NVM_DIR/nvm.sh"
fi

# The nvm install script already adds nvm to .bashrc, but we'll verify and enhance it
# Ensure .bashrc sources nvm (the install script should have done this, but verify)
if ! grep -q 'NVM_DIR' "$USER_HOME/.bashrc"; then
  {
    echo ''
    echo '# Load nvm'
    echo 'export NVM_DIR="$HOME/.nvm"'
    echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"'
    echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"'
  } >> "$USER_HOME/.bashrc"
  if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
    chown "$SSH_USER:$SSH_USER" "$USER_HOME/.bashrc"
  fi
fi

# Ensure .bash_profile sources .bashrc (for login shells)
# This ensures nvm and pm2 are available immediately when users login via SSH
if [ ! -f "$USER_HOME/.bash_profile" ]; then
  cat > "$USER_HOME/.bash_profile" << 'BASH_PROFILE_EOF'
# ~/.bash_profile: executed by bash for login shells.
# If .bash_profile exists, bash doesn't read .bashrc in login shells.
# So we source .bashrc to get the same behavior in login and non-login shells.
if [ -f ~/.bashrc ]; then
    . ~/.bashrc
fi
BASH_PROFILE_EOF
  if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
    chown "$SSH_USER:$SSH_USER" "$USER_HOME/.bash_profile"
  fi
elif ! grep -q '\.bashrc' "$USER_HOME/.bash_profile"; then
  # .bash_profile exists but doesn't source .bashrc, add it
  {
    echo ''
    echo '# Source .bashrc for consistent behavior'
    echo 'if [ -f ~/.bashrc ]; then'
    echo '    . ~/.bashrc'
    echo 'fi'
  } >> "$USER_HOME/.bash_profile"
  if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
    chown "$SSH_USER:$SSH_USER" "$USER_HOME/.bash_profile"
  fi
fi

# Also add to .profile for better compatibility (login shells that don't use bash_profile)
if [ ! -f "$USER_HOME/.profile" ]; then
  touch "$USER_HOME/.profile"
  if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
    chown "$SSH_USER:$SSH_USER" "$USER_HOME/.profile"
  fi
fi
if ! grep -q 'NVM_DIR' "$USER_HOME/.profile"; then
  {
    echo ''
    echo '# Load nvm'
    echo 'export NVM_DIR="$HOME/.nvm"'
    echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"'
  } >> "$USER_HOME/.profile"
  if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
    chown "$SSH_USER:$SSH_USER" "$USER_HOME/.profile"
  fi
fi

# nvm should already be loaded from above, but verify
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "❌ Failed to find nvm at $NVM_DIR" >&2
  exit 1
fi
# Ensure nvm is loaded (might not be if we installed for another user)
if ! command -v nvm &>/dev/null; then
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
  else
    echo "❌ Failed to load nvm from $NVM_DIR" >&2
    exit 1
  fi
fi

# Install Node.js 22 (as the SSH user if we're root)
if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
  sudo -u "$SSH_USER" bash -c "export HOME='$USER_HOME' && export NVM_DIR='$NVM_DIR' && [ -s \"\$NVM_DIR/nvm.sh\" ] && \. \"\$NVM_DIR/nvm.sh\" && nvm install 22 && nvm use 22 && nvm alias default 22"
  # Load nvm for current session to install pnpm
  \. "$NVM_DIR/nvm.sh"
  nvm use 22
else
  nvm install 22
  nvm use 22
  nvm alias default 22
fi

# Ensure default node is used automatically in new shells
# This makes pm2 and other node tools available immediately on login
# Add to .bashrc to automatically use default node version
if ! grep -q 'nvm use default' "$USER_HOME/.bashrc"; then
  {
    echo ''
    echo '# Use default node version automatically'
    echo 'nvm use default > /dev/null 2>&1 || true'
  } >> "$USER_HOME/.bashrc"
  if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
    chown "$SSH_USER:$SSH_USER" "$USER_HOME/.bashrc"
  fi
fi

# Install pnpm globally (as the SSH user if we're root)
if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
  sudo -u "$SSH_USER" bash -c "export HOME='$USER_HOME' && export NVM_DIR='$NVM_DIR' && [ -s \"\$NVM_DIR/nvm.sh\" ] && \. \"\$NVM_DIR/nvm.sh\" && nvm use default && npm install -g pnpm"
else
  npm install -g pnpm
fi

echo "✅ System dependencies and Node.js installed successfully"
