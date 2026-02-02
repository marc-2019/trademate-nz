# TradeMate NZ - Mobile-First Compliance & Cashflow Platform

## Project Brain

**Version**: 0.1.0 | **Status**: Foundation | **Updated**: February 2, 2026

---

## What Is This Project?

TradeMate NZ is a **mobile-first micro-SaaS platform** for New Zealand tradies and small service businesses (plumbers, electricians, builders, landscapers). Built by Instilligent Limited, leveraging RegTech expertise from Modular Compliance.

### Core Identity
- **Target Market**: 100-150k NZ SMEs (tradies, service businesses)
- **Price Point**: Ultra-lean SaaS ($15-25 NZD/month)
- **Margins**: 80%+ gross margin target
- **Key Differentiator**: AI-powered NZ-specific compliance documentation (SWMS, WorkSafe checklists)

### Business Model
Three modules that can be sold standalone or bundled:
1. **Compliance Module** (Q1-Q2 2026) - Priority build
2. **Cashflow Forecasting Module** (Q2-Q3 2026)
3. **Hiring/Visa Compliance Module** (Q3-Q4 2026)

### Competitor Analysis & Our Gaps We Fill

| Competitor | Price | Their Weakness | Our Advantage |
|------------|-------|----------------|---------------|
| Tradify | $30-50/mo | No offline, slow, basic compliance | Offline-first, AI compliance |
| Fergus | $53-75/mo | Overkill for solos, expensive | Right-sized, affordable |
| ServiceM8 | ~$40/mo | Battery drain, no offline, weak compliance | Efficient, offline, NZ-focused |
| Jobber | $50-100/mo | US-centric, no NZ compliance | 100% NZ-specific |

---

## Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React Native (Expo) | iOS + Android from single codebase |
| **Offline Storage** | SQLite (expo-sqlite) | Offline-first local database |
| **Backend** | Node.js/Express + TypeScript | API server |
| **Database** | PostgreSQL 16 | Primary data store |
| **Cache** | Redis 7 | Session cache, job queues |
| **AI Layer** | Claude API (Anthropic) | Compliance doc generation, suggestions |
| **Integrations** | Xero, Stripe NZ, Twilio | Accounting, payments, SMS |

### Services & Ports

| Service | Port | Purpose |
|---------|------|---------|
| trademate-api | 29000 | Express API server |
| trademate-postgres | 29432 | PostgreSQL database |
| trademate-redis | 29379 | Redis cache |

### Project Structure

```
TradeMate-NZ/
├── apps/
│   ├── api/                    # Node.js/Express backend
│   │   ├── src/
│   │   │   ├── routes/         # API routes
│   │   │   │   ├── compliance.ts
│   │   │   │   ├── documents.ts
│   │   │   │   └── auth.ts
│   │   │   ├── services/       # Business logic
│   │   │   │   ├── claude.ts   # AI document generation
│   │   │   │   ├── pdf.ts      # PDF generation
│   │   │   │   └── storage.ts  # File storage
│   │   │   ├── templates/      # SWMS templates
│   │   │   │   ├── swms-electrician.json
│   │   │   │   ├── swms-plumber.json
│   │   │   │   ├── swms-builder.json
│   │   │   │   └── risk-assessment.json
│   │   │   ├── middleware/     # Auth, validation
│   │   │   └── index.ts        # Entry point
│   │   └── package.json
│   │
│   └── mobile/                 # React Native (Expo)
│       ├── src/
│       │   ├── screens/        # Screen components
│       │   ├── components/     # Reusable components
│       │   ├── services/       # API clients, offline sync
│       │   └── hooks/          # Custom React hooks
│       ├── App.tsx
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared types & utilities
│       └── src/
│
├── docs/                       # Documentation
│   ├── testing/
│   ├── product/
│   └── technical/
│
├── data/                       # Templates, prompts
├── database/                   # Schema files
├── scripts/                    # Management scripts
├── docker-compose.yml
├── CLAUDE.md                   # This file
├── README.md
└── PORTS.md
```

---

## Module 1: Compliance (BUILD FIRST)

### Purpose
One-tap generation of NZ-specific safety documentation. Reduces admin burden and audit anxiety for tradies.

