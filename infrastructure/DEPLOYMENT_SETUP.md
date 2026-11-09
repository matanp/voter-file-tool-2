# Report Server Deployment Setup

## Current Configuration

Based on your DNS setup:
- **Subdomain:** `<your-domain>` (e.g. `reports.example.com`)
- **IP Address:** `<your-server-ip>` (Lightsail static IP)
- **Frontend:** `<your-frontend-domain>`

## Step 1: Create terraform.tfvars

Copy [terraform.tfvars.example](../terraform.tfvars.example) to `infrastructure/terraform.tfvars` (the path used by `pnpm run terraform:apply`). Fill in your values:

```hcl
# Domain configuration
domain_name = "<your-domain>"
use_ssl = true
use_self_signed_ssl = false

# GitHub token for cloning repository
github_token = "your-github-token-here"

# Report server environment variables
port = "8080"
callback_url = "https://<your-frontend-domain>/api/reportComplete"
webhook_secret = "your-webhook-secret-here"  # Generate a secure random string; see note below

# Cloudflare R2 configuration (fill in your values)
r2_account_id = "your-r2-account-id"
r2_access_key_id = "your-r2-access-key-id"
r2_secret_access_key = "your-r2-secret-access-key"
r2_bucket_name = "your-r2-bucket-name"

# Database configuration (fill in your values)
database_url = "postgresql://user:password@host:5432/database"

# Node environment
node_env = "production"
```

**WEBHOOK_SECRET:** Set the same value in both `terraform.tfvars` (report-server) and your frontend environment (Vercel). A mismatch causes report callbacks to fail silently.

## Step 2: Deploy with Terraform

```bash
# Initialize Terraform (if not already done)
terraform init

# Review the plan
terraform plan -var-file=infrastructure/terraform.tfvars

# Apply the configuration
pnpm run terraform:apply
```

To force-recreate the Lightsail instance (e.g. after major config changes):

```bash
pnpm run terraform:recreate
```

## Step 3: SSL Certificate

Certbot is attempted **automatically** during `07-start-services.sh` when Terraform provisions the instance, using `certbot_email` from `terraform.tfvars` (required when `use_ssl = true` with a `domain_name` and no self-signed cert; `terraform plan` fails without it). The script first waits up to ~5 minutes for the domain to resolve to the instance's public IP (the static IP is attached after the instance boots), then tries certbot up to 3 times. If it still fails, the user-data log shows `⚠️  HTTPS NOT CONFIGURED` and the setup summary says it finished with warnings. Check `/var/log/user-data.log` and `/var/log/voter-file-tool/certbot.log` (root-only, read with `sudo`; certbot's fuller log is `/var/log/letsencrypt/letsencrypt.log`), then SSH in and run manually:

```bash
# SSH user varies by image (bitnami, ubuntu, etc.); use whoami after login if unsure
ssh <your-ssh-user>@<your-server-ip>

sudo certbot --nginx -d <your-domain> --non-interactive --agree-tos --email <your-email> --redirect
```

This obtains a Let's Encrypt certificate, configures nginx, and sets up automatic renewal.

## Step 4: Update Frontend Environment

Set these in your frontend (Vercel) environment:

- `PDF_SERVER_URL` = `https://<your-domain>` (where the report-server is reachable)
- `WEBHOOK_SECRET` = same value as in `terraform.tfvars` (required for report callbacks)

## Verification

After setup, verify:
1. DNS: `<your-domain>` resolves to `<your-server-ip>`
2. SSL: `https://<your-domain>` works with valid certificate
3. Backend: Server responds on port 8080 (via nginx on 80/443)
4. Frontend: Can communicate with backend; reports complete successfully (WEBHOOK_SECRET match)

## Troubleshooting

### DNS not resolving?
- Wait a few minutes for DNS propagation
- Check with: `dig <your-domain>` or `nslookup <your-domain>`

### Certbot fails?
- Ensure DNS is fully propagated
- Ensure port 80 is open and accessible
- Check nginx is running: `sudo systemctl status nginx`

### Backend not responding?
- Load nvm first if needed: `source ~/.nvm/nvm.sh && nvm use default`
- Check pm2: `pm2 status`
- Check logs: `pm2 logs report-server`
- Check nginx: `sudo nginx -t` and `sudo systemctl status nginx`

### Server hung / out of memory?
The instance is a 1 GB `micro_3_0`. Provisioning adds `/swapfile-voter-file-tool` so total swap is at least 2 GB (the provisioning log prints `💾 Swap: <N> MB`). A cold `pnpm install` or a report render can still exhaust memory.

- If SSH doesn't respond, reboot from your machine:
  `aws lightsail reboot-instance --instance-name nodejs-report-server --region us-west-2`
  (`pnpm run terraform:recreate` also works, but it destroys the disk and runs the full install again.)
- Once in: `free -h`, `sudo swapon --show`, and `sudo dmesg -T | grep -i -E "oom|killed process"` to see what was killed.
- The report server's memory is capped in `apps/report-server/ecosystem.config.js`: `--max-old-space-size=384` and
  PM2's `max_memory_restart: '600M'`. If node goes past either one, it's restarted instead of growing until the box
  swaps itself unresponsive. A rising `↺` count in `pm2 status` usually means one of them fired. `pm2 logs report-server --err`
  shows `Reached heap limit` for the heap cap, and `~/.pm2/pm2.log` shows `exceeds --max-memory-restart value` for the
  RSS limit. Any job in progress at that point is lost.
- Before `scripts/deploy-lightsail.sh`, check the pnpm store matches. As the SSH user, from `/opt/voter-file-tool`,
  `pnpm store path` must equal `storeDir` in `node_modules/.modules.yaml`, and
  `sudo find ~/.local/share/pnpm ~/.cache/pnpm -maxdepth 3 ! -user $(whoami)` must print nothing.
  Otherwise pnpm 8 silently deletes `node_modules` and reinstalls everything from scratch, even with `CI=true`. Provisioning and deployment both install through `scripts/pnpm-install-low-memory.sh`, which runs `scripts/check-pnpm-store.sh` first. The check compares the store paths (not ownership) and aborts on a mismatch; deployment also runs it before stopping the service. Fix the store configuration or ownership before retrying.
- `scripts/deploy-lightsail.sh` stops `report-server` before installing and restarts it at the end. If a step fails or the deploy is killed partway (Ctrl-C, dropped SSH), it restarts `report-server` itself. That restart is best-effort: after a failed install it runs on a half-updated `node_modules` and may crash-loop, so check `pm2 status report-server` and re-run the deploy. A `kill -9` or a frozen box skips it, so run the deploy inside `tmux` and `pm2 restart report-server` if needed.
