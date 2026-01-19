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

## Accessing PM2 Commands in New Shell

If you get "pm2: command not found" in a new shell session, you need to load nvm first:

```bash
# Load nvm into current session
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Now pm2 will be available
pm2 status
pm2 logs report-server
pm2 restart report-server
```

**Note**: The report-server is already running from the setup script. You can verify it's working by checking:

- `pm2 status` (after loading nvm)
- `curl http://localhost:8080` (if the server has a health endpoint)
- Check nginx status: `sudo systemctl status nginx`

## Check if Services are Running

```bash
# Load nvm first
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Check PM2 status
pm2 status

# Check PM2 logs
pm2 logs report-server --lines 50

# Check nginx status
sudo systemctl status nginx

# Check nginx error logs
sudo tail -n 50 /var/log/nginx/error.log
```

## Make PM2 Available on Login (One-Time Fix)

To make pm2 commands available immediately when you login, run these commands once:

```bash
# Ensure .bash_profile sources .bashrc (for login shells)
if [ ! -f ~/.bash_profile ]; then
  cat > ~/.bash_profile << 'EOF'
# ~/.bash_profile: executed by bash for login shells.
if [ -f ~/.bashrc ]; then
    . ~/.bashrc
fi
EOF
elif ! grep -q '\.bashrc' ~/.bash_profile; then
  echo '' >> ~/.bash_profile
  echo '# Source .bashrc for consistent behavior' >> ~/.bash_profile
  echo 'if [ -f ~/.bashrc ]; then' >> ~/.bash_profile
  echo '    . ~/.bashrc' >> ~/.bash_profile
  echo 'fi' >> ~/.bash_profile
fi

# Ensure default node version is used automatically
if ! grep -q 'nvm use default' ~/.bashrc; then
  echo '' >> ~/.bashrc
  echo '# Use default node version automatically' >> ~/.bashrc
  echo 'nvm use default > /dev/null 2>&1 || true' >> ~/.bashrc
fi

# Test it by opening a new shell or running:
source ~/.bashrc
pm2 status
```

After running these commands, pm2 will be available in all new shell sessions.
