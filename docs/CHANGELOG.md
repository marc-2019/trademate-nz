# TradeMate NZ Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- PDF generation for SWMS and invoices
- Digital signature capture
- Mobile-server sync implementation
- Push notifications for cert expiry
- Xero integration (Module 2)

---

## [0.2.0] - 2026-02-04

### Added

#### Invoicing System
- **Database**: `invoices` table with JSONB line items, GST tracking
- **API**: Full CRUD endpoints at `/api/v1/invoices`
- **API**: Status actions (`/send`, `/paid`) for invoice workflow
- **Mobile**: Money tab with invoice list and status filters
- **Mobile**: Create invoice screen with line items and GST toggle
- **Mobile**: Invoice detail screen with actions (send, paid, delete, share)

#### Certifications API
- **API**: Full CRUD endpoints at `/api/v1/certifications`
- **API**: Expiring certifications endpoint for dashboard
- **Mobile**: People tab with real API integration
- **Mobile**: Add certification form with NZ trade types

#### Dashboard Stats
- **API**: `/api/v1/stats/dashboard` aggregating SWMS, invoices, certifications
- **Mobile**: Stats card on home screen showing key metrics
- **Mobile**: Clickable stats navigating to relevant tabs

#### Navigation Restructure
- **Mobile**: New 4-tab layout (Home, Work, People, Money)
- **Mobile**: Profile moved to Settings screen (header icon)
- **Mobile**: Settings icon in home screen header

#### Project Management
- **CortexForge**: Project registered (ID: 495)
- **CortexForge**: SDLC tracking initialized
- **Docs**: CortexForge integration guide added

### Changed
- Tab bar reduced from 5 to 4 tabs for better UX
- Home screen now shows actionable stats
- SWMS tab renamed to "Work" for future job management

### Technical Details
- Money stored in cents (integers) to avoid float issues
- NZ GST rate (15%) built into invoice calculations
- Snake_case API responses for mobile compatibility
- Invoice numbers auto-generated (INV-0001 format)

---

## [0.1.0] - 2026-02-02

### Added
- Initial project structure (monorepo with apps/api, apps/mobile, packages/shared)
- Project documentation (CLAUDE.md, README.md, PORTS.md)
- Environment configuration template (.env.example)
- Docker infrastructure configuration (PostgreSQL, Redis)
- Express API server with TypeScript
- JWT authentication (register, login, refresh, logout)
- SWMS generation endpoint with Claude AI integration
- SWMS templates (electrician, plumber, builder)
- Database schema (users, swms_documents, certifications)
- Test suite (33 passing tests)
- Health checks (liveness, readiness probes)
- Mobile app scaffolding (React Native/Expo with expo-router)
- Mobile auth screens (Login, Register with SecureStore)
- Mobile SWMS screens (List, Generate, Detail, Sign)
- Mobile tab navigation
- Offline SQLite setup with sync queue

### Architecture Decisions
- **Monorepo**: npm workspaces for shared code between API and mobile
- **Offline-First**: SQLite for local storage, background sync
- **AI Layer**: Claude API for compliance document generation
- **NZ Focus**: Health & Safety at Work Act 2015 compliance

---

## Version History Summary

| Version | Date | Milestone |
|---------|------|-----------|
| 0.2.0 | 2026-02-04 | Invoicing, certifications API, dashboard stats |
| 0.1.0 | 2026-02-02 | Project foundation |

---

## Upcoming Milestones

| Version | Target | Features |
|---------|--------|----------|
| 0.3.0 | Week 4 | PDF export, digital signatures |
| 0.4.0 | Week 6 | Offline sync, push notifications |
| 0.5.0 | Week 8 | Xero integration |
| 1.0.0 | Week 12 | Production launch |

---

## CortexForge Tracking

- **Project ID**: 495
- **Integration Docs**: [docs/technical/CORTEXFORGE_INTEGRATION.md](technical/CORTEXFORGE_INTEGRATION.md)
