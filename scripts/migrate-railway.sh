#!/usr/bin/env bash
# =============================================================================
# Railway Database Migration Script
# =============================================================================
#
# Runs all SQL migrations against a PostgreSQL database using DATABASE_URL.
# Works with Railway's managed PostgreSQL or any remote PostgreSQL.
#
# Usage:
#   DATABASE_URL="postgresql://..." ./scripts/migrate-railway.sh
#   railway run ./scripts/migrate-railway.sh   (uses Railway's env vars)
#
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Colors
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
# Check prerequisites
# =============================================================================
if [ -z "${DATABASE_URL:-}" ]; then
    log_error "DATABASE_URL environment variable is not set"
    echo ""
    echo "Usage:"
    echo "  DATABASE_URL=\"postgresql://...\" $0"
    echo "  railway run $0"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    log_error "psql is not installed. Install PostgreSQL client tools."
    echo "  macOS:   brew install postgresql"
    echo "  Ubuntu:  sudo apt install postgresql-client"
    echo "  Windows: Install PostgreSQL or use WSL"
    exit 1
fi

# Test connection
log_info "Testing database connection..."
if ! psql "${DATABASE_URL}" -c "SELECT 1;" > /dev/null 2>&1; then
    log_error "Cannot connect to database. Check DATABASE_URL."
    exit 1
fi
log_success "Database connection OK"

# =============================================================================
# Run migrations
# =============================================================================
MIGRATION_COUNT=0

echo ""
echo -e "${CYAN}=== Running Database Migrations ===${NC}"
echo ""

# Step 1: init.sql
INIT_FILE="${PROJECT_DIR}/database/init.sql"
if [ -f "${INIT_FILE}" ]; then
    log_info "Applying: init.sql"
    if psql "${DATABASE_URL}" -f "${INIT_FILE}" > /dev/null 2>&1; then
        log_success "  init.sql applied"
    else
        log_warn "  init.sql had warnings (tables may already exist)"
    fi
    MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
fi

# Step 2: Numbered migrations
MIGRATION_DIR="${PROJECT_DIR}/database/migrations"
if [ -d "${MIGRATION_DIR}" ]; then
    for MIGRATION_FILE in "${MIGRATION_DIR}"/*.sql; do
        if [ -f "${MIGRATION_FILE}" ]; then
            FILENAME=$(basename "${MIGRATION_FILE}")
            log_info "Applying: ${FILENAME}"
            if psql "${DATABASE_URL}" -f "${MIGRATION_FILE}" > /dev/null 2>&1; then
                log_success "  ${FILENAME} applied"
            else
                log_warn "  ${FILENAME} had warnings (may already be applied)"
            fi
            MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
        fi
    done
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${CYAN}=== Migration Summary ===${NC}"
echo ""
log_success "Processed ${MIGRATION_COUNT} migration file(s)"

# List tables
log_info "Current database tables:"
psql "${DATABASE_URL}" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>/dev/null || true

echo ""
log_success "Database migrations complete"
