# BossBoard — Master Launch Checklist

**Idea to In-Market: End-to-End Product Lifecycle**
**Owner**: Instilligent Limited | **Updated**: March 2026
**Working Name**: BossBoard (pending final brand/domain decision)

---

## How to Read This Checklist

- [x] = Done
- [ ] = Not started
- [~] = In progress / partially done
- Items marked **(BLOCKER)** must be completed before the next phase can begin
- Items marked **(REVENUE)** directly impact monetisation

---

## PHASE 1: IDEA & VALIDATION

> *"Is this worth building?"*

### 1.1 Problem Identification
- [x] Identified core pain: NZ tradies drowning in admin (SWMS, invoicing, compliance)
- [x] Validated market size: 100-150k addressable NZ SMEs
- [x] Identified willingness to pay: competitors charge $30-75/mo, we target <$5/wk
- [x] Confirmed regulatory driver: Health & Safety at Work Act 2015, WorkSafe NZ requirements

### 1.2 Competitive Research
- [x] Analysed Tradify ($30-50/mo) — no offline, slow, basic compliance
- [x] Analysed Fergus ($53-75/mo) — overkill for solos, expensive
- [x] Analysed ServiceM8 (~$40/mo) — battery drain, no offline, weak compliance
- [x] Analysed Jobber ($50-100/mo) — US-centric, no NZ compliance
- [x] Documented competitive advantages: AI moat, NZ-specific, affordable, offline-first

### 1.3 Customer Personas
- [x] Dave the Sparky (solo electrician, 34, $180k revenue)
- [x] Sarah's Landscaping (3-person crew, $350k revenue)
- [x] Documented in `docs/product/PRODUCT_AND_MARKET_POSITIONING.md`

### 1.4 Business Model
- [x] Tier structure: Free (3 invoices/mo) → Tradie ($4.99/wk) → Team ($9.99/wk)
- [x] Unit economics: 85%+ gross margin, ARPU ~$24 NZD/month
- [x] Revenue targets: 50 beta → 200 paid in 3 months → 1,000 by Year 1 ($288k ARR)

---

## PHASE 2: DESIGN & ARCHITECTURE

> *"How should it work?"*

### 2.1 Technical Architecture
- [x] Chose tech stack: React Native (Expo) + Express/TypeScript + PostgreSQL
- [x] Designed offline-first with SQLite sync queue
- [x] Selected AI provider: Anthropic Claude for SWMS generation
- [x] Port assignments documented (`PORTS.md`)
- [x] Monorepo structure with npm workspaces

### 2.2 API Design
- [x] RESTful API design with consistent `{ success, data, error }` envelope
- [x] JWT authentication (15min access + 7d refresh tokens)
- [x] Rate limiting (100 req/15min API, 20 req/15min auth)
- [x] Subscription middleware (feature gating, usage limits)
- [x] All endpoints documented in CLAUDE.md

### 2.3 Database Design
- [x] 10 migration files (001-010)
- [x] Schema covers: users, SWMS, certs, invoices, quotes, expenses, jobs, teams, photos, subscriptions

