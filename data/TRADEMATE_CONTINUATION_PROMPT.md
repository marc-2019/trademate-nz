# TradeMate NZ - Continuation Prompt

Use this prompt to resume work on TradeMate NZ in a new Claude Code session.

---

## Project Context

- **Project**: TradeMate NZ - Mobile compliance & cashflow platform for NZ tradies
- **Location**: `D:\TradeMate-NZ`
- **Main Branch**: `main`
- **Current Version**: 0.1.0

## Architecture Summary

- **Frontend**: React Native (Expo) - offline-first with SQLite
- **Backend**: Node.js/Express + TypeScript
- **Database**: PostgreSQL (port 29432) + Redis (port 29379)
- **AI**: Claude API for compliance doc generation
- **Integrations**: Xero, Stripe NZ, Twilio

## Current Status

**Phase**: Foundation (Week 1-2)

### What's Done
- Project structure created
- Documentation complete (CLAUDE.md, README, PORTS, etc.)
- SWMS template structure designed
- Docker compose configured

### What's In Progress
- API scaffolding
- Database schema design
- Authentication implementation

### What's Next
- Implement health endpoint
- Set up database migrations
- Create user model and auth routes
- Start mobile app scaffold

## Key Files to Review

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Full project brain |
| `apps/api/src/index.ts` | API entry point |
| `apps/api/src/services/claude.ts` | AI integration |
| `docs/product/GAPS_AND_ROADMAP.md` | Current roadmap |

## Commands to Run First

```bash
# Navigate to project
cd D:\TradeMate-NZ

# Check git status
git status

# Start infrastructure (if needed)
docker-compose up -d

# Verify health
curl http://localhost:29000/health
```

## Development Guidelines

1. **Offline-First**: All mobile features must work offline
2. **NZ-Specific**: Use NZ regulations, suppliers, terminology
3. **AI Integration**: Use Claude API for hazard/control suggestions
4. **Testing**: Maintain 80% coverage on critical paths
5. **Commits**: Use conventional commits (`feat:`, `fix:`, `docs:`)

## Module Priority

1. **Compliance** (current focus) - SWMS, risk assessments, checklists
2. **Cashflow** (Q2-Q3) - Xero integration, forecasting
3. **Hiring/Visa** (Q3-Q4) - Visa tracking, AEWV compliance

## Integration Notes

- **CortexForge**: Project registered as `trademate-nz`
- **Compound Layer**: Nightly reviews enabled
- **Context Store**: Learnings synced

---

## Copy-Paste Prompt

```
I'm continuing work on TradeMate NZ, a mobile-first compliance and cashflow platform for NZ tradies.

Project location: D:\TradeMate-NZ

Please read CLAUDE.md for full context, then check docs/product/GAPS_AND_ROADMAP.md for current status.

Current focus: [INSERT YOUR CURRENT TASK]
```
