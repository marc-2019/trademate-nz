#!/usr/bin/env bash
# =============================================================================
# TradeMate NZ - Production Deployment Script
# =============================================================================
#
# Usage:
#   ./scripts/deploy.sh <command>
#
# Commands:
#   setup       - Install Docker, create directories, prepare environment
#   deploy      - Pull code, build images, run migrations, restart services
#   migrate     - Run database migrations against PostgreSQL
#   backup      - Create a timestamped PostgreSQL backup
#   logs        - Show docker-compose logs (pass extra args after)
#   ssl-setup   - Obtain initial Let's Encrypt SSL certificates
#   ssl-renew   - Renew SSL certificates and reload nginx
#
# Requirements:
#   - Ubuntu 22.04 or 24.04
#   - Root or sudo access (for setup and ssl commands)
#   - Git repository cloned to /opt/trademate or current directory
#
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.production.yml"
ENV_FILE="${PROJECT_DIR}/.env.production"
BACKUP_DIR="${PROJECT_DIR}/backups"
DOMAIN="trademate.co.nz"
API_DOMAIN="api.trademate.co.nz"
CERTBOT_EMAIL="admin@trademate.co.nz"

# =============================================================================
# Colors
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${CYAN}==>${NC} ${CYAN}$1${NC}"
}

check_env_file() {
    if [ ! -f "${ENV_FILE}" ]; then
        log_error ".env.production not found at ${ENV_FILE}"
        log_info "Copy and configure: cp .env.production.example .env.production"
        exit 1
    fi
}

docker_compose() {
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"
}

# =============================================================================
# Command: setup
# =============================================================================
cmd_setup() {
    log_step "Setting up TradeMate NZ production environment"

    # Check if running as root or with sudo
    if [ "$(id -u)" -ne 0 ]; then
        log_error "Setup requires root privileges. Run with sudo."
        exit 1
    fi

    # Update system
    log_info "Updating system packages..."
    apt-get update -qq
    apt-get upgrade -y -qq

    # Install prerequisites
    log_info "Installing prerequisites..."
    apt-get install -y -qq \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        ufw \
        fail2ban \
        git \
        certbot

    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
        log_info "Installing Docker..."
        curl -fsSL https://get.docker.com | sh
        systemctl enable docker
        systemctl start docker
        log_success "Docker installed"
    else
        log_success "Docker already installed: $(docker --version)"
    fi

    # Install Docker Compose plugin if not present
    if ! docker compose version &> /dev/null; then
        log_info "Installing Docker Compose plugin..."
        apt-get install -y -qq docker-compose-plugin
        log_success "Docker Compose plugin installed"
    else
        log_success "Docker Compose already installed: $(docker compose version)"
    fi

    # Create directories
    log_info "Creating directories..."
    mkdir -p "${PROJECT_DIR}/nginx/html"
    mkdir -p "${PROJECT_DIR}/backups"
    mkdir -p /var/www/certbot
    mkdir -p /var/log/nginx

    # Copy env file if it doesn't exist
    if [ ! -f "${ENV_FILE}" ]; then
        cp "${PROJECT_DIR}/.env.production.example" "${ENV_FILE}"
        log_warn ".env.production created from example. Edit it with your values!"
        log_warn "Run: nano ${ENV_FILE}"
    else
        log_success ".env.production already exists"
    fi

    # Create placeholder landing page
    if [ ! -f "${PROJECT_DIR}/nginx/html/index.html" ]; then
        cat > "${PROJECT_DIR}/nginx/html/index.html" <<'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TradeMate NZ - Coming Soon</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               display: flex; justify-content: center; align-items: center;
               min-height: 100vh; background: linear-gradient(135deg, #1a365d 0%, #2d5016 100%);
               color: white; text-align: center; padding: 2rem; }
        h1 { font-size: 2.5rem; margin-bottom: 1rem; }
        p { font-size: 1.2rem; opacity: 0.9; max-width: 600px; line-height: 1.6; }
        .badge { display: inline-block; background: rgba(255,255,255,0.2);
                 padding: 0.5rem 1rem; border-radius: 999px; margin-top: 1.5rem;
                 font-size: 0.9rem; }
    </style>
</head>
<body>
    <div>
        <h1>TradeMate NZ</h1>
        <p>The all-in-one compliance and business management platform for New Zealand tradies.</p>
        <div class="badge">Coming Soon</div>
    </div>
</body>
</html>
HTMLEOF
        log_success "Placeholder landing page created"
    fi

    # Configure firewall
    log_info "Configuring firewall (UFW)..."
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    log_success "Firewall configured (SSH, HTTP, HTTPS allowed)"

    # Configure fail2ban
    log_info "Configuring fail2ban..."
    systemctl enable fail2ban
    systemctl start fail2ban
    log_success "fail2ban enabled"

    echo ""
    log_success "Setup complete!"
    echo ""
    log_info "Next steps:"
    echo "  1. Edit .env.production with your values: nano ${ENV_FILE}"
    echo "  2. Configure DNS A records for ${DOMAIN}, www.${DOMAIN}, ${API_DOMAIN}"
    echo "  3. Run SSL setup: ./scripts/deploy.sh ssl-setup"
    echo "  4. Deploy the application: ./scripts/deploy.sh deploy"
}