### 2.4 UI/UX Design
- [x] 4-tab mobile navigation: Home, Work, People, Money
- [x] Brand identity: Navy (#1A2A44) + Orange (#FF6B35)
- [x] Consistent design system (colors, typography, cards, badges, status colors)
- [x] Documented in `apps/mobile/src/theme/colors.ts` → now in `@bossboard/shared`

---

## PHASE 3: BUILD (MVP)

> *"Make it real."*

### 3.1 Infrastructure
- [x] Docker Compose for local dev (PostgreSQL 16, Redis 7)
- [x] Multi-stage Dockerfile for API (`Dockerfile.api`)
- [x] Railway deployment config (`railway.toml`)
- [x] CI pipeline (`.github/workflows/api-ci.yml`)

### 3.2 Backend (API)
- [x] Auth system (register, login, refresh, logout, email verification, onboarding)
- [x] SWMS generator with Claude AI integration
- [x] SWMS templates (electrician, plumber, builder)
- [x] Invoice CRUD + send/paid/PDF/email/share workflow
- [x] Quote CRUD + convert to invoice
- [x] Expense tracking (7 categories)
- [x] Job logs with clock in/out timer
- [x] Photo attachments (camera + gallery, all entities)
- [x] Team management (invite/accept/decline, owner/admin/worker roles)
- [x] Push notifications (cert expiry at 30/14/7/1 days)
- [x] Dashboard stats + business insights (revenue, aging, top customers)
- [x] Subscription tiers with feature gating + usage limits
- [x] PDF generation (invoices + quotes via PDFKit)
- [x] Email service (Resend)
- [x] Public invoice sharing (shareable links, no auth)
- [x] Business profile management
- [x] Customer + product/service catalog
- [x] Recurring invoices
- [x] Bank reconciliation with confidence scoring

### 3.3 Mobile App
- [x] React Native/Expo with expo-router
- [x] All screens built (57 screen files + 12 navigation layouts)
- [x] Offline SQLite with sync queue
- [x] Auth flow (login → verify email → onboarding → dashboard)
- [x] BossBoard branding applied (icon, splash, adaptive-icon)
- [x] EAS project initialised (ID: `e5d4e8a5-631b-45c8-8e29-2a7c88981c02`)

### 3.4 Web App (NEW)
- [x] Next.js 15 App Router scaffolded (`apps/web/`)
- [x] Tailwind CSS v4 with BossBoard brand tokens
- [x] Cookie proxy auth (httpOnly JWT — zero Express API changes)
- [x] Login + Register pages
- [x] Sidebar navigation (Dashboard, Work, Certs, Money, Teams, Settings)
- [x] Edge middleware (auth redirect with return path)
- [ ] Dashboard with live stats + charts (Phase 2)
- [ ] Invoice/Quote/Expense CRUD pages (Phase 3)
- [ ] SWMS + Certifications pages (Phase 4)
- [ ] Settings + Teams + Subscription pages (Phase 5)
- [ ] Public invoice page + polish (Phase 6)
- [ ] Production Dockerfile + Railway deployment (Phase 7)

### 3.5 Shared Package
- [x] `@bossboard/shared` — types, theme, utilities
- [x] API imports from shared (re-export + Express augmentation)
- [x] Mobile imports from shared (theme re-export)
- [x] Web imports from shared (types + theme + utils)

---

## PHASE 4: TEST

> *"Does it actually work?"*

### 4.1 API Tests
- [x] 184 tests across 13 suites (Jest)
- [x] Route tests: auth, invoices, quotes, expenses, jobs, teams, SWMS, stats, subscriptions, health
- [x] Middleware tests: auth, subscription, error handling
- [x] All passing

### 4.2 Mobile Tests
- [x] 27 tests across 2 suites (Jest)
- [x] API client tests
- [x] Sync queue tests (offline functionality)
- [x] All passing

### 4.3 Web E2E Tests
- [x] 31 tests across 4 suites (Playwright)
- [x] Auth pages (login/register rendering, form validation, error handling)
- [x] API route handlers (proxy behavior, cookie management)
- [x] Middleware (auth redirects, public path passthrough)
- [x] Branding (colors, title, visual correctness)
- [x] All passing

### 4.4 Remaining Test Work
- [ ] Mobile E2E tests (Detox or Maestro)
- [ ] Load testing (API under concurrent users)
- [ ] Security audit (OWASP top 10 check)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Offline sync reliability testing

---

## PHASE 5: BRAND & LEGAL

> *"What are we called and are we covered?"*

### 5.1 Brand Decision **(BLOCKER)**
- [ ] **Decide final product name** (BossBoard vs TradeMate vs other)
  - "TradeMate" — trademate.co.nz is taken (cream product)
  - "BossBoard" — current working name in codebase
  - All branding configurable via env vars (APP_NAME, APP_DOMAIN)
- [ ] Secure domain name for chosen brand
- [ ] Register trademark (IPONZ) — or at minimum, clear IP search
- [ ] Finalise logo and visual identity
- [ ] Create brand guidelines doc

### 5.2 Legal Setup
- [x] Privacy policy served from API (`/legal/privacy`)
- [x] Terms of service served from API (`/legal/terms`)
- [x] Support page served from API (`/legal/support`)
- [x] NZ Privacy Act 2020 data residency notice
- [ ] Review privacy policy with lawyer (NZ data handling, AI disclosure)
- [ ] Review terms of service with lawyer (subscription, liability, NZ jurisdiction)
- [ ] Cookie/tracking consent for web app
- [ ] Data Processing Agreement template (for team tier / business customers)

### 5.3 Business Setup
- [x] Instilligent Limited — registered NZ company
- [ ] GST registration for Instilligent (if revenue >$60k threshold)
- [ ] Business bank account for subscription revenue
- [ ] Accounting setup (Xero for Instilligent itself)

---

## PHASE 6: DEPLOY & INFRASTRUCTURE

> *"Get it running in production."*

### 6.1 API Deployment
- [x] Railway deployment config ready (`railway.toml`, `Dockerfile.api`)
- [x] Migration script for Railway (`scripts/migrate-railway.sh`)
- [x] API builds cleanly (zero TypeScript errors)
- [x] Resend email integration pushed
- [~] Push latest commits to master (3 unpushed + potential icon commit)
- [ ] **Deploy API to Railway** **(BLOCKER)**
  - [ ] Create Railway project
  - [ ] Add PostgreSQL plugin
  - [ ] Add Redis plugin
  - [ ] Set environment variables (JWT secrets, Anthropic key, Resend key)
  - [ ] Deploy from GitHub
  - [ ] Run database migrations
  - [ ] Verify health check: `GET /health`
- [ ] Set up custom domain (api.{brand}.co.nz or api.instilligent.com)
- [ ] SSL/TLS (Railway provides this automatically)
- [ ] Set up uptime monitoring (UptimeRobot, BetterUptime, or Checkly)

### 6.2 Web App Deployment
- [ ] Complete remaining web app phases (2-7 from web plan)
- [ ] Create `Dockerfile.web` (multi-stage Next.js standalone)
- [ ] Add as second Railway service
- [ ] Set `API_URL` to internal Railway networking URL
- [ ] Set `CORS_ORIGINS` on API to include web domain
- [ ] Custom domain (app.{brand}.co.nz)

### 6.3 Landing Page / Marketing Site
- [ ] Decide: separate site vs web app's `/` route for unauthenticated users
- [ ] Build landing page (hero, features, pricing, social proof, CTA)
- [ ] Deploy (Cloudflare Pages / Vercel / or part of Next.js web app)
- [ ] Analytics (Google Analytics 4 + privacy-friendly alternative like Plausible)
- [ ] Meta Pixel for Facebook retargeting
- [ ] Google Search Console + sitemap

### 6.4 Email Infrastructure
- [x] Resend integration for transactional email (verification codes, invoice sending)
- [ ] Set up custom sending domain (SPF/DKIM/DMARC)
- [ ] Welcome email sequence (3 emails over first week)
- [ ] Weekly summary email template

---

## PHASE 7: APP STORES

> *"Get on phones."*

### 7.1 Apple App Store **(BLOCKER for iOS users)**
- [ ] Apple Developer account ($99 USD/year)
- [ ] Replace placeholder values in `eas.json`
- [ ] Run `eas credentials` for signing certificates
- [ ] Generate screenshots (5 screens × 2 device sizes):
  1. Dashboard with stats
  2. SWMS generator (AI in action)
  3. Invoice creation / PDF preview
  4. Expense tracking with receipt photo
  5. Team management / pricing
- [ ] Write App Store description (NZ English)
- [ ] Set categories: Business, Productivity
- [ ] Set keywords: "tradies, SWMS, invoicing, compliance, NZ, WorkSafe"
- [ ] Build: `eas build --platform ios --profile production`
- [ ] Submit for review (allow 3-7 days)
- [ ] Respond to any rejection feedback

### 7.2 Google Play Store **(BLOCKER for Android users)**
- [ ] Google Play Developer account ($25 USD one-time)
- [ ] Create service account for automated submission
- [ ] Add `google-services.json` (if using Firebase)
- [ ] Generate feature graphic (1024x500)
- [ ] Generate screenshots (min 2, max 8)
- [ ] Write Play Store listing (NZ English)
- [ ] Content rating questionnaire
- [ ] Data safety form (declare data collection)
- [ ] Build: `eas build --platform android --profile production`
- [ ] Submit for review (allow 1-3 days)
- [ ] Fix adaptive-icon branding (Google Play rejection already encountered and fixed)

### 7.3 Pre-Submission Testing
- [ ] Test dev build on physical device (Phase A)
- [ ] Test preview build via TestFlight/internal track (Phase B)
- [ ] Verify all flows work against production API
- [ ] Test push notifications on real device
- [ ] Test deep links / share URLs
- [ ] Verify offline mode works and syncs correctly

---

## PHASE 8: PAYMENTS **(REVENUE)**

> *"Get paid."*

### 8.1 Stripe NZ Integration
- [ ] Create Stripe NZ account (stripe.com/nz)
- [ ] Configure products and prices:
  - Tradie: $4.99 NZD/week (or $19.99/month)
  - Team: $9.99 NZD/week (or $39.99/month)
- [ ] Implement Stripe Checkout (hosted payment page — no custom payment UI)
- [ ] Implement webhook endpoint (`POST /api/v1/webhooks/stripe`):
  - `checkout.session.completed` → upgrade tier
  - `customer.subscription.updated` → update tier
  - `customer.subscription.deleted` → downgrade to free
  - `invoice.payment_failed` → notify user
- [ ] Test with Stripe test mode (card 4242 4242 4242 4242)
- [ ] Update mobile subscription screen with Stripe Checkout link
- [ ] Update web subscription page with Stripe Checkout link
- [ ] Schema fields ready: `subscription_tier`, `stripe_customer_id`, `stripe_subscription_id`

### 8.2 Beta → Paid Transition
- [ ] Define trigger: ~50 beta users
- [ ] Grandfather early beta users (30-day free extension)
- [ ] Email notification: "Beta ending — subscribe to keep access"
- [ ] In-app banner: "Beta ending soon"
- [ ] Flip `BETA_MODE` constant to `false` in `services/subscriptions.ts`

---

## PHASE 9: BETA LAUNCH

> *"Get real users using it."*

### 9.1 Soft Launch (Target: 50 users)
- [ ] Deploy API to production **(depends on Phase 6)**
- [ ] App live on at least one store **(depends on Phase 7)**
- [ ] Landing page live with signup CTA
- [ ] Personal network outreach (tell every tradie you know)
- [ ] WhatsApp/text: "Hey [name], built an app for tradies — keen to try?"
- [ ] Site visits: visit construction sites, talk to tradies
- [ ] Trade supply stores: leave flyers at PlaceMakers, Bunnings, Mitre 10
- [ ] Onboarding wizard tested and refined
- [ ] Collect first user feedback (in-app or WhatsApp group)

### 9.2 Beta Metrics to Track
| Metric | Target |
|--------|--------|
| Signups (first 2 weeks) | 20 |
| Weekly active users | 80% of signups |
| Invoices created per active user/week | 5+ |
| SWMS generated per active user/week | 2+ |
| App Store rating | 4.5+ |
| NPS Score | 50+ |
| Bug reports | <5 critical |

---

## PHASE 10: MARKETING & GROWTH

> *"Scale it."*

### 10.1 Content Marketing (CortexForge Automated)
- [x] Company registered in CortexForge (`f103b8fd-14e3-431b-a584-63a9bbf576f8`)
- [x] 3 products created (SWMS, Invoicing, Job Tracking)
- [x] 8 initial marketing posts drafted
- [ ] Generate AI images for each post
- [ ] Schedule: 3-4x/week (Mon, Tue, Thu, Fri at 07:00 NZST)
- [ ] Set up ongoing content generation automation
- [ ] Content themes: Pain Point Mon, Tip Tue, Feature Thu, Success Fri

### 10.2 Social Media
- [ ] **Facebook Page** (PRIMARY — NZ tradies are on FB)
  - Create business page
  - Join NZ tradie groups (NZ Electricians, NZ Plumbers, Kiwi Tradies, Small Business NZ)
  - Engage authentically — add value, don't spam
- [ ] **Instagram** — visual app demos, before/after workflows, Reels
- [ ] **LinkedIn** — Instilligent company page, compliance articles, B2B angle
- [ ] **TikTok** (optional) — short app demos, tradie humour

### 10.3 NZ-Specific Channels
- [ ] Google Business Profile
- [ ] NZ Business Directory listing
- [ ] TradeMe business listings
- [ ] NZ Herald / Stuff.co.nz tech startup pitch
- [ ] NZ Tech Podcast / NZ Entrepreneur interview pitch
- [ ] Local Chamber of Commerce networking
- [ ] Trade events: NZ Building Industry Fair, BuildNZ

### 10.4 SEO & Blog
- [ ] Target keywords:
  - "SWMS template NZ" (high intent)
  - "tradie invoicing app NZ" (high intent)
  - "WorkSafe compliance app" (medium intent)
  - "best app for tradies NZ" (high intent)
- [ ] Blog posts:
  - "Complete Guide to SWMS in New Zealand"
  - "GST Guide for NZ Tradies 2026"
  - "How to Invoice Properly as a NZ Sole Trader"
  - "WorkSafe Compliance Checklist for Small Businesses"

### 10.5 Referral Program
- [ ] "Invite a mate, both get 1 month free"
- [ ] Share link / referral code mechanism
- [ ] Track referral conversions

### 10.6 Paid Advertising (Month 2+)
- [ ] **Facebook/Instagram Ads** ($500-1000 NZD/mo)
  - Targeting: NZ, trades/construction interests, age 25-55, small biz owners
  - Formats: single image, 15-sec video demo, feature carousel
  - A/B test: pain point vs feature messaging, pricing-led vs benefit-led
- [ ] **Google Ads** ($300-500 NZD/mo)
  - Search: "SWMS template NZ", "tradie invoice app", "alternative to Tradify"
  - Remarketing: retarget landing page visitors
- [ ] Total ad budget Month 2: ~$800-1,500 NZD

---

## PHASE 11: RETENTION & GROWTH LOOPS

> *"Keep them and grow."*

### 11.1 Onboarding Optimisation
- [x] 3-step onboarding wizard (trade type, company, bank details)
- [ ] Welcome email sequence (3 emails over first week):
  1. Welcome + getting started guide
  2. Feature highlight: SWMS + Invoicing
  3. "How's it going?" check-in + support offer
- [ ] Tutorial videos (1-2 min each): first SWMS, first invoice, expense tracking

### 11.2 Engagement Features
- [x] Push notifications (cert expiry reminders)
- [ ] "You have unpaid invoices" weekly nudge
- [ ] "Don't forget to log your job today" daily nudge
- [ ] Weekly email summary (revenue, outstanding, cert expiries)
- [ ] Achievement badges: "First Invoice Sent", "10 SWMS Created", "Fully Certified"

### 11.3 User Feedback
- [ ] In-app feedback button
- [ ] Monthly NPS survey (push notification)
- [ ] Beta user WhatsApp/Telegram group
- [ ] Feature request voting (Canny.io or simple form)

### 11.4 Key Metrics Dashboard
| Metric | Target | Tool |
|--------|--------|------|
| DAU | 30% of signups | Analytics |
| Weekly retention | 80%+ | Database |
| Free → Paid conversion | 15%+ | Stripe |
| Monthly churn | <5% | Stripe |
| NPS | 50+ | Survey |
| CAC | <$15 NZD | Marketing spend / signups |
| LTV | >$200 NZD | ARPU x avg months |

---

## PHASE 12: SCALE (Post-Launch)

> *"What's next after launch?"*

### 12.1 Module 2: Cashflow Forecasting (Q2-Q3 2026)
- [ ] Xero OAuth integration
- [ ] Cash position dashboard (30/60/90 day forecast)
- [ ] Invoice chaser (auto SMS/email reminders)
- [ ] GST countdown with estimated liability
- [ ] Weekly cash health push notification

### 12.2 Module 3: Hiring/Visa Compliance (Q3-Q4 2026)
- [ ] Visa tracker (type, expiry, conditions)
- [ ] Document vault with expiry reminders
- [ ] AEWV checklist (Accredited Employer Work Visa)
- [ ] Audit report ("immigration ready" PDF)
- [ ] Urgent: August 2026 NZ visa deadline changes

### 12.3 Platform Expansion
- [ ] Digital signature capture for SWMS
- [ ] In-app team messaging
- [ ] Supplier integration
- [ ] Job scheduling / calendar view
- [ ] Customer portal (view invoices, approve quotes)

### 12.4 Business Milestones
| Milestone | Target | Timeline |
|-----------|--------|----------|
| 50 beta users | Trigger Stripe | Month 1 |
| 200 paying users | First 3 months | Month 3 |
| 1,000 paying users | End of Year 1 | Month 12 |
| $288k ARR | Sustainable business | Month 12 |
| Xero integration live | Module 2 | Q2-Q3 2026 |
| Visa module live | Module 3 | Q3-Q4 2026 |

---

## BUDGET SUMMARY (First 3 Months)

| Item | Cost (NZD) | Notes |
|------|-----------|-------|
| Apple Developer Account | $165 | $99 USD/year |
| Google Play Developer | $40 | $25 USD one-time |
| Domain | $30 | Annual |
| Railway Hosting | $15-30/mo | API + Web + DB + Redis |
| Email (Resend) | $0-20/mo | Free tier initially |
| Facebook/IG Ads | $500-1000/mo | Start Month 2 |
| Google Ads | $300-500/mo | Start Month 2 |
| Flyers/Print | $100 | Business cards + flyers |
| Legal Review | $500-1000 | Privacy policy + ToS review |
| **Total (3 months)** | **$2,000-4,000** | Conservative |

---

## CRITICAL PATH (What Blocks What)

```
Brand Decision ──────────────────────┐
                                     ├─→ Domain + Landing Page
                                     ├─→ App Store Listings
                                     └─→ Social Media Accounts

API Deploy to Railway ───────────────┐
                                     ├─→ App Store Submission (needs prod API)
                                     ├─→ Web App Deploy
                                     └─→ Beta Launch

App Store Approval ──────────────────┐
                                     └─→ Beta Launch (need app on phones)

50 Beta Users ───────────────────────┐
                                     └─→ Stripe Integration (trigger paid)

Stripe Integration ──────────────────┐
                                     └─→ Paid Launch
```

**The single biggest blocker right now: Brand decision → Domain → Deploy.**

---

*Managed by CortexForge | Project ID: 495 | Instilligent Limited*
