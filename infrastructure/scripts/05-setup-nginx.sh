#!/bin/bash
# Install and configure nginx as reverse proxy

set -e

echo "🔧 Setting up nginx..."

# Install nginx (certbot is optional, only needed for Let's Encrypt)
sudo apt-get update -y
sudo apt-get install -y nginx
# Install certbot only if needed (can be installed later)
sudo apt-get install -y certbot python3-certbot-nginx || echo "⚠️  certbot installation failed (optional, only needed for Let's Encrypt)"

# Stop nginx temporarily (will be started after SSL setup)
sudo systemctl stop nginx || true

# Create nginx config directory if it doesn't exist
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled

# Remove default nginx site
sudo rm -f /etc/nginx/sites-enabled/default

# Note: SSL certificate will be obtained separately via certbot
# The nginx config will be placed by Terraform, but nginx may not start
# until SSL certificates are obtained via: sudo certbot --nginx -d <domain>

echo "✅ nginx installed successfully"
echo "⚠️  Note: nginx config will be placed, but SSL setup is required before nginx can start"