# =============================================================================
# Command: deploy
# =============================================================================
cmd_deploy() {
    log_step "Deploying TradeMate NZ"
    check_env_file

    # Pull latest code if in a git repo
    if [ -d "${PROJECT_DIR}/.git" ]; then
        log_info "Pulling latest code..."
        cd "${PROJECT_DIR}"
        git pull origin master
        log_success "Code updated"
    fi

    # Build production images
    log_info "Building production Docker images..."
    docker_compose build --no-cache trademate-api
    log_success "API image built"

    # Stop existing containers (if running)
    log_info "Stopping existing containers..."
    docker_compose down --remove-orphans 2>/dev/null || true

    # Start database and redis first
    log_info "Starting database and cache..."
    docker_compose up -d trademate-postgres trademate-redis

    # Wait for database to be healthy
    log_info "Waiting for PostgreSQL to be ready..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if docker_compose exec -T trademate-postgres pg_isready -U trademate -d trademate > /dev/null 2>&1; then
            break
        fi
        retries=$((retries - 1))
        sleep 2
    done

    if [ $retries -eq 0 ]; then
        log_error "PostgreSQL failed to start within 60 seconds"
        docker_compose logs trademate-postgres
        exit 1
    fi
    log_success "PostgreSQL is ready"

    # Run migrations
    log_info "Running database migrations..."
    cmd_migrate

    # Start all services
    log_info "Starting all services..."
    docker_compose up -d
    log_success "All containers started"

    # Wait and verify
    log_info "Waiting for services to initialize..."
    sleep 10

    # Check health
    if docker_compose exec -T trademate-api wget --no-verbose --tries=3 --spider http://localhost:29000/health 2>/dev/null; then
        log_success "API health check passed"
    else
        log_warn "API health check failed - checking logs..."
        docker_compose logs --tail=20 trademate-api
    fi

    echo ""
    log_success "Deployment complete!"
    docker_compose ps
}

