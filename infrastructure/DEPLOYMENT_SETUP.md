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

Certbot is attempted **automatically** during `07-start-services.sh` when Terraform provisions the instance. If it fails (DNS propagation, port 80, etc.), SSH in and run manually:

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