### MVP Features
1. **SWMS Generator** - Safe Work Method Statements pre-populated by trade type
2. **Risk Assessment Builder** - Site-specific hazard identification with AI suggestions
3. **WorkSafe Checklists** - Compliance checklists mapped to NZ Health & Safety at Work Act
4. **Certification Tracker** - Trade license expiry reminders
5. **PDF Export** - Professional documents for site submission

### Key NZ Regulations
- Health and Safety at Work Act 2015
- WorkSafe NZ Guidelines
- PCBU (Person Conducting a Business or Undertaking) duties
- Worker participation requirements

### AI Integration
Claude API provides:
- Hazard suggestions based on job description
- Control measure recommendations (hierarchy of controls)
- NZ-specific regulation references
- Auto-completion of common sections

---

## Module 2: Cashflow Forecasting (Q2-Q3)

### Purpose
AI-powered cash position forecasting via Xero integration. Addresses the #1 SME killer (51% cite cashflow as top issue).

### MVP Features
1. **Xero OAuth Connection** - One-tap authorisation
2. **Cash Position Dashboard** - Current balance + 30/60/90 day forecast
3. **Invoice Chaser** - Outstanding AR list with auto SMS/email reminders
4. **GST Countdown** - Due date alerts with estimated liability
5. **Weekly Summary** - Push notification with cash health score

---

## Module 3: Hiring/Visa Compliance (Q3-Q4)

### Purpose
Track employee visa status and compliance requirements. Urgent due to August 2026 NZ visa deadline changes.

### MVP Features
1. **Visa Tracker** - Employee visa type, expiry, conditions
2. **Document Vault** - Upload with expiry reminders
3. **AEWV Checklist** - Accredited Employer Work Visa compliance
4. **Audit Report** - One-tap 'immigration ready' PDF
5. **Certification Sync** - Trade license tracking

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Expo CLI (`npm install -g expo-cli`)
- Anthropic API key

### Local Development

```bash
# Clone and setup
cd D:\TradeMate-NZ

# Start infrastructure
docker-compose up -d

# Install dependencies
npm install

# Start API (in separate terminal)
cd apps/api
npm run dev

# Start mobile (in separate terminal)
cd apps/mobile
expo start
```

### Environment Setup
Copy `.env.example` to `.env` and fill in your credentials.

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | This file - project brain |
| `apps/api/src/index.ts` | API entry point |
| `apps/api/src/services/claude.ts` | AI integration |
| `apps/api/src/templates/*.json` | SWMS templates |
| `apps/mobile/App.tsx` | Mobile app entry |
| `apps/mobile/src/services/offline.ts` | SQLite offline layer |
| `docker-compose.yml` | Infrastructure |
| `PORTS.md` | Port assignments |

---

## APIs & Endpoints

### API Base URL: `http://localhost:29000`

### Health
- `GET /health` - Service health check

### Authentication
- `POST /auth/register` - Create account
- `POST /auth/login` - Login (email/password or magic link)
- `POST /auth/refresh` - Refresh JWT token

### Compliance Module
- `GET /compliance/templates` - List available SWMS templates
- `GET /compliance/templates/:tradeType` - Get template for trade
- `POST /compliance/swms` - Generate SWMS document
- `GET /compliance/swms/:id` - Get saved SWMS
- `POST /compliance/swms/:id/pdf` - Export to PDF
- `POST /compliance/ai/hazards` - AI hazard suggestions
- `POST /compliance/ai/controls` - AI control measures

### Documents
- `GET /documents` - List user documents
- `POST /documents` - Upload document
- `GET /documents/:id` - Download document
- `DELETE /documents/:id` - Delete document

### Certifications
- `GET /certifications` - List certifications
- `POST /certifications` - Add certification
- `PUT /certifications/:id` - Update certification
- `DELETE /certifications/:id` - Delete certification

---

## Current Status

**Version**: 0.1.0 | **Phase**: Foundation Complete

