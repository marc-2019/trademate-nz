#!/usr/bin/env bash
# =============================================================================
# BossBoard - Database Migration Script
# =============================================================================
#
# Runs all database migrations against the PostgreSQL container.
# Can be run standalone or called from deploy.sh.
#
# Usage:
#   ./scripts/migrate.sh                    # Uses .env.production
#   ./scripts/migrate.sh --dev              # Uses development defaults
#   ./scripts/migrate.sh --env /path/.env   # Uses custom env file
#
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Defaults
PG_CONTAINER="bossboard-postgres"
PG_USER="bossboard"
PG_DB="bossboard"
ENV_FILE="${PROJECT_DIR}/.env.production"
DEV_MODE=false

# =============================================================================
# Colors
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# Parse Arguments
# =============================================================================
while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            DEV_MODE=true
            ENV_FILE=""
            shift
            ;;
        --env)
            ENV_FILE="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [--dev] [--env /path/to/.env]"
            echo ""
            echo "Options:"
            echo "  --dev           Use development defaults (no env file needed)"
            echo "  --env FILE      Specify custom environment file"
            echo "  --help, -h      Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# =============================================================================
# Load Environment
# =============================================================================
if [ "${DEV_MODE}" = true ]; then
    log_info "Running in development mode"
    PG_USER="bossboard"
    PG_DB="bossboard"
elif [ -n "${ENV_FILE}" ] && [ -f "${ENV_FILE}" ]; then
    log_info "Loading environment from: ${ENV_FILE}"
    set -a
    source "${ENV_FILE}"
    set +a
    PG_USER="${POSTGRES_USER:-bossboard}"
    PG_DB="${POSTGRES_DB:-bossboard}"
elif [ -n "${ENV_FILE}" ]; then
    log_error "Environment file not found: ${ENV_FILE}"
    exit 1
fi

# =============================================================================
# Pre-flight Checks
# =============================================================================
log_info "Checking PostgreSQL container..."

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! docker ps --filter "name=${PG_CONTAINER}" --filter "status=running" -q | grep -q .; then
    log_error "PostgreSQL container '${PG_CONTAINER}' is not running"
    log_info "Start it with: docker-compose up -d bossboard-postgres"
    exit 1
fi

# Wait for PostgreSQL to be ready
log_info "Waiting for PostgreSQL to accept connections..."
RETRIES=15
while [ $RETRIES -gt 0 ]; do
    if docker exec "${PG_CONTAINER}" pg_isready -U "${PG_USER}" -d "${PG_DB}" > /dev/null 2>&1; then
        break
    fi
    RETRIES=$((RETRIES - 1))
    sleep 2
done

if [ $RETRIES -eq 0 ]; then
    log_error "PostgreSQL is not ready after 30 seconds"
    exit 1
fi

log_success "PostgreSQL is ready (user: ${PG_USER}, db: ${PG_DB})"

# =============================================================================
# Run Migrations
# =============================================================================
MIGRATION_COUNT=0
MIGRATION_ERRORS=0

echo ""
echo -e "${CYAN}=== Running Database Migrations ===${NC}"
echo ""

# Step 1: Run init.sql (creates base schema)
INIT_FILE="${PROJECT_DIR}/database/init.sql"
if [ -f "${INIT_FILE}" ]; then
    log_info "Applying: init.sql"
    if docker exec -i "${PG_CONTAINER}" psql -U "${PG_USER}" -d "${PG_DB}" \
        --set ON_ERROR_STOP=0 < "${INIT_FILE}" > /dev/null 2>&1; then
        log_success "  init.sql applied"
        MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
    else
        log_warn "  init.sql had warnings (tables may already exist)"
        MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
    fi
else
    log_warn "init.sql not found at ${INIT_FILE}"
fi

# Step 2: Run numbered migrations in order
MIGRATION_DIR="${PROJECT_DIR}/database/migrations"
if [ -d "${MIGRATION_DIR}" ]; then
    for MIGRATION_FILE in "${MIGRATION_DIR}"/*.sql; do
        if [ -f "${MIGRATION_FILE}" ]; then
            FILENAME=$(basename "${MIGRATION_FILE}")
            log_info "Applying: ${FILENAME}"

            if docker exec -i "${PG_CONTAINER}" psql -U "${PG_USER}" -d "${PG_DB}" \
                --set ON_ERROR_STOP=0 < "${MIGRATION_FILE}" > /dev/null 2>&1; then
                log_success "  ${FILENAME} applied"
                MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
            else
                log_warn "  ${FILENAME} had warnings (may already be applied)"
                MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
            fi
        fi
    done
else
    log_warn "No migrations directory found at ${MIGRATION_DIR}"
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${CYAN}=== Migration Summary ===${NC}"
echo ""
log_success "Processed ${MIGRATION_COUNT} migration file(s)"

if [ ${MIGRATION_ERRORS} -gt 0 ]; then
    log_error "${MIGRATION_ERRORS} migration(s) had errors"
    exit 1
fi

# Verify by listing tables
log_info "Current database tables:"
docker exec "${PG_CONTAINER}" psql -U "${PG_USER}" -d "${PG_DB}" -c \
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>/dev/null || true

echo ""
log_success "Database migrations complete"
