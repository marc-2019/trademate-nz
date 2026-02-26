# BossBoard - Port Assignments

**DO NOT CHANGE** - These ports are configured for the project infrastructure.

## Service Ports

| Service | Port | Protocol | Purpose | Notes |
|---------|------|----------|---------|-------|
| bossboard-api | 29000 | HTTP | Express API server | Main backend |
| bossboard-postgres | 29432 | TCP | PostgreSQL database | Data storage |
| bossboard-redis | 29379 | TCP | Redis cache | Session/cache |

## Port Range

BossBoard uses the **29000-29099** port range to avoid conflicts with:
- CortexForge (28000-28099)
- Other Instilligent projects

## External Integrations

| Service | URL | Purpose |
|---------|-----|---------|
| Xero API | api.xero.com | Accounting integration |
| Stripe | api.stripe.com | Payment processing |
| Twilio | api.twilio.com | SMS notifications |
| Claude API | api.anthropic.com | AI document generation |

## Development vs Production

| Environment | API URL |
|-------------|---------|
| Local | http://localhost:29000 |
| Staging | TBD |
| Production | TBD |

## Health Check Endpoints

```bash
# API health
curl http://localhost:29000/health

# PostgreSQL
docker exec bossboard-postgres pg_isready -U bossboard

# Redis
docker exec bossboard-redis redis-cli ping
```
