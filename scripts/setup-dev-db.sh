#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory and workspace root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$WORKSPACE_ROOT/apps/frontend"
ENV_FILE="$FRONTEND_DIR/.env"
COMPOSE_FILE="$FRONTEND_DIR/docker-compose.yml"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Setup development database environment with Docker and Prisma."
    echo ""
    echo "Options:"
    echo "  --fresh    Remove existing database volume and start fresh"
    echo "  --help     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # Use existing volume if present"
    echo "  $0 --fresh      # Remove old volume, start clean"
    echo ""
}

# Parse command line arguments
FRESH_DB=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --fresh)
            FRESH_DB=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

print_header "Dev Database Setup"

# Step 1: Check if Docker daemon is running
print_info "Checking Docker daemon status..."
if ! docker info >/dev/null 2>&1; then
    print_error "Docker daemon is not running!"
    echo ""
    echo "Please start Docker Desktop and try again."
    echo ""
    echo "To start Docker Desktop:"
    echo "  - Open Docker Desktop application"
    echo "  - Wait for the whale icon to show 'Docker Desktop is running'"
    echo ""
    exit 1
fi
print_success "Docker daemon is running"

# Step 2: Check if .env file exists
print_info "Checking for .env file..."
if [[ ! -f "$ENV_FILE" ]]; then
    print_error ".env file not found at: $ENV_FILE"
    echo ""
    echo "Please create a .env file with the following variables:"
    echo "  POSTGRES_USER=your_user"
    echo "  POSTGRES_PASSWORD=your_password"
    echo "  POSTGRES_DB=your_database"
    echo "  POSTGRES_PORT=5432"
    echo "  POSTGRES_PRISMA_URL=postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@localhost:\${POSTGRES_PORT}/\${POSTGRES_DB}"
    echo ""
    exit 1
fi
print_success ".env file found"

# Load environment variables
set -a
source "$ENV_FILE"
set +a

# Validate required environment variables
REQUIRED_VARS=("POSTGRES_USER" "POSTGRES_PASSWORD" "POSTGRES_DB" "POSTGRES_PORT")
MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        MISSING_VARS+=("$var")
    fi
done

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
    print_error "Missing required environment variables in .env file:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi
print_success "Environment variables loaded"

# Step 3: Determine if we need to handle existing volume
CONTAINER_NAME="frontend-postgres-1"
VOLUME_EXISTS=false

# Check if volume exists
if docker volume ls | grep -q "frontend_postgres"; then
    VOLUME_EXISTS=true
fi

# Determine action based on flags and existing state
if [[ "$FRESH_DB" == true ]]; then
    print_warning "Fresh database requested - will remove existing volume"
    REMOVE_VOLUME=true
elif [[ "$VOLUME_EXISTS" == true ]]; then
    print_info "Existing database volume found"
    echo ""
    echo "Do you want to:"
    echo "  1) Keep existing data (default)"
    echo "  2) Start fresh (remove volume)"
    echo ""
    read -p "Enter choice [1]: " choice
    choice=${choice:-1}
    
    if [[ "$choice" == "2" ]]; then
        REMOVE_VOLUME=true
        print_warning "Will remove existing volume and start fresh"
    else
        REMOVE_VOLUME=false
        print_info "Will keep existing data"
    fi
else
    REMOVE_VOLUME=false
    print_info "No existing volume found - will create new database"
fi

# Step 4: Stop and remove containers
print_info "Stopping existing containers..."
cd "$FRONTEND_DIR"

if [[ "$REMOVE_VOLUME" == true ]]; then
    docker compose down -v 2>/dev/null
    print_success "Containers stopped and volumes removed"
else
    docker compose down 2>/dev/null
    print_success "Containers stopped"
fi

# Step 5: Start containers
print_info "Starting Docker containers..."
if ! docker compose up -d; then
    print_error "Failed to start Docker containers"
    exit 1
fi
print_success "Docker containers started"

# Step 6: Wait for Postgres to be ready
print_info "Waiting for Postgres to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=0
SLEEP_TIME=1

while [[ $ATTEMPT -lt $MAX_ATTEMPTS ]]; do
    if docker exec "$CONTAINER_NAME" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
        print_success "Postgres is ready"
        break
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    if [[ $ATTEMPT -eq $MAX_ATTEMPTS ]]; then
        print_error "Postgres failed to become ready within ${MAX_ATTEMPTS} seconds"
        echo ""
        echo "Check container logs:"
        echo "  docker logs $CONTAINER_NAME"
        echo ""
        exit 1
    fi
    
    echo -n "."
    sleep $SLEEP_TIME
done
echo ""

# Step 7: Run Prisma migrations
print_info "Running Prisma migrations..."
cd "$FRONTEND_DIR"

if ! pnpm db_migrate; then
    print_error "Failed to run Prisma migrations"
    echo ""
    echo "You can try running manually:"
    echo "  cd $FRONTEND_DIR"
    echo "  pnpm db_migrate"
    echo ""
    exit 1
fi
print_success "Prisma migrations completed"
print_success "Shared packages rebuilt"

# Success summary
print_header "Setup Complete!"

echo "Database is ready at:"
echo "  Host: localhost"
echo "  Port: $POSTGRES_PORT"
echo "  Database: $POSTGRES_DB"
echo "  User: $POSTGRES_USER"
echo ""
echo "You can connect using:"
echo "  pnpm dbconnect"
echo ""
echo "To view logs:"
echo "  docker logs $CONTAINER_NAME"
echo ""
print_success "Dev environment is ready for development!"
