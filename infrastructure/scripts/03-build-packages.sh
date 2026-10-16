#!/bin/bash
# Build all workspace packages
# Note: This script is designed to be sourced by 00-setup-all.sh
# nvm and pnpm should already be available in the environment

set -e

PROJECT_DIR="/opt/voter-file-tool"

# When sourced as root, re-run this script as the SSH user who runs the app under PM2.
# Otherwise node_modules, build output and the pnpm store/cache in the user's home end up root-owned.
if [ "$(whoami)" = "root" ] && [ -n "$SSH_USER" ] && [ "$SSH_USER" != "root" ]; then
  echo "📋 Building as SSH user: $SSH_USER"
  chown -R "$SSH_USER:$SSH_USER" "$PROJECT_DIR"
  sudo -u "$SSH_USER" bash -c "export HOME='$SSH_USER_HOME' && export NVM_DIR='$SSH_USER_HOME/.nvm' && [ -s \"\$NVM_DIR/nvm.sh\" ] && \. \"\$NVM_DIR/nvm.sh\" && nvm use default > /dev/null && bash '${BASH_SOURCE[0]}'"
  return 0 2>/dev/null || exit 0
fi

# Verify pnpm is available (safety check - should already be loaded by master script)
if ! command -v pnpm &> /dev/null; then
  echo "❌ pnpm is not available. This script should be sourced by 00-setup-all.sh"
  exit 1
fi

echo "🔨 Building workspace packages..."

# Fix ownership if needed (ensure current user owns the directory)
ACTUAL_USER=$(whoami)
sudo chown -R $ACTUAL_USER:$ACTUAL_USER "$PROJECT_DIR" 2>/dev/null || true

cd "$PROJECT_DIR" || {
  echo "❌ Failed to navigate to project directory"
  exit 1
}

# Step 1: Install ALL dependencies at root level (skip all scripts including dependency postinstalls)
echo "📦 Installing all dependencies (skipping all scripts)..."
PRISMA_SKIP_POSTINSTALL_GENERATE=true pnpm install --frozen-lockfile --ignore-scripts || {
  echo "❌ Failed to install dependencies"
  exit 1
}

# Step 2: Navigate to frontend to generate Prisma
cd apps/frontend || {
  echo "❌ Failed to navigate to frontend directory"
  exit 1
}

# Generate Prisma Client (creates TypeScript types)
echo "🔧 Generating Prisma Client..."
pnpm exec prisma generate || {
  echo "❌ Failed to generate Prisma client"
  exit 1
}

# Step 3: Go back to root and build ALL shared packages
cd "$PROJECT_DIR" || {
  echo "❌ Failed to navigate back to project root"
  exit 1
}

echo "🔨 Building all shared packages..."

# Clean all dist folders first
echo "🧹 Cleaning dist folders..."
pnpm --filter @voter-file-tool/shared-prisma run clean || true
pnpm --filter @voter-file-tool/shared-validators run clean || true
pnpm --filter @voter-file-tool/voter-import-processor run clean || true
pnpm --filter @voter-file-tool/xlsx-tester run clean || true

# Build packages explicitly in dependency order with verification
echo "Building shared-prisma..."
pnpm --filter @voter-file-tool/shared-prisma run build || {
  echo "❌ Failed to build shared-prisma"
  exit 1
}
test -f packages/shared-prisma/dist/index.d.ts || {
  echo "❌ shared-prisma declarations missing!"
  exit 1
}
echo "✅ shared-prisma built successfully"

echo "Building shared-validators..."
pnpm --filter @voter-file-tool/shared-validators run build || {
  echo "❌ Failed to build shared-validators"
  exit 1
}
test -f packages/shared-validators/dist/index.d.ts || {
  echo "❌ shared-validators declarations missing!"
  exit 1
}
echo "✅ shared-validators built successfully"

echo "Building voter-import-processor..."
pnpm --filter @voter-file-tool/voter-import-processor run build || {
  echo "❌ Failed to build voter-import-processor"
  exit 1
}
test -f packages/voter-import-processor/dist/index.d.ts || {
  echo "❌ voter-import-processor declarations missing!"
  exit 1
}
echo "✅ voter-import-processor built successfully"

echo "Building xlsx-tester..."
pnpm --filter @voter-file-tool/xlsx-tester run build || {
  echo "❌ Failed to build xlsx-tester"
  exit 1
}
echo "✅ xlsx-tester built successfully"

# Install Puppeteer Chrome
echo "📦 Installing Puppeteer Chrome..."
cd apps/report-server || {
  echo "❌ Failed to navigate to report-server directory"
  exit 1
}
npx puppeteer browsers install chrome || {
  echo "❌ Failed to install Puppeteer Chrome"
  exit 1
}

echo "✅ All packages built successfully!"
