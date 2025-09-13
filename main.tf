provider "aws" {
  region = "us-west-2"
}

# Create an AWS Lightsail instance for the Node.js server
resource "aws_lightsail_instance" "nodejs_server" {
  name              = "nodejs-report-server"
  availability_zone = "us-west-2a"
  blueprint_id      = "nodejs"
  bundle_id         = "micro_3_0"  # Smallest instance size, adjust as needed


  # these are needed for puppetteer
  # sudo apt-get install -y libxcomposite1 libxi6 libpangocairo-1.0-0 libstdc++6 libxcursor1 libxdamage1 libxrandr2 libgconf-2-4 libatk1.0-0 libatk-bridge2.0-0 libgdk-pixbuf2.0-0 libgtk-3-0 libxss1 libasound2 libxshmfence1 libgbm1

  user_data = <<-EOF
              #!/bin/bash

              # Set shell explicitly
              export SHELL=/bin/bash
              
              # Log output
              exec > /var/log/user-data.log 2>&1  

              # Update and install necessary packages
              sudo apt-get update -y
              sudo apt-get install -y git curl wget gnupg
              
              # Install comprehensive dependencies for Puppeteer/Chrome
              sudo apt-get install -y \
                ca-certificates \
                fonts-liberation \
                libasound2 \
                libatk-bridge2.0-0 \
                libatk1.0-0 \
                libc6 \
                libcairo2 \
                libcups2 \
                libdbus-1-3 \
                libexpat1 \
                libfontconfig1 \
                libgbm1 \
                libgcc1 \
                libglib2.0-0 \
                libgtk-3-0 \
                libnspr4 \
                libnss3 \
                libpango-1.0-0 \
                libpangocairo-1.0-0 \
                libstdc++6 \
                libx11-6 \
                libx11-xcb1 \
                libxcb1 \
                libxcomposite1 \
                libxcursor1 \
                libxdamage1 \
                libxext6 \
                libxfixes3 \
                libxi6 \
                libxrandr2 \
                libxrender1 \
                libxss1 \
                libxtst6 \
                lsb-release \
                xdg-utils
              
              if [ ! -f /root/.bashrc ]; then
                touch /root/.bashrc
              fi

              # Install Node.js from NodeSource
              curl -fsSL -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
              
              # Add nvm to .bashrc
              echo 'export NVM_DIR="$HOME/.nvm"' >> /root/.bashrc
              echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> /root/.bashrc

              # Load nvm into the current session
              export NVM_DIR="$HOME/.nvm"
              [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
              
              nvm install 22

              npm install -g pnpm

              if [ -d "/home/bitnami/your-project/.git" ]; then
                cd /home/bitnami/your-project
                git reset --hard
                git pull origin main
              else
                git clone https://matanp:${var.github_token}@github.com/matanp/voter-file-tool-2.git /home/bitnami/your-project
              fi

              # Navigate to the project root first
              cd /home/bitnami/your-project || {
                echo "Failed to navigate to project directory"
                exit 1
              }

              # Install dependencies for shared packages first
              pnpm --filter @voter-file-tool/shared-prisma install || {
                echo "Failed to install shared-prisma"
                exit 1
              }

              pnpm --filter @voter-file-tool/shared-validators install || {
                echo "Failed to install shared-validators"
                exit 1
              }

              # Install frontend dependencies and generate Prisma client
              cd apps/frontend || {
                echo "Failed to navigate to frontend directory"
                exit 1
              }
              
              # Install frontend dependencies (needed for Prisma) - skip postinstall scripts
              pnpm install --ignore-scripts || {
                echo "Failed to install frontend dependencies"
                exit 1
              }
              
              # Generate Prisma client
              pnpm exec prisma generate || {
                echo "Failed to generate Prisma client"
                exit 1
              }
              
              # Go back to project root
              cd ../.. || {
                echo "Failed to navigate back to project root"
                exit 1
              }

              # Now build shared packages
              pnpm --filter @voter-file-tool/shared-prisma build || {
                echo "Failed to build shared-prisma"
                exit 1
              }

              pnpm --filter @voter-file-tool/shared-validators build || {
                echo "Failed to build shared-validators"
                exit 1
              }

              # Navigate to report-server directory
              cd apps/report-server || {
                echo "Failed to navigate to report-server directory"
                exit 1
              }

              touch .env

              # Install dependencies only for report-server (this will skip frontend)
              pnpm install --filter ./apps/report-server || {
                echo "pnpm install failed"
                exit 1
              }
              
              # Ensure Puppeteer downloads its bundled Chrome
              npx puppeteer browsers install chrome || {
                echo "Failed to install Puppeteer Chrome"
                exit 1
              }

              # Start the Node.js server
              pnpm start || {
                echo "pnpm start failed"
                exit 1
              }
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
    protocol = "tcp"
    from_port = 443
    to_port = 443
  }

  port_info {
    protocol = "tcp"
    from_port = 8080
    to_port = 8080
  }

  port_info {
    protocol = "tcp"
    from_port = 22
    to_port = 22
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

variable "github_token" {
  type        = string
  description = "GitHub token for cloning the repository"
}