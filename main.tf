provider "aws" {
  region = "us-west-2"
}

# Variables
variable "github_token" {
  type        = string
  description = "GitHub token for cloning the repository"
  sensitive   = true
}

variable "domain_name" {
  type        = string
  description = "Domain name for the report server (for Let's Encrypt SSL). Leave empty or use IP for HTTP-only mode."
  default     = ""
}

variable "use_ssl" {
  type        = bool
  description = "Whether to use SSL/HTTPS. Requires domain_name and Let's Encrypt, or will use self-signed cert."
  default     = false
}

variable "use_self_signed_ssl" {
  type        = bool
  description = "Use self-signed SSL certificate (for testing without a domain). Browser will show security warning."
  default     = false
}

# Environment variables
variable "port" {
  type        = string
  description = "Port for the report server"
  default     = "8080"
}

variable "callback_url" {
  type        = string
  description = "Callback URL for report completion webhooks"
  default     = "http://localhost:3000/api/reportComplete"
}

variable "webhook_secret" {
  type        = string
  description = "Webhook secret for signing callbacks"
  default     = ""
  sensitive   = true
}

variable "r2_account_id" {
  type        = string
  description = "Cloudflare R2 account ID"
  sensitive   = true
}

variable "r2_access_key_id" {
  type        = string
  description = "Cloudflare R2 access key ID"
  sensitive   = true
}

variable "r2_secret_access_key" {
  type        = string
  description = "Cloudflare R2 secret access key"
  sensitive   = true
}

variable "r2_bucket_name" {
  type        = string
  description = "Cloudflare R2 bucket name"
}

variable "database_url" {
  type        = string
  description = "Database connection URL"
  sensitive   = true
}

variable "node_env" {
  type        = string
  description = "Node environment"
  default     = "production"
}

# Create an AWS Lightsail instance for the Node.js server
resource "aws_lightsail_instance" "nodejs_server" {
  name              = "nodejs-report-server"
  availability_zone = "us-west-2a"
  blueprint_id      = "nodejs"
  bundle_id         = "micro_3_0" # Smallest instance size, adjust as needed

  user_data = <<-EOF
              #!/bin/bash
              
              # Set shell explicitly
              export SHELL=/bin/bash
              
              # Log output
              exec > /var/log/user-data.log 2>&1
              
              set -e
              
              PROJECT_DIR="/opt/voter-file-tool"
              
              # Export environment variables for scripts
              export GITHUB_TOKEN="${var.github_token}"
              export DOMAIN_NAME="${var.domain_name}"
              export USE_SSL="${var.use_ssl}"
              export USE_SELF_SIGNED_SSL="${var.use_self_signed_ssl}"
              
              # Step 1: Install basic dependencies and clone repo
              echo "📦 Installing basic dependencies..."
              sudo apt-get update -y
              sudo apt-get install -y git curl
              
              # Step 2: Clone repository (scripts will be run from here)
              echo "📥 Cloning repository..."
              if [ -d "$PROJECT_DIR/.git" ]; then
                cd "$PROJECT_DIR"
                git reset --hard
                git pull origin main
              else
                sudo mkdir -p "$PROJECT_DIR"
                sudo chown -R $USER:$USER "$PROJECT_DIR"
                git clone https://matanp:${var.github_token}@github.com/matanp/voter-file-tool-2.git "$PROJECT_DIR"
                cd "$PROJECT_DIR"
              fi
              
              # Step 3: Generate .env file from template
              echo "🔧 Setting up environment variables..."
              mkdir -p "$PROJECT_DIR/apps/report-server"
              cat > "$PROJECT_DIR/apps/report-server/.env" << 'ENVEOF'
${templatefile("${path.module}/infrastructure/templates/report-server.env.tpl", {
  port = var.port
  callback_url = var.callback_url
  webhook_secret = var.webhook_secret
  r2_account_id = var.r2_account_id
  r2_access_key_id = var.r2_access_key_id
  r2_secret_access_key = var.r2_secret_access_key
  r2_bucket_name = var.r2_bucket_name
  database_url = var.database_url
  node_env = var.node_env
})}
ENVEOF
              chmod 600 "$PROJECT_DIR/apps/report-server/.env"
              
              # Step 4: Setup nginx config (conditional based on SSL settings)
              # This must be done before running the setup scripts so nginx config is ready
              if [ "${var.use_self_signed_ssl}" = "true" ]; then
                echo "🔐 Using self-signed SSL certificate..."
                bash infrastructure/scripts/generate-self-signed-cert.sh
                sudo cp infrastructure/configs/nginx-report-server-self-signed.conf /tmp/nginx-report-server.conf
              elif [ -n "${var.domain_name}" ] && [ "${var.use_ssl}" = "true" ]; then
                echo "🔒 Using Let's Encrypt SSL (domain: ${var.domain_name})..."
                # Generate nginx config with domain name (using templatefile for proper substitution)
                cat > /tmp/nginx-report-server.conf << 'NGINXEOF'
${templatefile("${path.module}/infrastructure/configs/nginx-report-server.conf", {
  domain_name = var.domain_name
})}
NGINXEOF
              else
                echo "🌐 Using HTTP-only mode (no SSL)..."
                sudo cp infrastructure/configs/nginx-report-server-http-only.conf /tmp/nginx-report-server.conf
              fi
              
              # Create nginx config directories if they don't exist
              sudo mkdir -p /etc/nginx/sites-available
              sudo mkdir -p /etc/nginx/sites-enabled
              
              sudo mv /tmp/nginx-report-server.conf /etc/nginx/sites-available/report-server
              sudo ln -sf /etc/nginx/sites-available/report-server /etc/nginx/sites-enabled/report-server
              
              # Step 5: Run master setup script (sources all individual scripts)
              # This ensures environment variables persist across all setup steps
              echo "🚀 Running master setup script..."
              cd "$PROJECT_DIR"
              bash infrastructure/scripts/00-setup-all.sh
              
              echo "✅ Deployment complete!"
              EOF
}

resource "aws_lightsail_instance_public_ports" "public_ports" {
  instance_name = aws_lightsail_instance.nodejs_server.name

  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
  }

  port_info {
    protocol  = "tcp"
    from_port = 443
    to_port   = 443
  }

  port_info {
    protocol  = "tcp"
    from_port = 8080
    to_port   = 8080
  }

  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
  }
}

resource "aws_lightsail_static_ip" "nodejs-report-server-ip" {
  name = "nodejs-report-server-ip"
}

resource "aws_lightsail_static_ip_attachment" "nodejs-report-server-ip-attachment" {
  static_ip_name = aws_lightsail_static_ip.nodejs-report-server-ip.name
  instance_name  = aws_lightsail_instance.nodejs_server.name

  lifecycle {
    prevent_destroy = true
  }
}

# Output the public IP of the Lightsail instance
output "nodejs_server_ip" {
  value = aws_lightsail_instance.nodejs_server.public_ip_address
}