# =============================================================================
# Command: migrate
# =============================================================================
cmd_migrate() {
    log_step "Running database migrations"
    check_env_file

    # Source env file to get password
    set -a
    source "${ENV_FILE}"
    set +a

    local PG_USER="${POSTGRES_USER:-trademate}"
    local PG_DB="${POSTGRES_DB:-trademate}"

    # Check if postgres container is running
    if ! docker ps --filter "name=trademate-postgres" --filter "status=running" -q | grep -q .; then
        log_error "PostgreSQL container is not running. Start it first."
        exit 1
    fi

    # Run init.sql
    log_info "Applying init.sql..."
    if docker exec -i trademate-postgres psql -U "${PG_USER}" -d "${PG_DB}" < "${PROJECT_DIR}/database/init.sql" 2>&1; then
        log_success "init.sql applied"
    else
        log_warn "init.sql had warnings (tables may already exist - this is normal)"
    fi

    # Run numbered migrations in order
    if [ -d "${PROJECT_DIR}/database/migrations" ]; then
        for migration in "${PROJECT_DIR}/database/migrations"/*.sql; do
            if [ -f "${migration}" ]; then
                local filename
                filename=$(basename "${migration}")
                log_info "Applying migration: ${filename}..."
                if docker exec -i trademate-postgres psql -U "${PG_USER}" -d "${PG_DB}" < "${migration}" 2>&1; then
                    log_success "  ${filename} applied"
                else
                    log_warn "  ${filename} had warnings (may already be applied)"
                fi
            fi
        done
    fi

    log_success "Migrations complete"
}

# =============================================================================
# Command: backup
# =============================================================================
cmd_backup() {
    log_step "Creating database backup"
    check_env_file

    # Source env file
    set -a
    source "${ENV_FILE}"
    set +a

    local PG_USER="${POSTGRES_USER:-trademate}"
    local PG_DB="${POSTGRES_DB:-trademate}"
    local TIMESTAMP
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    local BACKUP_FILE="${BACKUP_DIR}/trademate_${TIMESTAMP}.sql.gz"

    mkdir -p "${BACKUP_DIR}"

    # Check if postgres container is running
    if ! docker ps --filter "name=trademate-postgres" --filter "status=running" -q | grep -q .; then
        log_error "PostgreSQL container is not running."
        exit 1
    fi

    log_info "Dumping database to ${BACKUP_FILE}..."
    docker exec trademate-postgres pg_dump -U "${PG_USER}" -d "${PG_DB}" --no-owner --no-acl | gzip > "${BACKUP_FILE}"

    local FILESIZE
    FILESIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
    log_success "Backup created: ${BACKUP_FILE} (${FILESIZE})"

    # Clean up old backups (keep last 30)
    local BACKUP_COUNT
    BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/trademate_*.sql.gz 2>/dev/null | wc -l)
    if [ "${BACKUP_COUNT}" -gt 30 ]; then
        log_info "Cleaning old backups (keeping last 30)..."
        ls -1t "${BACKUP_DIR}"/trademate_*.sql.gz | tail -n +31 | xargs rm -f
        log_success "Old backups cleaned"
    fi

    log_info "Total backups: $(ls -1 "${BACKUP_DIR}"/trademate_*.sql.gz 2>/dev/null | wc -l)"
}

# =============================================================================
# Command: logs
# =============================================================================
cmd_logs() {
    check_env_file
    # Pass any extra arguments to docker-compose logs
    docker_compose logs -f --tail=100 "$@"
}

# =============================================================================
# Command: ssl-setup
# =============================================================================
cmd_ssl_setup() {
    log_step "Setting up SSL certificates with Let's Encrypt"

    if [ "$(id -u)" -ne 0 ]; then
        log_error "SSL setup requires root privileges. Run with sudo."
        exit 1
    fi

    check_env_file

    # Step 1: Use initial (HTTP-only) nginx config
    log_info "Configuring nginx for HTTP-only (certbot challenge)..."
    cp "${PROJECT_DIR}/nginx/nginx.initial.conf" "${PROJECT_DIR}/nginx/nginx.conf.active"

    # Temporarily use the initial config
    # We need to swap the nginx config volume mount
    local NGINX_CONF_BAK="${PROJECT_DIR}/nginx/nginx.conf"
    local NGINX_CONF_INITIAL="${PROJECT_DIR}/nginx/nginx.initial.conf"

    # Back up the full SSL config
    if [ -f "${NGINX_CONF_BAK}" ]; then
        cp "${NGINX_CONF_BAK}" "${PROJECT_DIR}/nginx/nginx.conf.ssl"
    fi

    # Use initial config
    cp "${NGINX_CONF_INITIAL}" "${NGINX_CONF_BAK}"

    # Step 2: Start services with HTTP-only nginx
    log_info "Starting services with HTTP-only nginx..."
    docker_compose up -d

    # Wait for nginx to start
    sleep 5

    # Verify HTTP is working
    if curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}/.well-known/acme-challenge/test" 2>/dev/null | grep -q "404\|200"; then
        log_success "HTTP server is responding"
    else
        log_warn "HTTP server may not be responding yet - continuing anyway..."
    fi

    # Step 3: Obtain certificates
    log_info "Requesting SSL certificates from Let's Encrypt..."
    certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "${CERTBOT_EMAIL}" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d "${DOMAIN}" \
        -d "www.${DOMAIN}" \
        -d "${API_DOMAIN}"

    if [ $? -ne 0 ]; then
        log_error "Certbot failed to obtain certificates"
        log_info "Make sure DNS A records point to this server for:"
        echo "  - ${DOMAIN}"
        echo "  - www.${DOMAIN}"
        echo "  - ${API_DOMAIN}"
        exit 1
    fi

    log_success "SSL certificates obtained"

    # Step 4: Copy SSL params config
    log_info "Installing SSL parameters..."
    cp "${PROJECT_DIR}/nginx/ssl-params.conf" "${PROJECT_DIR}/nginx/ssl-params.conf"
    docker cp "${PROJECT_DIR}/nginx/ssl-params.conf" trademate-nginx:/etc/nginx/ssl-params.conf 2>/dev/null || true

    # Step 5: Switch to full SSL nginx config
    log_info "Switching to full SSL nginx configuration..."
    if [ -f "${PROJECT_DIR}/nginx/nginx.conf.ssl" ]; then
        cp "${PROJECT_DIR}/nginx/nginx.conf.ssl" "${NGINX_CONF_BAK}"
    else
        log_error "SSL nginx config not found. Please check nginx/nginx.conf"
        exit 1
    fi

    # Restart nginx with SSL config
    docker_compose restart trademate-nginx

    # Clean up
    rm -f "${PROJECT_DIR}/nginx/nginx.conf.active"

    # Wait and verify
    sleep 5

    log_info "Verifying SSL..."
    if curl -s -o /dev/null -w "%{http_code}" "https://${API_DOMAIN}/health" 2>/dev/null | grep -q "200"; then
        log_success "HTTPS is working!"
    else
        log_warn "HTTPS verification failed - it may take a moment for nginx to reload"
        log_info "Try manually: curl https://${API_DOMAIN}/health"
    fi

    # Step 6: Set up auto-renewal cron job
    log_info "Setting up auto-renewal cron job..."
    local CRON_JOB="0 3 * * * ${PROJECT_DIR}/scripts/deploy.sh ssl-renew >> /var/log/trademate-ssl-renew.log 2>&1"
    (crontab -l 2>/dev/null | grep -v "trademate.*ssl-renew"; echo "${CRON_JOB}") | crontab -
    log_success "Auto-renewal cron job installed (runs daily at 3am)"

    echo ""
    log_success "SSL setup complete!"
    echo ""
    log_info "Your site is now available at:"
    echo "  - https://${DOMAIN}"
    echo "  - https://${API_DOMAIN}/health"
}

# =============================================================================
# Command: ssl-renew
# =============================================================================
cmd_ssl_renew() {
    log_step "Renewing SSL certificates"

    if [ "$(id -u)" -ne 0 ]; then
        log_error "SSL renewal requires root privileges. Run with sudo."
        exit 1
    fi

    certbot renew --quiet --deploy-hook "docker exec trademate-nginx nginx -s reload"

    if [ $? -eq 0 ]; then
        log_success "SSL certificates renewed and nginx reloaded"
    else
        log_error "SSL renewal failed"
        exit 1
    fi
}

# =============================================================================
# Usage / Help
# =============================================================================
show_usage() {
    echo ""
    echo -e "${CYAN}TradeMate NZ - Production Deployment Script${NC}"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  setup       Install Docker, create directories, prepare environment"
    echo "  deploy      Pull code, build images, run migrations, restart services"
    echo "  migrate     Run database migrations against PostgreSQL"
    echo "  backup      Create a timestamped PostgreSQL database backup"
    echo "  logs        Show docker-compose logs (pass service names after)"
    echo "  ssl-setup   Obtain initial Let's Encrypt SSL certificates"
    echo "  ssl-renew   Renew SSL certificates and reload nginx"
    echo ""
    echo "Examples:"
    echo "  $0 setup                    # First-time server setup"
    echo "  $0 deploy                   # Deploy or update the application"
    echo "  $0 backup                   # Create database backup"
    echo "  $0 logs trademate-api       # View API logs"
    echo "  $0 logs                     # View all logs"
    echo "  sudo $0 ssl-setup           # Set up SSL certificates"
    echo "  sudo $0 ssl-renew           # Renew SSL certificates"
    echo ""
}

# =============================================================================
# Main Entry Point
# =============================================================================
main() {
    cd "${PROJECT_DIR}"

    case "${1:-}" in
        setup)
            cmd_setup
            ;;
        deploy)
            cmd_deploy
            ;;
        migrate)
            cmd_migrate
            ;;
        backup)
            cmd_backup
            ;;
        logs)
            shift
            cmd_logs "$@"
            ;;
        ssl-setup)
            cmd_ssl_setup
            ;;
        ssl-renew)
            cmd_ssl_renew
            ;;
        *)
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
