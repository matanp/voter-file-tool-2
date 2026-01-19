# Production Deployment Guide

## Problem

The `@voter-file-tool/voter-import-processor` and other workspace packages need to be built before the report-server can run in production. TypeScript declaration files (`.d.ts`) are generated during the build step and are required for ts-node to work properly.

## Solution

### Automated Build on Start

The `report-server` now has a `prestart` script that automatically builds all required packages before starting the server.

### Deployment Steps for AWS Lightsail

1. **SSH into your Lightsail instance**

   ```bash
   ssh bitnami@your-instance-ip
   ```

2. **Navigate to your project directory**

   ```bash
   cd /opt/voter-file-tool
   ```

3. **Pull latest changes**

   ```bash
   git pull origin main
   ```

4. **Install dependencies** (if package.json changed)

   ```bash
   pnpm install
   ```

5. **Build all workspace packages** ⚠️ **REQUIRED** ⚠️

   ```bash
   # From project root - this MUST be run before starting the server:
   pnpm run build:packages
   ```

   This generates TypeScript declaration files (.d.ts) that are required for the report-server to run.

6. **Start the report server**
   ```bash
   cd apps/report-server
   pnpm start
   ```

### What the `prestart` Script Does

```json
"prestart": "pnpm --filter '@voter-file-tool/voter-import-processor' run build && pnpm --filter '@voter-file-tool/shared-validators' run build && pnpm --filter '@voter-file-tool/shared-prisma' run build"
```

⚠️ **Note**: While the `prestart` script will build packages automatically when you run `pnpm start`, it's better to run `pnpm run build:packages` from the project root first to ensure all packages build correctly before starting the server.

### Recommended: Use PM2 for Production

Instead of running `pnpm start` directly, use PM2 to keep the server running:

```bash
# Install PM2 globally (one-time)
npm install -g pm2

# Start the report server with PM2
cd /opt/voter-file-tool/apps/report-server
pm2 start ecosystem.config.js

# Save the PM2 process list
pm2 save

# Set PM2 to start on boot
pm2 startup
```

### PM2 Useful Commands

```bash
# View logs
pm2 logs report-server

# Restart after code changes
pm2 restart report-server

# Stop the server
pm2 stop report-server

# Delete from PM2
pm2 delete report-server

# View status
pm2 status
```

### Troubleshooting

#### Error: "Could not find a declaration file for module '@voter-file-tool/voter-import-processor'"

**Cause**: The package hasn't been built yet.

**Solution**:

```bash
cd /opt/voter-file-tool
pnpm run build:packages
# OR
cd apps/report-server
pnpm run prestart
```

#### Error: "Cannot find module '@voter-file-tool/voter-import-processor'"

**Cause**: Dependencies aren't installed.

**Solution**:

```bash
cd /opt/voter-file-tool
pnpm install
```

#### Error: "TS5033: Could not write file" during build

**Cause**: Permission issues with dist directories.

**Solution**:

```bash
cd /opt/voter-file-tool

# Remove existing dist directories
rm -rf packages/*/dist
rm -rf apps/*/dist

# If still failing, fix ownership
sudo chown -R $USER:$USER /opt/voter-file-tool

# Try building again
pnpm run build:packages
```

### Alternative: Include dist in Git (Not Recommended)

If you want to avoid building on the server, you can commit the `dist` folders to git:

1. Edit `.gitignore` to exclude packages from the dist rule:

   ```diff
   - **/dist/
   + apps/*/dist/
   ```

2. Add and commit the dist folders:
   ```bash
   git add packages/*/dist
   git commit -m "Include built packages in git"
   ```

**Why not recommended**: This adds build artifacts to version control, increases repo size, and can cause merge conflicts.

### Best Practice: CI/CD Pipeline

For a more robust solution, set up a GitHub Actions workflow to:

1. Build all packages
2. Run tests
3. Deploy to AWS Lightsail
4. Restart the server

This ensures packages are always built correctly before deployment.
