# Quick Fix for Server Issues

## Fix Report-Server Crash Loop (tailwind.css Permission Denied)

If you see `Error: EACCES: permission denied, open './public/tailwind.css'` and the server is restarting in a loop:

```bash
# Fix ownership of the project directory
sudo chown -R bitnami:bitnami /opt/voter-file-tool

# Restart the report-server
source ~/.nvm/nvm.sh && nvm use default
pm2 restart report-server

# Verify it's running
pm2 status
pm2 logs report-server --lines 20
```

**Cause:** The `public/` directory or `tailwind.css` file is owned by `root`, but PM2 runs as `bitnami`.

---

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

## Fix Nginx SSL Certificate Error

If you're seeing an error like:

```
cannot load certificate "/etc/letsencrypt/live/reports.opensourcepolitics.online/fullchain.pem": BIO_new_file() failed
nginx.service: Failed with result 'exit-code'
```

This means nginx is configured for SSL but the certificates don't exist yet. Here's how to fix it:

### Option 1: Use HTTP-Only Config Temporarily (Quick Fix)

```bash
# Backup the current config
sudo cp /etc/nginx/sites-available/report-server /etc/nginx/sites-available/report-server.backup.$(date +%s)

# Replace with HTTP-only config
sudo cp /opt/voter-file-tool/infrastructure/configs/nginx-report-server-http-only.conf /etc/nginx/sites-available/report-server

# Test nginx config
sudo nginx -t

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify it's running
sudo systemctl status nginx
```

### Option 2: Set Up Let's Encrypt Certificates

If you have a domain name pointing to your server:

```bash
# 1. First, use HTTP-only config temporarily (see Option 1 above)
# This allows nginx to start so certbot can validate the domain

# 2. Make sure port 80 is accessible from the internet
# (Should already be configured in Terraform)

# 3. Install certbot if not already installed
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# 4. Obtain SSL certificate (replace with your domain)
sudo certbot --nginx -d reports.opensourcepolitics.online --non-interactive --agree-tos --email admin@opensourcepolitics.online --redirect

# 5. Certbot will automatically update your nginx config and reload nginx
# Verify it's working
sudo systemctl status nginx
curl -I https://reports.opensourcepolitics.online
```

**Note:** Certbot requires:

- Domain DNS pointing to your server IP
- Port 80 accessible from the internet
- nginx running on port 80 (for validation)

### Option 3: Complete nginx Installation Without SSL

If you just want to get nginx installed and running without SSL:

```bash
# Remove the SSL config temporarily
sudo rm -f /etc/nginx/sites-enabled/report-server

# Use HTTP-only config
sudo cp /opt/voter-file-tool/infrastructure/configs/nginx-report-server-http-only.conf /etc/nginx/sites-available/report-server
sudo ln -sf /etc/nginx/sites-available/report-server /etc/nginx/sites-enabled/report-server

# Test and start
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx

# Complete the package installation
sudo dpkg --configure -a
```

After fixing nginx, you can continue with the setup:

```bash
cd /opt/voter-file-tool
# Continue from where it failed (skip 05-setup-nginx.sh since nginx is now working)
source infrastructure/scripts/06-setup-pm2.sh
source infrastructure/scripts/07-start-services.sh
```

## Fix Nginx Port 80 Conflict and Server Name Issues

If you're seeing errors like:

```
bind() to 0.0.0.0:80 failed (98: Address already in use)
conflicting server name "_" on 0.0.0.0:80
```

This means port 80 is already in use and/or there are conflicting nginx configurations.

### Step 1: Find What's Using Port 80

```bash
# Check what's using port 80
sudo lsof -i :80
# Or
sudo netstat -tlnp | grep :80
# Or
sudo ss -tlnp | grep :80
```

### Step 2: Stop Conflicting Services

If nginx is already running (but not via systemd), stop it:

```bash
# Kill any nginx processes
sudo pkill -9 nginx

# Or if you see a specific PID from lsof/netstat:
sudo kill -9 <PID>
```

### Step 3: Remove Conflicting Configs

```bash
# Remove default nginx site (causes "server name _" conflict)
sudo rm -f /etc/nginx/sites-enabled/default

# List all enabled sites
ls -la /etc/nginx/sites-enabled/

# Make sure only your report-server config is enabled
# Remove any other enabled sites if needed
```

### Step 3: Fix and Start Nginx

```bash
# Make sure your config is correct and enabled
sudo cp /opt/voter-file-tool/infrastructure/configs/nginx-report-server-http-only.conf /etc/nginx/sites-available/report-server
sudo ln -sf /etc/nginx/sites-available/report-server /etc/nginx/sites-enabled/report-server

# Remove any other enabled configs that might conflict
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# If test passes, start nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

### Step 4: Complete Package Installation

```bash
# Complete the nginx package installation
sudo dpkg --configure -a
```

### Step 5: Now Get SSL Certificate

Once nginx is running on port 80:

```bash
# Install certbot if needed
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate (certbot will automatically update nginx config)
sudo certbot --nginx -d reports.opensourcepolitics.online --non-interactive --agree-tos --email admin@opensourcepolitics.online --redirect

# Verify SSL is working
curl -I https://reports.opensourcepolitics.online
```

### Complete Fix Script (Run All at Once)

If you want to fix everything in one go:

```bash
# 1. Find what's using port 80
echo "Checking what's using port 80..."
sudo lsof -i :80 || sudo netstat -tlnp | grep :80 || sudo ss -tlnp | grep :80

# 2. Kill whatever is using port 80
echo "Killing processes on port 80..."
sudo fuser -k 80/tcp || true
sudo pkill -9 nginx || true
sudo pkill -9 apache2 || true
sleep 3

# 3. Verify port 80 is free
echo "Verifying port 80 is free..."
sudo lsof -i :80 || echo "Port 80 is now free"

# 4. Remove conflicting configs
sudo rm -f /etc/nginx/sites-enabled/default

# 5. Set up correct config
sudo cp /opt/voter-file-tool/infrastructure/configs/nginx-report-server-http-only.conf /etc/nginx/sites-available/report-server
sudo ln -sf /etc/nginx/sites-available/report-server /etc/nginx/sites-enabled/report-server

# 6. Test and start
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx

# 7. Complete package installation
sudo dpkg --configure -a

# 8. Verify nginx is running
sudo systemctl status nginx

# 9. Get SSL certificate
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d reports.opensourcepolitics.online --non-interactive --agree-tos --email admin@opensourcepolitics.online --redirect

# 10. Verify SSL
curl -I https://reports.opensourcepolitics.online
```
