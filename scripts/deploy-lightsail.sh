#!/bin/bash

# Quick deployment script for AWS Lightsail
# Run this on your Lightsail instance after pulling code changes

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Navigate to project root
cd /home/bitnami/your-project

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build all packages
echo "🔨 Building workspace packages..."
pnpm run build:packages

# Navigate to report-server
cd apps/report-server

# Generate Prisma client
echo "🔧 Generating Prisma client..."
pnpm exec prisma generate

echo "✅ Deployment complete!"
echo ""
echo "To start the server:"
echo "  pnpm start"
echo ""
echo "Or with PM2:"
echo "  pm2 restart report-server"
