# TradeMate NZ - Port Assignments

**DO NOT CHANGE** - These ports are configured for the project infrastructure.

## Service Ports

| Service | Port | Protocol | Purpose | Notes |
|---------|------|----------|---------|-------|
| trademate-api | 29000 | HTTP | Express API server | Main backend |
| trademate-postgres | 29432 | TCP | PostgreSQL database | Data storage |
| trademate-redis | 29379 | TCP | Redis cache | Session/cache |

## Port Range

TradeMate NZ uses the **29000-29099** port range to avoid conflicts with:
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
| Staging | https://staging-api.trademate.nz |
| Production | https://api.trademate.nz |

## Health Check Endpoints

```bash
# API health
curl http://localhost:29000/health

# PostgreSQL
docker exec trademate-postgres pg_isready -U trademate

# Redis
docker exec trademate-redis redis-cli ping
```
