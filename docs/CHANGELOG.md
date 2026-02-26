# TradeMate NZ Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Railway deployment configuration (`railway.toml`)
- Railway-compatible database migration script (`scripts/migrate-railway.sh`)
- Configurable app branding via env vars (`APP_NAME`, `APP_DOMAIN`, `SMTP_FROM_NAME`)
- Updated Dockerfile.api for dynamic PORT (Railway compatibility)
- Updated `.env.production.example` for Railway deployment

### Changed
- Removed all hardcoded domain references from API services (email, PDF, public routes, notifications)
- Branding now flows from `config.ts` env vars - no code changes needed to rename product

### Planned
- Stripe NZ integration (paid subscriptions)
- App Store submission (iOS + Android)
- Xero integration (Module 2 - Cashflow Forecasting)
- Digital signature capture for SWMS
- In-app messaging (team chat)

---

## [0.5.0] - 2026-02-12

### Added

#### Subscription Tiers
- **Database**: Migration 009 - `subscription_tier`, `stripe_customer_id`, `stripe_subscription_id` on users
- **API**: Subscription service with tier definitions, limits, and feature gating
- **API**: Subscription middleware (`attachSubscription`, `requireTier`, `requireFeature`, `checkLimit`)
- **API**: Subscription routes at `/api/v1/subscriptions` (tiers, me, usage, limits)
- **API**: Middleware applied to all feature routes (invoices, SWMS, quotes, expenses, job-logs, photos, teams)
- **Mobile**: Subscription management screen with tier comparison and usage stats
- **Mobile**: `subscriptionsApi` client with 4 endpoints
- **Mobile**: Settings menu integration (Manage Plan link)
- **Mobile**: AuthContext updated with `subscriptionTier` field
- Beta mode: all users get tradie-level access during beta period

#### Enhanced Registration
- **Database**: Migration 010 - `is_verified`, `verification_code`, `verification_expires_at` on users
- **API**: Email verification flow (send code, verify code, resend)
- **API**: Onboarding completion endpoint
- **Mobile**: Email verification screen (6-digit code)
- **Mobile**: 3-step onboarding wizard (trade type, company details, bank details)
- **Mobile**: Auto-navigation after registration through verification and onboarding

### Technical Details
- Subscription tiers: free (0), tradie (1), team (2) hierarchy
- BETA_MODE flag enables tradie access for all users
- Tier limits: Free = 3 invoices/mo + 2 SWMS/mo, Tradie = unlimited, Team = unlimited + 5 members
- Feature gating: pdfExport, emailInvoice, quotes, expenses, jobLogs, photos

---

## [0.4.0] - 2026-02-10

### Added

#### Client Portal
- **Database**: Migration 007 - `share_token` column on invoices
- **API**: Token generation on invoice creation
- **API**: Public route `GET /api/v1/public/invoices/:token` (no auth)
- **API**: Server-rendered HTML invoice page with full styling
- **Mobile**: "Share Invoice" button generating shareable links

#### Email Invoice
- **API**: Email service using Nodemailer
- **API**: `POST /api/v1/invoices/:id/email` - generates PDF and sends to customer
- **API**: Professional HTML email template with invoice summary
- **Mobile**: "Email Invoice" button on invoice detail screen

#### Dashboard Insights (Enhanced)
- **API**: Revenue comparison (this month vs last month with % change)
- **API**: Outstanding invoice aging (0-30, 31-60, 61-90, 90+ days)
- **API**: Top 5 customers by revenue
- **API**: Monthly revenue chart data (last 6 months)
- **Mobile**: Insights cards on Home tab below existing stats

---

## [0.3.0] - 2026-02-08

### Added

#### PDF Generation
- **API**: PDF service using PDFKit
- **API**: Invoice PDFs with company header, line items table, GST breakdown, bank details
- **API**: Quote PDFs with "QUOTE" header and valid-until date
- **API**: `GET /api/v1/invoices/:id/pdf` and `GET /api/v1/quotes/:id/pdf`
- **Mobile**: Download/share PDF via expo-file-system + expo-sharing

