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
# From here on, if a step fails or the deploy is killed (Ctrl-C, dropped SSH), bring the server back up
# rather than leaving it stopped. Best-effort: after a failed install it restarts on whatever is in
# node_modules and may crash-loop. Restart first and ignore HUP/PIPE, since the terminal may be gone.
restart_after_abort() {
  trap '' HUP PIPE
  if pm2 restart report-server > /dev/null 2>&1; then
    echo "⚠️  Deploy aborted. report-server was restarted; check it with: pm2 status report-server" || true
  else
    echo "❌ Deploy aborted and report-server did not restart; run: pm2 restart report-server" || true
  fi
  exit 1
}
trap restart_after_abort ERR INT HUP TERM

echo "📦 Installing dependencies..."
bash scripts/pnpm-install-low-memory.sh

# Build all packages
echo "🔨 Building workspace packages..."
# shared-prisma's build runs prisma generate, so no separate generation step is needed.
pnpm run build:packages

trap - ERR INT HUP TERM
echo "▶️  Restarting report-server..."
pm2 restart report-server
pm2 status report-server

echo "✅ Deployment complete!"
