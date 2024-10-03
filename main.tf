provider "aws" {
  region = "us-west-2"
}

# Create an AWS Lightsail instance for the Node.js server
resource "aws_lightsail_instance" "nodejs_server" {
  name              = "nodejs-report-server"
  availability_zone = "us-west-2a"
  blueprint_id      = "nodejs"
  bundle_id         = "nano_2_0"  # Smallest instance size, adjust as needed


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

              # sudo su bitnami

              # Set up SSH key
              mkdir -p /home/bitnami/.ssh

              # Write the private key to id_rsa
              # echo "${var.ssh_private_key}"
              echo "${var.ssh_private_key}" > /home/bitnami/.ssh/id_rsa
              sudo chmod 600 /home/bitnami/.ssh/id_rsa  # Set the correct permissions for the private key
              whoami
              echo $(whoami)

              # Check if the public key exists; if not, create it from the private key
              # if [ ! -f /home/bitnami/.ssh/id_rsa ]; then
                  # ssh-keygen -y -f /home/bitnami/.ssh/id_rsa > /home/bitnami/.ssh/id_rsa.pub
                  # chmod 644 /home/bitnami/.ssh/id_rsa.pub  # Set the correct permissions for the public key
              # fi

              # Add GitHub to known hosts
              # ssh-keyscan -H github.com >> /home/bitnami/.ssh/known_hosts
              # chmod 644 /home/bitnami/.ssh/known_hosts  # Set the correct permissions for known_hosts

              # Test SSH connection
              # ssh -T -i /home/bitnami/.ssh/id_rsa git@github.com

              # Clone the repository
              git clone https://matanp:${var.github_token}@github.com/matanp/voter-file-tool-2.git /home/bitnami/your-project || {
                echo "Git clone failed"
                exit 1
              }

              # Navigate to the cloned project directory
              cd /home/ubuntu/your-project/apps/report-server || {
                echo "Failed to navigate to project directory"
                exit 1
              }

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

# Output the public IP of the Lightsail instance
output "nodejs_server_ip" {
  value = aws_lightsail_instance.nodejs_server.public_ip_address
}


variable "sshkey" {
  description = "Public ssh key for git operations"
  type        = string
}

variable "ssh_private_key" {
  type        = string
  description = "Private SSH key for Git operations"
}

variable "github_token" {
  type        = string
  description = "GitHub token for cloning the repository"
}