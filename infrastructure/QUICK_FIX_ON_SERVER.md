# Quick Fix for Server Issues

## Fix Permission Issues

If you're seeing permission errors (EACCES, dubious ownership, etc.), run these commands:

```bash
# Fix ownership of project directory
sudo chown -R $USER:$USER /opt/voter-file-tool

# Fix git safe directory
git config --global --add safe.directory /opt/voter-file-tool

# Verify ownership
ls -la /opt/voter-file-tool | head -5
```

## Fix NVM Installation

If you're seeing "nvm: command not found" after nvm installation, run these commands:

```bash
# 1. Load nvm into current session
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 2. Verify nvm is loaded
nvm --version

# 3. Install Node.js 22
nvm install 22
nvm use 22
nvm alias default 22

# 4. Install pnpm globally
npm install -g pnpm

# 5. Continue with the rest of the setup
cd /opt/voter-file-tool
bash infrastructure/scripts/00-setup-all.sh
```

Or if you want to manually continue from where it failed:

```bash
# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 22
nvm install 22
nvm use 22
nvm alias default 22

# Install pnpm
npm install -g pnpm

# Continue with remaining setup scripts
cd /opt/voter-file-tool
source infrastructure/scripts/03-build-packages.sh
source infrastructure/scripts/04-setup-env.sh
source infrastructure/scripts/05-setup-nginx.sh
source infrastructure/scripts/06-setup-pm2.sh
source infrastructure/scripts/07-start-services.sh
```
