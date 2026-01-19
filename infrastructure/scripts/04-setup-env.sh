#!/bin/bash
# Generate .env file from Terraform template

set -e

PROJECT_DIR="/opt/voter-file-tool"
ENV_FILE="$PROJECT_DIR/apps/report-server/.env"

echo "🔧 Setting up environment variables..."

# Create directory if it doesn't exist
mkdir -p "$(dirname "$ENV_FILE")"

# The .env content will be written by Terraform templatefile() directly
# This script just ensures the directory exists
# The actual .env content is written in the user_data script

# Ensure proper permissions
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

echo "✅ Environment file ready at $ENV_FILE"
