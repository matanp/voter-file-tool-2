#!/bin/bash

# Quick deployment script for AWS Lightsail
# Run this on your Lightsail instance after pulling code changes

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Navigate to project root
cd /opt/voter-file-tool

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Abort a store mismatch before stopping the service or allowing pnpm to purge modules.
bash scripts/check-pnpm-store.sh

# Stop the report server first: an install next to a running Chrome can run the 1 GB box out of memory.
echo "⏸️  Stopping report-server..."
pm2 stop report-server || true
# If any later step fails, bring the server back up rather than leaving it down.
trap 'echo "⚠️  Deploy failed. Restarting report-server..."; pm2 restart report-server || echo "❌ Restart failed; run: pm2 restart report-server"' ERR

echo "📦 Installing dependencies..."
bash scripts/pnpm-install-low-memory.sh

# Build all packages
echo "🔨 Building workspace packages..."
pnpm run build:packages

# Navigate to report-server
cd apps/report-server

# Generate Prisma client
echo "🔧 Generating Prisma client..."
pnpm exec prisma generate

trap - ERR
echo "▶️  Restarting report-server..."
pm2 restart report-server
pm2 status report-server

echo "✅ Deployment complete!"
