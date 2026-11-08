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

# Stop the report server first: an install next to a running Chrome can run the 1 GB box out of memory.
echo "⏸️  Stopping report-server..."
pm2 stop report-server || true
trap 'echo "⚠️  Deploy failed. report-server is stopped; start it with: pm2 restart report-server"' ERR

# Install dependencies.
# CI=true makes pnpm abort instead of silently wiping node_modules if the store doesn't match
# node_modules/.modules.yaml (that wipe turns into a full cold install). Low concurrency keeps memory down.
echo "📦 Installing dependencies..."
CI=true pnpm install --frozen-lockfile --network-concurrency=4 --child-concurrency=1

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
