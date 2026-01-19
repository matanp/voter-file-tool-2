#!/bin/bash
# Generate self-signed SSL certificate

set -e

SSL_DIR="/etc/nginx/ssl"

echo "🔐 Generating self-signed SSL certificate..."

# Create SSL directory
sudo mkdir -p "$SSL_DIR"

# Get server IP for certificate subject
SERVER_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "127.0.0.1")

# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$SSL_DIR/self-signed.key" \
  -out "$SSL_DIR/self-signed.crt" \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=$SERVER_IP" \
  -addext "subjectAltName=IP:$SERVER_IP"

# Set proper permissions
sudo chmod 600 "$SSL_DIR/self-signed.key"
sudo chmod 644 "$SSL_DIR/self-signed.crt"

echo "✅ Self-signed certificate generated at $SSL_DIR/"
echo "⚠️  Note: Browsers will show a security warning for self-signed certificates"