#### Photo Attachments
- **Database**: Migration 003 - universal `photos` table
- **API**: Photo upload with multer (10MB max, JPEG/PNG/WebP/HEIC)
- **API**: CRUD at `/api/v1/photos` with entity linking (swms, invoice, expense, job_log)
- **Mobile**: Universal photo picker component (camera + gallery)
- **Mobile**: Attach photos to SWMS, expenses, job logs, invoices

#### Quote Builder
- **Database**: Migration 002 - `quotes` table
- **API**: Full CRUD at `/api/v1/quotes` with status workflow (draft/sent/accepted/declined/expired/converted)
- **API**: `POST /api/v1/quotes/:id/convert` - converts to invoice
- **Mobile**: Quote creation screen (reuses invoice form components)
- **Mobile**: Quote list on Money tab with status badges

#### Expense Tracking
- **Database**: Migration 005 - `expenses` table
- **API**: Full CRUD at `/api/v1/expenses` with category filtering
- **API**: Categories: materials, fuel, tools, subcontractor, vehicle, office, other
- **Mobile**: Expense entry with receipt photo snap
- **Mobile**: Expense list with monthly totals and category filter

#### Job Logger
- **Database**: Migration 004 - `job_logs` table
- **API**: Full CRUD at `/api/v1/job-logs` with clock in/out workflow
- **API**: Active job log tracking and stats endpoints
- **Mobile**: Clock In/Out button on Home tab
- **Mobile**: Timer display with site address and notes
- **Mobile**: Job log history list

#### Push Notifications
- **Database**: Migration 008 - `expo_push_token` on users
- **API**: Notification service with Expo Push API
- **API**: Daily cron job checking cert expiry (30/14/7/1 day alerts)
- **Mobile**: Push notification registration on login

#### Team Management
- **Database**: Migration 006 - `teams` and `team_members` tables with invite system
- **API**: Full team CRUD at `/api/v1/teams`
- **API**: Invite by email, accept/decline, role management (owner/admin/worker)
- **API**: Team-scoped data access
- **Mobile**: Team management screen in Settings
- **Mobile**: Invite flow, member list, role badges

#### Recurring Invoices
- **Database**: `recurring_invoices` table with schedule configuration
- **API**: Recurring invoice management and auto-generation
- **API**: Schedules: weekly, fortnightly, monthly, quarterly, annually

#### Bank Reconciliation
- **API**: Bank transaction import and matching service
- **API**: Auto-matching with confidence scoring
- **API**: Manual match/unmatch endpoints

#### Critical Fixes (Phase 1.1)
- Fixed invoice number race condition (SELECT FOR UPDATE in transaction)
- Fixed non-atomic bank reconciliation (wrapped in transaction)
- Fixed duplicate date regex parsing (DD/MM vs MM/DD)
- Added DB pool cleanup on graceful shutdown
- Moved Claude SDK import to module level

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
| 0.5.0 | 2026-02-12 | Subscription tiers, enhanced registration, all features complete |
| 0.4.0 | 2026-02-10 | Client portal, email invoices, dashboard insights |
| 0.3.0 | 2026-02-08 | PDF, photos, quotes, expenses, jobs, teams, notifications |
| 0.2.0 | 2026-02-04 | Invoicing, certifications API, dashboard stats |
| 0.1.0 | 2026-02-02 | Project foundation |

---

## Upcoming Milestones

| Version | Target | Features |
|---------|--------|----------|
| 0.6.0 | TBD | Stripe NZ integration, paid subscriptions |
| 0.7.0 | TBD | App Store submission (iOS + Android) |
| 0.8.0 | TBD | Landing page, marketing site |
| 1.0.0 | TBD | Production launch |

---

## CortexForge Tracking

- **Project ID**: 495
- **Integration Docs**: [docs/technical/CORTEXFORGE_INTEGRATION.md](technical/CORTEXFORGE_INTEGRATION.md)
