# TradeMate NZ - Production Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Costs](#infrastructure-costs)
3. [VPS Setup](#vps-setup)
4. [DNS Configuration](#dns-configuration)
5. [First Deployment](#first-deployment)
6. [SSL Setup](#ssl-setup)
7. [Verifying the Deployment](#verifying-the-deployment)
8. [Updating and Redeploying](#updating-and-redeploying)
9. [Database Backups](#database-backups)
10. [Monitoring](#monitoring)
11. [Troubleshooting](#troubleshooting)
12. [Security Hardening](#security-hardening)
13. [Architecture Overview](#architecture-overview)

---

## Prerequisites

Before deploying, ensure you have:

- **Domain**: `trademate.co.nz` (or your chosen domain) registered and accessible
- **VPS**: A Linux server (Ubuntu 22.04 or 24.04 LTS recommended)
- **Accounts**:
  - Anthropic (Claude API key for AI features)
  - SMTP provider (SendGrid, AWS SES, Postmark, or Mailgun) for email
  - Stripe NZ account (when ready for paid subscriptions)
- **Local tools**: SSH client, git

### Recommended VPS Specifications

| Tier | RAM | CPU | Storage | Monthly Cost | Use Case |
|------|-----|-----|---------|-------------|----------|
| Minimum | 2 GB | 1 vCPU | 50 GB SSD | ~$12/mo | Beta (< 50 users) |
| Standard | 4 GB | 2 vCPU | 80 GB SSD | ~$24/mo | Launch (50-500 users) |
| Growth | 8 GB | 4 vCPU | 160 GB SSD | ~$48/mo | Scale (500+ users) |

Recommended providers: **DigitalOcean**, **Vultr**, **AWS Lightsail**, or **Linode**.

---

## Infrastructure Costs

Estimated monthly costs for the beta phase:

| Item | Cost (NZD) |
|------|-----------|
| VPS (2 GB DigitalOcean Droplet) | ~$18 |
| Domain renewal (annual, amortised) | ~$3 |
| Anthropic Claude API | ~$5-20 (usage-based) |
| SMTP (SendGrid free tier) | $0 |
| UptimeRobot (free tier) | $0 |
| **Total** | **~$26-41/mo** |

At 50 beta users, the per-user infrastructure cost is approximately $0.52-$0.82/mo, well within the $2/user target.

---

## VPS Setup

### Step 1: Create the Server

Using DigitalOcean as an example:

1. Create a Droplet: Ubuntu 24.04 LTS, 2 GB RAM, 1 vCPU, 50 GB SSD
2. Choose a datacenter region close to NZ (Sydney - `sgp1` or `sfo3`)
3. Add your SSH key during creation
4. Note the server IP address

### Step 2: Initial Server Access

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Create a non-root user (recommended)
adduser trademate
usermod -aG sudo trademate

# Copy SSH keys to new user
rsync --archive --chown=trademate:trademate ~/.ssh /home/trademate

# Log out and reconnect as the new user
exit
ssh trademate@YOUR_SERVER_IP
```

### Step 3: Clone the Repository

```bash
# Clone the project
sudo mkdir -p /opt/trademate
sudo chown trademate:trademate /opt/trademate
git clone https://github.com/your-org/TradeMate-NZ.git /opt/trademate
cd /opt/trademate
```

### Step 4: Run Setup Script

```bash
# Make scripts executable
chmod +x scripts/deploy.sh scripts/migrate.sh

# Run the setup (installs Docker, configures firewall, creates directories)
sudo ./scripts/deploy.sh setup
```

This will:
- Install Docker and Docker Compose
- Install certbot, fail2ban, and UFW
- Configure the firewall (allow SSH, HTTP, HTTPS only)
- Create necessary directories
- Copy the environment template

### Step 5: Configure Environment

```bash
# Edit the production environment file
nano /opt/trademate/.env.production
```

Fill in all values marked with `CHANGE_ME`. At minimum, you need:

- `POSTGRES_PASSWORD` - Generate with `openssl rand -base64 32`
- `JWT_SECRET` - Generate with `openssl rand -base64 48`
- `JWT_REFRESH_SECRET` - Generate with `openssl rand -base64 48`
- `ANTHROPIC_API_KEY` - From your Anthropic console
- `SMTP_*` settings - From your email provider

Update the `DATABASE_URL` to use the same password as `POSTGRES_PASSWORD`.

---

## DNS Configuration

Before deploying, configure DNS A records pointing to your server IP:

| Record Type | Name | Value | TTL |
|-------------|------|-------|-----|
| A | `@` (trademate.co.nz) | YOUR_SERVER_IP | 300 |
| A | `www` | YOUR_SERVER_IP | 300 |
| A | `api` | YOUR_SERVER_IP | 300 |

Verify DNS propagation:

```bash
dig trademate.co.nz +short
dig www.trademate.co.nz +short
dig api.trademate.co.nz +short
```

All three should return your server IP. DNS propagation can take up to 48 hours but usually completes within minutes.

---

## First Deployment

### Step 1: Deploy the Application (HTTP Only First)

```bash
cd /opt/trademate
./scripts/deploy.sh deploy
```

This will:
1. Build the production Docker image
2. Start PostgreSQL, Redis, API, and Nginx containers
3. Run database migrations
4. Verify the health check

### Step 2: Verify HTTP Access

```bash
# Test from the server
curl http://api.trademate.co.nz/health

# Expected response:
# {"status":"healthy","timestamp":"...","version":"0.5.0"}
```

---

## SSL Setup

Once DNS is propagated and HTTP is working:

```bash
sudo ./scripts/deploy.sh ssl-setup
```

This will:
1. Start nginx with HTTP-only configuration
2. Run certbot to obtain Let's Encrypt certificates
3. Switch to the full SSL nginx configuration
4. Set up automatic certificate renewal (daily cron job at 3am)

### Verify SSL

```bash
curl https://api.trademate.co.nz/health
curl https://trademate.co.nz
```

You can also check your SSL rating at [SSL Labs](https://www.ssllabs.com/ssltest/).

---

## Verifying the Deployment

After deployment, verify all services are running:

```bash
# Check container status
cd /opt/trademate
docker compose -f docker-compose.production.yml ps

# Expected output: all containers should show "healthy" or "running"
```

### Service Health Checks

| Service | Check Command |
|---------|--------------|
| API | `curl https://api.trademate.co.nz/health` |
| PostgreSQL | `docker exec trademate-postgres pg_isready -U trademate` |
| Redis | `docker exec trademate-redis redis-cli ping` |
| Nginx | `curl -I https://trademate.co.nz` |

### Test API Endpoints

```bash
# Register a test user
curl -X POST https://api.trademate.co.nz/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!","name":"Test User"}'

# Login
curl -X POST https://api.trademate.co.nz/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

---

## Updating and Redeploying

To deploy a new version:

```bash
cd /opt/trademate
./scripts/deploy.sh deploy
```

This pulls the latest code from git, rebuilds the API image, runs migrations, and restarts all services with zero-downtime for the database.

### Manual Steps (if needed)

```bash
# Pull code manually
git pull origin master

# Rebuild just the API
docker compose -f docker-compose.production.yml build trademate-api

# Restart just the API (no downtime for DB/Redis)
docker compose -f docker-compose.production.yml restart trademate-api

# Restart everything
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d
```

---

## Database Backups

### Manual Backup

```bash
./scripts/deploy.sh backup
```

Backups are saved to `/opt/trademate/backups/` as compressed SQL files (e.g., `trademate_20260212_143000.sql.gz`). The script automatically cleans up backups older than the most recent 30.

### Automated Backups

Set up a daily backup cron job:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2am
0 2 * * * /opt/trademate/scripts/deploy.sh backup >> /var/log/trademate-backup.log 2>&1
```

### Restoring from Backup

```bash
# Stop the API to prevent writes during restore
docker compose -f docker-compose.production.yml stop trademate-api

# Restore from backup
gunzip -c backups/trademate_20260212_143000.sql.gz | \
  docker exec -i trademate-postgres psql -U trademate -d trademate

# Restart the API
docker compose -f docker-compose.production.yml start trademate-api
```

### Off-site Backup (Recommended)

For additional safety, copy backups to an off-site location:

```bash
# Example: sync to S3
aws s3 sync /opt/trademate/backups/ s3://trademate-backups/

# Example: sync to another server
rsync -avz /opt/trademate/backups/ backup-server:/backups/trademate/
```

---

## Monitoring

### UptimeRobot (Free Tier)

Set up monitoring at [UptimeRobot](https://uptimerobot.com/):

1. Create a free account
2. Add monitors:
   - **API Health**: `https://api.trademate.co.nz/health` (HTTP check, 5-minute interval)
   - **Landing Page**: `https://trademate.co.nz` (HTTP check, 5-minute interval)
3. Configure alerts (email, Slack, or SMS)

### Docker Health Monitoring

```bash
# Check all container health statuses
docker ps --format "table {{.Names}}\t{{.Status}}"

# View resource usage
docker stats --no-stream
```

### Log Monitoring

```bash
# View all logs
./scripts/deploy.sh logs

# View specific service logs
./scripts/deploy.sh logs trademate-api
./scripts/deploy.sh logs trademate-postgres
./scripts/deploy.sh logs trademate-nginx

# View nginx access logs
docker exec trademate-nginx tail -f /var/log/nginx/access.log

# View nginx error logs
docker exec trademate-nginx tail -f /var/log/nginx/error.log
```

---

## Troubleshooting

### API Not Starting

```bash
# Check API logs
docker compose -f docker-compose.production.yml logs trademate-api

# Common issues:
# - DATABASE_URL password mismatch: ensure POSTGRES_PASSWORD matches in DATABASE_URL
# - Missing env vars: check .env.production has all required values
# - Port conflict: ensure port 29000 is not used by another process
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker ps --filter "name=trademate-postgres"

# Check PostgreSQL logs
docker compose -f docker-compose.production.yml logs trademate-postgres

# Test connection
docker exec trademate-postgres pg_isready -U trademate -d trademate

# If database needs to be recreated (WARNING: data loss)
docker compose -f docker-compose.production.yml down -v
docker compose -f docker-compose.production.yml up -d
./scripts/deploy.sh migrate
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Check nginx config syntax
docker exec trademate-nginx nginx -t

# Reload nginx after cert changes
docker exec trademate-nginx nginx -s reload
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean up Docker resources
docker system prune -a --volumes

# Clean old backups
ls -la /opt/trademate/backups/
```

### Container Keeps Restarting

```bash
# Check restart count and exit code
docker inspect trademate-api --format='{{.RestartCount}} - {{.State.ExitCode}}'

# View recent logs
docker compose -f docker-compose.production.yml logs --tail=50 trademate-api
```

### High Memory Usage

```bash
# Check container resource usage
docker stats --no-stream

# If PostgreSQL is using too much memory, adjust config in docker-compose.production.yml
# Look for the shared_buffers and effective_cache_size settings
```

---

## Security Hardening

### SSH Security

```bash
# Disable root login and password auth
sudo nano /etc/ssh/sshd_config

# Set these values:
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes

sudo systemctl restart sshd
```

### Firewall (UFW)

The setup script configures UFW automatically. To verify:

```bash
sudo ufw status verbose

# Expected output:
# Status: active
# Default: deny (incoming), allow (outgoing)
# 22/tcp    ALLOW IN    Anywhere
# 80/tcp    ALLOW IN    Anywhere
# 443/tcp   ALLOW IN    Anywhere
```

### Fail2ban

Fail2ban is installed and enabled by the setup script. To check:

```bash
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### Additional Security Measures

1. **Keep the system updated**: `sudo apt update && sudo apt upgrade -y`
2. **Set up unattended upgrades**: `sudo apt install unattended-upgrades`
3. **Use SSH keys only** (disable password authentication)
4. **Regular backups** (see Backup section)
5. **Monitor access logs**: Check nginx access logs for suspicious activity
6. **Keep Docker updated**: `sudo apt update && sudo apt install docker-ce`

### Environment File Security

```bash
# Ensure .env.production is not world-readable
chmod 600 /opt/trademate/.env.production

# Ensure only the deploy user can read it
chown trademate:trademate /opt/trademate/.env.production
```

---

## Architecture Overview

```
                    Internet
                       |
                 [DNS: trademate.co.nz]
                       |
              +--------+--------+
              |                 |
         Port 80           Port 443
              |                 |
        +-----+-----------------+-----+
        |         Nginx               |
        |   (SSL Termination)         |
        |   - Static landing page     |
        |   - Reverse proxy           |
        |   - Rate limiting           |
        |   - Security headers        |
        +-------------+---------------+
                      |
                Port 29000 (internal)
                      |
        +-------------+---------------+
        |      TradeMate API          |
        |   (Node.js / Express)       |
        |   - REST API                |
        |   - JWT Auth                |
        |   - Business Logic          |
        +------+-------------+-------+
               |             |
          Port 5432     Port 6379
          (internal)    (internal)
               |             |
        +------+------+ +---+-------+
        | PostgreSQL  | |   Redis   |
        | (Data)      | |  (Cache)  |
        +-------------+ +-----------+
```

### Container Network

All containers communicate over the `trademate-production` Docker network. Only nginx exposes ports (80, 443) to the host. PostgreSQL and Redis are not accessible from outside the Docker network.

### Data Persistence

| Volume | Purpose | Container |
|--------|---------|-----------|
| `postgres_data` | Database files | trademate-postgres |
| `postgres_backups` | Backup files | trademate-postgres |
| `redis_data` | Redis AOF persistence | trademate-redis |
| `api_uploads` | Photo uploads | trademate-api |
| `nginx_logs` | Access and error logs | trademate-nginx |

---

## Quick Reference

| Task | Command |
|------|---------|
| First-time setup | `sudo ./scripts/deploy.sh setup` |
| Deploy/update | `./scripts/deploy.sh deploy` |
| Run migrations | `./scripts/deploy.sh migrate` |
| Create backup | `./scripts/deploy.sh backup` |
| View logs | `./scripts/deploy.sh logs` |
| View API logs | `./scripts/deploy.sh logs trademate-api` |
| Setup SSL | `sudo ./scripts/deploy.sh ssl-setup` |
| Renew SSL | `sudo ./scripts/deploy.sh ssl-renew` |
| Container status | `docker compose -f docker-compose.production.yml ps` |
| Restart API | `docker compose -f docker-compose.production.yml restart trademate-api` |
| Stop everything | `docker compose -f docker-compose.production.yml down` |
| Start everything | `docker compose -f docker-compose.production.yml up -d` |
