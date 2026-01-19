# Report Server Deployment Setup

## Current Configuration

Based on your DNS setup:
- **Subdomain:** `reports.opensourcepolitics.online`
- **IP Address:** `54.70.186.10` (Lightsail static IP)
- **Frontend:** `opensourcepolitics.online`

## Step 1: Create terraform.tfvars

Create a file `terraform.tfvars` in the root directory (same location as `main.tf`) with the following:

```hcl
# Domain configuration
domain_name = "reports.opensourcepolitics.online"
use_ssl = true
use_self_signed_ssl = false

# GitHub token (you already have this)
github_token = "your-github-token-here"

# Report server environment variables
port = "8080"
callback_url = "https://opensourcepolitics.online/api/reportComplete"
webhook_secret = "your-webhook-secret-here"  # Generate a secure random string

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

## Step 2: Deploy with Terraform

```bash
# Initialize Terraform (if not already done)
terraform init

# Review the plan
terraform plan

# Apply the configuration
terraform apply
```

## Step 3: Set Up SSL Certificate

After Terraform creates the server, SSH into it:

```bash
ssh bitnami@54.70.186.10
```

Then run certbot to obtain the SSL certificate:

```bash
sudo certbot --nginx -d reports.opensourcepolitics.online
```

This will:
- Obtain a Let's Encrypt certificate
- Configure nginx automatically
- Set up automatic renewal

## Step 4: Update Frontend Environment

Make sure your frontend has the `PDF_SERVER_URL` environment variable set:

```bash
PDF_SERVER_URL=https://reports.opensourcepolitics.online
```

This tells the frontend where to send report generation requests.

## Verification

After setup, verify:
1. ✅ DNS: `reports.opensourcepolitics.online` resolves to `54.70.186.10`
2. ✅ SSL: `https://reports.opensourcepolitics.online` works with valid certificate
3. ✅ Backend: Server responds on port 8080 (via nginx on 80/443)
4. ✅ Frontend: Can communicate with backend

## Troubleshooting

### DNS not resolving?
- Wait a few minutes for DNS propagation
- Check with: `dig reports.opensourcepolitics.online` or `nslookup reports.opensourcepolitics.online`

### Certbot fails?
- Ensure DNS is fully propagated
- Ensure port 80 is open and accessible
- Check nginx is running: `sudo systemctl status nginx`

### Backend not responding?
- Check pm2: `pm2 status`
- Check logs: `pm2 logs report-server`
- Check nginx: `sudo nginx -t` and `sudo systemctl status nginx`
