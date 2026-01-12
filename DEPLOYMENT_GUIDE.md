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
   cd /home/bitnami/your-project
   ```

3. **Pull latest changes**
   ```bash
   git pull origin main
   ```

4. **Install dependencies** (if package.json changed)
   ```bash
   pnpm install
   ```

5. **Build all packages** (now handled automatically by prestart, but can be run manually)
   ```bash
   # From root:
   pnpm run build:packages
   
   # OR from report-server:
   cd apps/report-server
   pnpm run prestart
   ```

6. **Start the report server**
   ```bash
   cd apps/report-server
   pnpm start
   ```

### What the `prestart` Script Does
```json
"prestart": "pnpm --filter '@voter-file-tool/voter-import-processor' run build && pnpm --filter '@voter-file-tool/shared-validators' run build && pnpm --filter '@voter-file-tool/shared-prisma' run build"
```

This builds all workspace packages that the report-server depends on, generating the required `.d.ts` type definition files.

### Recommended: Use PM2 for Production

Instead of running `pnpm start` directly, use PM2 to keep the server running:

```bash
# Install PM2 globally (one-time)
npm install -g pm2

# Start the report server with PM2
cd /home/bitnami/your-project/apps/report-server
pm2 start "pnpm start" --name "report-server"

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
cd /home/bitnami/your-project
pnpm run build:packages
# OR
cd apps/report-server
pnpm run prestart
```

#### Error: "Cannot find module '@voter-file-tool/voter-import-processor'"

**Cause**: Dependencies aren't installed.

**Solution**:
```bash
cd /home/bitnami/your-project
pnpm install
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
