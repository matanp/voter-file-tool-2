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
              sudo apt-get install -y git curl
              sudo apt-get install -y libnss3 libatk-bridge2.0-0 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libgtk-3-0 libasound2

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
              
              nvm install 20

              npm install -g pnpm

              if [ -d "/home/bitnami/your-project/.git" ]; then
                cd /home/bitnami/your-project
                git reset --hard
                git pull origin main
              else
                git clone https://matanp:${var.github_token}@github.com/matanp/voter-file-tool-2.git /home/bitnami/your-project
              fi

              # Navigate to the cloned project directory
              cd /home/bitnami/your-project/apps/report-server || {
                echo "Failed to navigate to project directory"
                exit 1
              }

              touch .env

              # Install dependencies
              pnpm install || {
                echo "pnpm install failed"
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