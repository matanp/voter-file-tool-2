terraform {
  required_providers {
    vercel = {
      source = "vercel/vercel"
      version = "~> 0.3"
    }
  }
}

provider "aws" {
  region = "us-west-2"  
}

provider "vercel" {
  api_token = var.vercel_api_token
}

# Create an AWS Lightsail instance for the Node.js server
resource "aws_lightsail_instance" "nodejs_server" {
  name              = "nodejs-report-server"
  availability_zone = "us-west-2a" 
  blueprint_id      = "nodejs"
  bundle_id         = "nano_2_0"  # Smallest instance size, adjust as needed

  user_data = <<-EOF
              #!/bin/bash
              sudo apt-get update
              sudo apt-get install -y git curl
              curl -fsSL https://get.pnpm.io/install.sh | sh -
              source /root/.bashrc
              git clone https://github.com/matanp/voter-file-tool-2.git
              cd apps/report-server
              pnpm install
              pnpm start
              EOF
}

# Output the public IP of the Lightsail instance
output "nodejs_server_ip" {
  value = aws_lightsail_instance.nodejs_server.public_ip_address
}

# Variable for Vercel API token
variable "vercel_api_token" {
  type        = string
  description = "Vercel API token for authentication"
}