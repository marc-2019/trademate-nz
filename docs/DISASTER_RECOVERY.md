# TradeMate NZ - Disaster Recovery Guide

**Version**: 1.0.0 | **Last Updated**: 2026-02-02 | **RTO**: 4 hours | **RPO**: 24 hours

---

## Quick Recovery Checklist

```
[ ] 1. Clone/download codebase
[ ] 2. Restore environment configuration
[ ] 3. Start Docker infrastructure
[ ] 4. Restore database from backup
[ ] 5. Verify API health
[ ] 6. Test mobile app connectivity
[ ] 7. Verify integrations (Xero, Stripe, Twilio)
```

---

## Prerequisites

### Software Requirements
- Git
- Docker & Docker Compose
- Node.js 20+
- Expo CLI

### Access Requirements
- GitHub repository access
- Database backup location access
- Password manager access (1Password/Bitwarden)
- Cloud provider console access (if applicable)

---

## 1. Clone/Download Codebase

```bash
# Option A: Clone from GitHub
git clone https://github.com/instilligent/trademate-nz.git
cd trademate-nz

# Option B: Download from backup
# Extract from backup location
unzip trademate-nz-backup-YYYYMMDD.zip
cd trademate-nz
```

---

## 2. Secrets & Configuration

### Critical Secrets (from password manager)

| Secret | Purpose | Recovery Location |
|--------|---------|-------------------|
| `POSTGRES_PASSWORD` | Database access | 1Password > TradeMate |
| `JWT_SECRET` | Auth tokens | 1Password > TradeMate |
| `ANTHROPIC_API_KEY` | AI features | 1Password > API Keys |
| `XERO_CLIENT_SECRET` | Accounting | 1Password > Xero |
| `STRIPE_SECRET_KEY` | Payments | Stripe Dashboard |
| `TWILIO_AUTH_TOKEN` | SMS | Twilio Console |

### Restore .env File

```bash
# Copy template
cp .env.example .env

# Fill in secrets from password manager
# CRITICAL: JWT_SECRET must match production for existing tokens
```

**WARNING**: If `JWT_SECRET` is lost/changed, all users will be logged out.

---

## 3. Start Docker Infrastructure

```bash
# Start all services
docker-compose up -d

# Verify containers running
docker ps

# Expected:
# - trademate-postgres (port 29432)
# - trademate-redis (port 29379)
```

### Troubleshooting Docker

```bash
# View logs
docker-compose logs -f

# Reset if needed
docker-compose down -v
docker-compose up -d
```

---

## 4. Restore Database

### From Automated Backup

```bash
# Find latest backup
ls -la /backups/trademate/

# Restore
docker exec -i trademate-postgres psql -U trademate -d trademate < backup-YYYYMMDD.sql
```

### From Manual Backup

```bash
# If backup is compressed
gunzip trademate-backup-YYYYMMDD.sql.gz

# Restore
docker exec -i trademate-postgres psql -U trademate -d trademate < trademate-backup-YYYYMMDD.sql
```

### Verify Database

```bash
# Connect to database
docker exec -it trademate-postgres psql -U trademate -d trademate

# Check tables exist
\dt

# Check user count
SELECT COUNT(*) FROM users;
```

---

## 5. Start Application

```bash
# Install dependencies
npm install

# Start API
cd apps/api
npm run build
npm start

# Or for development
npm run dev
```

---

## 6. Verify Recovery

### Health Checks

```bash
# API health
curl http://localhost:29000/health
# Expected: {"status":"healthy","service":"trademate-api",...}

# Database connection
docker exec trademate-postgres pg_isready -U trademate
# Expected: accepting connections

# Redis connection
docker exec trademate-redis redis-cli ping
# Expected: PONG
```

### Functional Tests

1. **Auth Flow**: Register new user, login, refresh token
2. **SWMS Generation**: Create new SWMS document
3. **PDF Export**: Generate PDF from SWMS
4. **Offline Sync**: Test mobile offline mode

---

## 7. External Services

### Xero Integration
- Login to [Xero Developer Portal](https://developer.xero.com/)
- Verify app credentials match .env
- Re-authorize if needed

### Stripe
- Login to [Stripe Dashboard](https://dashboard.stripe.com/)
- Verify webhook endpoint URL
- Update webhook secret if changed

### Twilio
- Login to [Twilio Console](https://console.twilio.com/)
- Verify phone number active
- Check SMS credits

---

## Backup Procedures

### Manual Database Backup

```bash
# Create backup
docker exec trademate-postgres pg_dump -U trademate trademate > backup-$(date +%Y%m%d).sql

# Compress
gzip backup-$(date +%Y%m%d).sql
```

### Automated Backup (recommended)

Set up scheduled task to run daily:

```bash
# Windows Task Scheduler or cron
0 2 * * * /path/to/scripts/backup.sh
```

### Backup Checklist

```
[ ] Database dump (daily)
[ ] .env file (encrypted, on credential change)
[ ] SWMS templates (on change)
[ ] User uploads (if local storage)
```

---

## Recovery Time Estimates

| Scenario | RTO | Steps |
|----------|-----|-------|
| Code loss only | 30 min | Clone, configure, start |
| Database loss | 2 hours | Clone, configure, restore backup |
| Full server loss | 4 hours | New server, full restore |
| Secret key loss | Variable | May require user re-auth |

---

## Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| Tech Lead | [Email] | Infrastructure, database |
| DevOps | [Email] | Docker, backups |
| Product | [Email] | Business decisions |

---

## Post-Recovery Checklist

```
[ ] All services healthy
[ ] Database restored and verified
[ ] Test user can login
[ ] Test SWMS generation works
[ ] External integrations connected
[ ] Monitoring alerts configured
[ ] Team notified of recovery
[ ] Incident documented
```

---

## Appendix: Common Issues

### Issue: Database connection refused
**Solution**: Wait for PostgreSQL to fully start (30-60 seconds), check Docker logs

### Issue: JWT tokens invalid after recovery
**Solution**: Ensure JWT_SECRET matches original, or accept user re-login

### Issue: Xero integration fails
**Solution**: Re-authorize via OAuth flow, tokens may have expired

### Issue: Mobile app can't connect
**Solution**: Verify API_URL in mobile app points to correct server
