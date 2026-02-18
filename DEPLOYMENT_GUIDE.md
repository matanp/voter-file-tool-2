# Production Deployment Guide

## Primary Deployment Path

**Use Terraform + automated setup** for new deployments. See [infrastructure/DEPLOYMENT_SETUP.md](infrastructure/DEPLOYMENT_SETUP.md) for the full flow. Terraform provisions the Lightsail instance and runs `infrastructure/scripts/00-setup-all.sh`, which installs dependencies, builds packages, configures nginx/PM2, and attempts certbot automatically.

---

## Manual Deployment (When Not Using Terraform)

Use these steps when you deploy the report-server manually (e.g. existing server, troubleshooting, or non-Terraform setup).

### Problem

The `@voter-file-tool/voter-import-processor` and other workspace packages need to be built before the report-server can run in production. TypeScript declaration files (`.d.ts`) are generated during the build step and are required for ts-node to work properly.

### Solution

#### Build Order

Packages must be built in dependency order. From the project root:

```bash
pnpm run build:packages
```

This builds: `shared-prisma` → `shared-validators` → `voter-import-processor` → (other packages). The `prestart` script in report-server builds a minimal subset when you run `pnpm start`; for a clean deploy, run `pnpm run build:packages` from root first.

### Manual Deployment Steps for AWS Lightsail

1. **SSH into your Lightsail instance**

   ```bash
   ssh <your-user>@your-instance-ip
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
   pnpm run build:packages
   ```

   This generates TypeScript declaration files (`.d.ts`) required for the report-server.

6. **Start the report server**
   ```bash
   cd apps/report-server
   pnpm start
   ```

### Using PM2 for Production

Use PM2 to keep the server running (note: `00-setup-all.sh` configures PM2 automatically; use this when deploying manually):

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
# OR (minimal subset)
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

### Future Consideration: CI/CD

A GitHub Actions workflow could automate build, test, deploy, and server restart. Not currently implemented.