### What's Done
- [x] Project structure defined
- [x] Architecture documented
- [x] **Docker infrastructure** - Multi-container setup with PostgreSQL and Redis
- [x] **Express API server** - Full scaffolding with TypeScript
- [x] **Authentication system** - JWT auth with register/login/refresh/logout
- [x] **SWMS generation endpoint** - AI-powered document generation
- [x] **SWMS templates** - Electrician, plumber, builder templates
- [x] **Claude AI integration** - Hazard suggestions and control measures
- [x] **Database schema** - Users, SWMS documents, certifications
- [x] **Test suite** - 33 passing tests for all routes
- [x] **Health checks** - Liveness, readiness probes
- [x] **Mobile app scaffolding** - React Native/Expo with expo-router
- [x] **Mobile auth screens** - Login, Register with SecureStore
- [x] **Mobile SWMS screens** - List, Generate, Detail, Sign
- [x] **Mobile navigation** - Tab navigation with 4 main sections
- [x] **Offline SQLite setup** - expo-sqlite with sync queue

### What's In Progress
- [ ] PDF export functionality
- [ ] Mobile-server sync implementation

### What's Next
- [ ] Digital signature capture (react-native-signature-canvas)
- [ ] Risk assessment builder
- [ ] Certification tracker API integration
- [ ] Push notifications for cert expiry

---

## Development Workflow

### SDLC Phases
1. **Requirements** - User stories, acceptance criteria
2. **Design** - Architecture, API contracts
3. **Implementation** - Code development
4. **Testing** - Unit, integration, E2E
5. **Review** - Security, code review
6. **Deployment** - Staging, production

### Code Standards
- **TypeScript**: Strict mode, proper typing
- **API**: RESTful conventions, consistent error handling
- **Mobile**: React Native best practices, offline-first
- **Git**: Conventional commits (`feat:`, `fix:`, `docs:`)

### Testing Requirements
- Minimum 80% coverage for critical paths
- E2E tests for all user flows
- Offline functionality testing

---

## Integrations

### Anthropic Claude API
- Model: `claude-sonnet-4-20250514`
- Use cases: Hazard suggestions, control measures, document completion
- Rate limits: Respect API quotas

### Xero (Module 2)
- OAuth2 flow
- Scopes: `accounting.transactions.read`, `accounting.contacts.read`
- Webhook for real-time updates

### Stripe NZ
- Subscription billing
- NZ pricing ($15-25/month)
- Webhook for payment events

### Twilio
- SMS notifications
- Invoice reminders
- Two-factor auth

---

## Troubleshooting

### API Not Starting
```bash
# Check Docker containers
docker ps

# View logs
docker-compose logs trademate-api

# Restart
docker-compose restart trademate-api
```

### Database Connection Issues
```bash
# Check PostgreSQL
docker exec trademate-postgres pg_isready -U trademate

# Reset database
docker-compose down -v
docker-compose up -d
```

### Mobile Build Issues
```bash
# Clear Expo cache
expo start -c

# Reinstall dependencies
rm -rf node_modules
npm install
```

---

## Success Metrics

### Validation Phase
- 500 waitlist signups from $500 FB ad spend

### Beta Phase
- 50 active users
- 80% weekly retention

### Launch Phase
- 200 paying users in first 3 months
- <$2/user infrastructure cost
- 80%+ gross margin

---

## CortexForge Integration

This project is managed by CortexForge and benefits from:
- **Compound Layer**: Nightly learning extraction and pattern identification
- **Context Store**: Institutional knowledge preservation
- **SDLC Automation**: Phase tracking and quality gates
- **Observability**: Usage metrics and error tracking

### Project Registration
- **Project ID**: `trademate-nz`
- **Local Path**: `D:\TradeMate-NZ`
- **Compound Score**: Calculated nightly

---

## References

- [Health and Safety at Work Act 2015](https://www.legislation.govt.nz/act/public/2015/0070/latest/DLM5976660.html)
- [WorkSafe NZ](https://www.worksafe.govt.nz/)
- [Xero API Documentation](https://developer.xero.com/)
- [Expo Documentation](https://docs.expo.dev/)
- [Claude API Documentation](https://docs.anthropic.com/)

---

**Ready to work?**
1. Check `PORTS.md` for service ports
2. Run `docker-compose up -d` to start infrastructure
3. Use conventional commits for all changes
4. Run tests before committing
