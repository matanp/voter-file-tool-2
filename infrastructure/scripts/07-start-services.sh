#!/bin/bash
# Start pm2 and nginx services

set -e

# Load nvm to access Node.js and pm2
# Detect home directory (works for both root and regular users)
USER_HOME="${HOME:-$(eval echo ~$(whoami))}"
export NVM_DIR="$USER_HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

PROJECT_DIR="/opt/voter-file-tool"

echo "🚀 Starting services..."

# Navigate to report-server directory
cd "$PROJECT_DIR/apps/report-server" || {
  echo "❌ Failed to navigate to report-server directory"
  exit 1
}

# Stop existing pm2 process if running
pm2 delete report-server || true

# Start the application with pm2 using ecosystem config
pm2 start ecosystem.config.js

# Save pm2 process list
pm2 save

# Start nginx (may fail if SSL certificates don't exist yet)
sudo systemctl enable nginx

# If using Let's Encrypt, attempt to get certificate automatically
if [ -n "$DOMAIN_NAME" ] && [ "$USE_SSL" = "true" ] && [ "$USE_SELF_SIGNED_SSL" != "true" ]; then
  echo "🔒 Attempting to obtain Let's Encrypt certificate for $DOMAIN_NAME..."
  
  # If nginx config has SSL but certificates don't exist, temporarily use HTTP-only
  if [ -f /etc/nginx/sites-available/report-server ] && ! sudo test -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"; then
    echo "   Creating temporary HTTP-only config for certificate validation..."
    
    # Backup original config
    sudo cp /etc/nginx/sites-available/report-server /etc/nginx/sites-available/report-server.backup.$(date +%s) || true
    
    # Create HTTP-only config for certbot (certbot will modify it to add SSL)
    sudo tee /etc/nginx/sites-available/report-server > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN_NAME};
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
  fi
  
  # Start nginx (needed for certbot validation)
  sudo systemctl start nginx || {
    echo "⚠️  nginx failed to start - cannot obtain certificate"
  }
  
  # Wait for nginx to be ready
  sleep 3
  
  # Attempt certbot (non-blocking - don't fail deployment if this fails)
  # Extract email from domain or use a default
  CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@${DOMAIN_NAME#*.}}"
  echo "   Using email: $CERTBOT_EMAIL"
  
  if sudo certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos --email "$CERTBOT_EMAIL" --redirect 2>&1 | tee /tmp/certbot.log; then
    echo "✅ SSL certificate obtained successfully!"
    # Certbot automatically modified the nginx config and reloaded nginx
  else
    CERTBOT_EXIT_CODE=${PIPESTATUS[0]}
    echo "⚠️  Automatic certificate acquisition failed (exit code: $CERTBOT_EXIT_CODE)"
    echo "   Common reasons:"
    echo "   - DNS not fully propagated (wait a few minutes and try again)"
    echo "   - Port 80 not accessible from internet"
    echo "   - Domain not pointing to this server"
    echo ""
    echo "   To retry manually:"
    echo "   sudo certbot --nginx -d $DOMAIN_NAME"
    
    # If certbot failed, nginx might not be running with SSL config
    # Try to start it anyway (will work if HTTP-only config is in place)
    sudo systemctl start nginx || true
  fi
else
  # Not using Let's Encrypt, just start nginx normally
  sudo systemctl start nginx || {
    echo "⚠️  nginx failed to start"
    echo "   Check logs: sudo journalctl -u nginx -n 50"
  }
fi

# Check nginx status
if sudo systemctl is-active --quiet nginx; then
  echo "✅ nginx started successfully"
else
  echo "⚠️  nginx is not running - check configuration and certificates"
fi

# Show pm2 status
pm2 status

echo "✅ Services started successfully"
echo ""
if [ -n "$DOMAIN_NAME" ] && [ "$USE_SSL" = "true" ] && [ "$USE_SELF_SIGNED_SSL" != "true" ]; then
  if ! sudo systemctl is-active --quiet nginx || ! sudo test -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"; then
    echo "📋 SSL Certificate Setup:"
    echo "   If automatic certificate acquisition failed, run manually:"
    echo "   sudo certbot --nginx -d $DOMAIN_NAME"
  fi
fi
echo "📋 Useful commands:"
echo "  - View logs: pm2 logs report-server"
echo "  - Restart: pm2 restart report-server"
echo "  - Check nginx: sudo systemctl status nginx"
