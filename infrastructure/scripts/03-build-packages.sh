#!/bin/bash
# Build all workspace packages

set -e

# Load nvm to access Node.js and pnpm
# Detect home directory (works for both root and regular users)
USER_HOME="${HOME:-$(eval echo ~$(whoami))}"
export NVM_DIR="$USER_HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

PROJECT_DIR="/opt/voter-file-tool"

echo "🔨 Building workspace packages..."

cd "$PROJECT_DIR" || {
  echo "❌ Failed to navigate to project directory"
  exit 1
}

# Step 1: Install ALL dependencies at root level (skip all scripts including dependency postinstalls)
echo "📦 Installing all dependencies (skipping all scripts)..."
PRISMA_SKIP_POSTINSTALL_GENERATE=true pnpm install --ignore-scripts || {
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
