#!/bin/bash
# Install and configure nginx as reverse proxy

set -e

echo "🔧 Setting up nginx..."

# Create nginx config directory if it doesn't exist
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled

# Check if nginx config exists and has SSL certificate references that don't exist
# Temporarily disable the config to allow nginx installation to succeed
if [ -f /etc/nginx/sites-available/report-server ]; then
  # Check if config references SSL certificates that don't exist
  if grep -q "ssl_certificate.*letsencrypt" /etc/nginx/sites-available/report-server 2>/dev/null; then
    SSL_CERT_PATH=$(grep "ssl_certificate" /etc/nginx/sites-available/report-server | head -1 | sed -n 's/.*ssl_certificate\s\+\([^;]*\);.*/\1/p' | tr -d ' ')
    
    if [ -n "$SSL_CERT_PATH" ] && [ ! -f "$SSL_CERT_PATH" ]; then
      echo "⚠️  nginx config references SSL certificate that doesn't exist: $SSL_CERT_PATH"
      echo "   Temporarily disabling config to allow nginx installation..."
      
      # Backup original config
      sudo cp /etc/nginx/sites-available/report-server /etc/nginx/sites-available/report-server.backup.$(date +%s) || true
      
      # Temporarily remove symlink so nginx can install without errors
      sudo rm -f /etc/nginx/sites-enabled/report-server
      
      # Temporarily rename config file
      sudo mv /etc/nginx/sites-available/report-server /etc/nginx/sites-available/report-server.disabled || true
    fi
  fi
fi

# Remove default nginx site to prevent conflicts
sudo rm -f /etc/nginx/sites-enabled/default

# Install nginx (certbot is optional, only needed for Let's Encrypt)
sudo apt-get update -y
sudo apt-get install -y nginx

# Install certbot only if needed (can be installed later)
sudo apt-get install -y certbot python3-certbot-nginx || echo "⚠️  certbot installation failed (optional, only needed for Let's Encrypt)"

# Stop nginx temporarily (will be started after SSL setup)
sudo systemctl stop nginx || true

# Restore config if it was disabled
if [ -f /etc/nginx/sites-available/report-server.disabled ]; then
  echo "   Restoring nginx config and switching to HTTP-only mode..."
  
  # Restore original config
  sudo mv /etc/nginx/sites-available/report-server.disabled /etc/nginx/sites-available/report-server.backup.ssl || true
  
  # Use HTTP-only config if available
  if [ -f /opt/voter-file-tool/infrastructure/configs/nginx-report-server-http-only.conf ]; then
    sudo cp /opt/voter-file-tool/infrastructure/configs/nginx-report-server-http-only.conf /etc/nginx/sites-available/report-server
    sudo ln -sf /etc/nginx/sites-available/report-server /etc/nginx/sites-enabled/report-server
    echo "   Switched to HTTP-only config (SSL will be set up in 07-start-services.sh)"
  else
    echo "   ⚠️  HTTP-only config not found, restoring original config"
    sudo mv /etc/nginx/sites-available/report-server.backup.ssl /etc/nginx/sites-available/report-server || true
  fi
fi

# Ensure symlink exists if config is valid (handles case where Terraform created config but didn't symlink it)
if [ -f /etc/nginx/sites-available/report-server ] && [ ! -L /etc/nginx/sites-enabled/report-server ]; then
  # Check if config has SSL certificates that don't exist
  if grep -q "ssl_certificate" /etc/nginx/sites-available/report-server 2>/dev/null; then
    SSL_CERT_PATH=$(grep "ssl_certificate" /etc/nginx/sites-available/report-server | head -1 | sed -n 's/.*ssl_certificate\s\+\([^;]*\);.*/\1/p' | tr -d ' ')
    
    if [ -n "$SSL_CERT_PATH" ] && [ ! -f "$SSL_CERT_PATH" ]; then
      echo "⚠️  nginx config references SSL certificate that doesn't exist: $SSL_CERT_PATH"
      echo "   Switching to HTTP-only config..."
      
      # Backup original config
      sudo cp /etc/nginx/sites-available/report-server /etc/nginx/sites-available/report-server.backup.ssl.$(date +%s) || true
      
      # Use HTTP-only config if available
      if [ -f /opt/voter-file-tool/infrastructure/configs/nginx-report-server-http-only.conf ]; then
        sudo cp /opt/voter-file-tool/infrastructure/configs/nginx-report-server-http-only.conf /etc/nginx/sites-available/report-server
        sudo ln -sf /etc/nginx/sites-available/report-server /etc/nginx/sites-enabled/report-server
        echo "   Switched to HTTP-only config (SSL will be set up in 07-start-services.sh)"
      else
        echo "   ⚠️  HTTP-only config not found, cannot create symlink"
      fi
    else
      # SSL certs exist or path is empty, config is valid - create symlink
      sudo ln -sf /etc/nginx/sites-available/report-server /etc/nginx/sites-enabled/report-server
      echo "   Created symlink for nginx config"
    fi
  else
    # No SSL references, config is valid - create symlink
    sudo ln -sf /etc/nginx/sites-available/report-server /etc/nginx/sites-enabled/report-server
    echo "   Created symlink for nginx config"
  fi
fi

# Test nginx configuration
if sudo nginx -t 2>/dev/null; then
  echo "✅ nginx configuration is valid"
else
  echo "⚠️  nginx configuration test failed - will be fixed in 07-start-services.sh"
fi

echo "✅ nginx installed successfully"
echo "⚠️  Note: If SSL is required, certificates will be set up in 07-start-services.sh"
