# TradeMate NZ - Go-to-Market Checklist & Action Plan

**Last Updated**: February 2026
**Target**: First 50 beta users → Paid launch → 200 paying users in 3 months
**Owner**: Instilligent Limited

---

## Phase 1: Pre-Launch Preparation (Week 1-2)

### 1.1 Technical Readiness
- [ ] **Deploy API to production** (api.trademate.co.nz)
  - Set up VPS (DigitalOcean NZ or AWS ap-southeast-2)
  - Configure PostgreSQL 16 + Redis 7
  - Run all 10 database migrations
  - Set up SSL certificates (Let's Encrypt)
  - Configure environment variables (Anthropic API key, JWT secret, SMTP)
  - Set up PM2 or Docker for process management
  - Configure CORS for mobile app + landing page domains
  - Health check monitoring (UptimeRobot or similar)

- [ ] **Domain & DNS Setup**
  - Register/configure trademate.co.nz
  - Point api.trademate.co.nz → API server
  - Point www.trademate.co.nz → Landing page hosting
  - Set up email (hello@trademate.co.nz, support@trademate.co.nz)
  - Configure SPF/DKIM/DMARC for email deliverability

- [ ] **Landing Page Deployment**
  - [x] Landing page built (apps/web/index.html)
  - [ ] Deploy to hosting (Cloudflare Pages, Vercel, or Netlify)
  - [ ] Connect custom domain (trademate.co.nz)
  - [ ] Set up analytics (Google Analytics 4 + Plausible for privacy)
  - [ ] Add Meta Pixel for Facebook retargeting
  - [ ] Set up Google Search Console
  - [ ] Submit sitemap to Google
  - [ ] Test page speed (target: Lighthouse 90+)

### 1.2 App Store Preparation
- [ ] **Apple App Store (iOS)**
  - Create Apple Developer account ($99 USD/year)
  - Generate app icons (1024x1024 master + all required sizes)
  - Create 6.7" and 5.5" screenshots (iPhone 15 Pro Max + iPhone 8 Plus)
  - Write App Store description (NZ English)
  - Select categories: Business, Productivity
  - Set up keywords: "tradies, SWMS, invoicing, compliance, NZ, WorkSafe"
  - Prepare privacy policy URL
  - Prepare support URL
  - Set age rating (4+)
  - Build with EAS Build (`eas build --platform ios`)
  - Submit for review (allow 3-7 days)

- [ ] **Google Play Store (Android)**
  - Create Google Play Developer account ($25 USD one-time)
  - Generate feature graphic (1024x500)
  - Create phone screenshots (min 2, max 8)
  - Write Play Store listing (NZ English)
  - Select categories: Business
  - Set content rating
  - Prepare privacy policy URL
  - Build with EAS Build (`eas build --platform android`)
  - Submit for review (allow 1-3 days)

- [ ] **App Store Assets to Create**
  - App icon (navy/gold theme matching brand)
  - Splash screen
  - 5 screenshot mockups per platform:
    1. Home dashboard with stats
    2. SWMS generator (AI in action)
    3. Invoice creation / PDF preview
    4. Expense tracking with receipt photo
    5. Team management / pricing
  - Short video preview (15-30 seconds) - optional but recommended

### 1.3 Legal & Compliance
- [ ] Privacy Policy (trademate.co.nz/privacy)
  - Data collection practices
  - NZ Privacy Act 2020 compliance
  - Anthropic/Claude AI data handling disclosure
  - Data storage location
  - Right to deletion
- [ ] Terms of Service (trademate.co.nz/terms)
  - Service description
  - Subscription terms & cancellation
  - Limitation of liability
  - NZ jurisdiction
- [ ] Cookie policy (landing page)

---

## Phase 2: Stripe Integration & Billing (Week 2-3)

### 2.1 Stripe NZ Setup
- [ ] Create Stripe NZ account (stripe.com/nz)
- [ ] Configure products and prices:
  - **Tradie**: $4.99 NZD/week (or $19.99/month equivalent)
  - **Team**: $9.99 NZD/week (or $39.99/month equivalent)
- [ ] Set up Stripe Checkout hosted payment page
- [ ] Implement webhook endpoint (`POST /api/v1/webhooks/stripe`)
  - `checkout.session.completed` → Upgrade user tier
  - `customer.subscription.updated` → Update tier
  - `customer.subscription.deleted` → Downgrade to free
  - `invoice.payment_failed` → Notify user
- [ ] Test with Stripe test mode (test card 4242...)
- [ ] Switch to live mode when ready
- [ ] Update mobile subscription screen with Stripe Checkout link

### 2.2 Free Trial / Beta Transition Plan
- [ ] Current: Beta mode (all features free)
- [ ] At 50 users: Enable Stripe billing
- [ ] Grandfather early beta users with 30-day free extension
- [ ] Email notification to existing users about transition
- [ ] In-app banner: "Beta ending soon - subscribe to keep access"

---

## Phase 3: Marketing Launch (Week 2-4)

### 3.1 Content Marketing (CortexForge Automated)

**CortexForge Setup** ✅ DONE:
- [x] Company registered: `f103b8fd-14e3-431b-a584-63a9bbf576f8`
- [x] 3 Products created (SWMS & Compliance, Invoicing & Quotes, Job & Expense Tracking)
- [x] 8 initial marketing posts created (draft status)
- [ ] Generate AI images for each post via CortexForge
- [ ] Schedule posts: 3-4x per week (Mon, Tue, Thu, Fri at 7:00 AM NZST)
- [ ] Set up automation for ongoing content generation

**Content Calendar (First 2 Weeks)**:
| Day | Post Title | Type | Platform |
|-----|-----------|------|----------|
| Mon W1 | Stop Losing Hours to Paperwork | Awareness | FB/IG/LinkedIn |
| Tue W1 | What Is a SWMS and Why Every NZ Tradie Needs One | Educational | FB/LinkedIn |
| Thu W1 | Get Paid Faster: Professional Invoices in 30 Seconds | Feature | FB/IG |
| Fri W1 | Why Pay $50/Month When You Can Pay Less Than a Coffee? | Competitive | FB/LinkedIn |
| Mon W2 | Tax Time Sorted: Track Every Business Expense | Practical | FB/IG |
| Tue W2 | From 45 Minutes to 2 Taps: AI Changes SWMS | Innovation | FB/LinkedIn |
| Thu W2 | Win More Jobs: Professional Quotes in Minutes | Feature | FB/IG |
| Fri W2 | Growing Your Team? Manage from One App | Feature | FB/LinkedIn |

**Ongoing Content Themes** (rotating):
1. **Pain Point Monday** - Address a specific tradie admin frustration
2. **Tip Tuesday** - NZ compliance tips, GST advice, business tips
3. **Feature Thursday** - Showcase a specific TradeMate feature
4. **Success Friday** - User stories, wins, comparison to competitors

### 3.2 Social Media Channels

- [ ] **Facebook Page** (Primary - NZ tradies are on FB)
  - Create "TradeMate NZ" business page
  - Cover photo + profile pic (app icon)
  - About section with NZ-specific info
  - Pin "Join the Free Beta" post
  - Join NZ tradie groups and engage authentically (NOT spamming)
    - NZ Electricians
    - NZ Plumbers & Gasfitters
    - NZ Builders & Contractors
    - Kiwi Tradies
    - Small Business NZ

- [ ] **Instagram** (@trademate.nz)
  - Visual content: app screenshots, before/after workflows
  - Stories: Quick tips, behind-the-scenes dev
  - Reels: 15-30 second app demos

- [ ] **LinkedIn** (Instilligent Limited company page)
  - Professional content about NZ compliance
  - Target trade business owners and managers
  - Articles about WorkSafe compliance
  - Connect with NZ business networks

- [ ] **TikTok** (@trademate.nz) - Optional, lower priority
  - Short app demos
  - "Day in the life" content
  - Tradie humour + app benefits

### 3.3 NZ-Specific Marketing Channels

- [ ] **Google Business Profile** - "TradeMate NZ" (even as a SaaS, get listed)
- [ ] **NZ Business Directory** - nzbusiness.co.nz listing
- [ ] **TradeMe** - Consider classifieds/business listings
- [ ] **NZ Herald / Stuff.co.nz** - Pitch as a NZ tech startup story
- [ ] **NZ Tech Podcast / NZ Entrepreneur** - Pitch for interview
- [ ] **Local Chamber of Commerce** - Network with business groups
- [ ] **NZME Business Hub** - Advertising if budget allows

### 3.4 Direct Outreach (Grassroots)

- [ ] **Personal Network**: Tell every tradie you know
- [ ] **Site Visits**: Visit construction sites, talk to tradies
- [ ] **Trade Supply Stores**: Leave flyers at PlaceMakers, Bunnings, Mitre 10
- [ ] **Trade Events**: NZ Building Industry Fair, BuildNZ
- [ ] **Referral Program**: "Invite a mate, both get 1 month free"
- [ ] **WhatsApp/Text**: "Hey [name], built an app for tradies - keen to try?"

### 3.5 SEO & Content

- [ ] **Blog** (on trademate.co.nz/blog or separate)
  - "Complete Guide to SWMS in New Zealand"
  - "GST Guide for NZ Tradies 2026"
  - "How to Invoice Properly as a NZ Sole Trader"
  - "WorkSafe Compliance Checklist for Small Businesses"
  - "Best Apps for NZ Tradies (and Why TradeMate Wins)"

- [ ] **Target Keywords** (via Google Search Console):
  - "SWMS template NZ" - High intent
  - "tradie invoicing app NZ" - High intent
  - "WorkSafe compliance app" - Medium intent
  - "trade business management NZ" - Medium intent
  - "best app for tradies NZ" - High intent
  - "SWMS generator free" - High volume
  - "invoice app NZ" - Medium volume

---

## Phase 4: Growth & Retention (Week 4+)

### 4.1 Onboarding Optimisation
- [ ] Welcome email sequence (3 emails over first week):
  1. Welcome + getting started guide
  2. Feature highlight: SWMS + Invoicing
  3. "How's it going?" check-in + support offer
- [ ] In-app onboarding wizard (already built - refine)
- [ ] Tutorial videos (1-2 minutes each):
  - "Creating Your First SWMS"
  - "Sending Your First Invoice"
  - "Tracking Expenses on the Go"

### 4.2 User Feedback Loop
- [ ] In-app feedback button (simple text box)
- [ ] Monthly NPS survey (push notification)
- [ ] Beta user WhatsApp/Telegram group for direct feedback
- [ ] Feature request voting (simple form or Canny.io)

### 4.3 Retention Tactics
- [ ] Push notifications (already built):
  - Cert expiry reminders (30/14/7/1 days)
  - "You have unpaid invoices" weekly nudge
  - "Don't forget to log your job today"
- [ ] Weekly email summary:
  - Revenue this week
  - Outstanding invoices
  - Upcoming cert expiries
- [ ] Achievement badges (gamification lite):
  - "First Invoice Sent"
  - "10 SWMS Created"
  - "Fully Certified"

### 4.4 Key Metrics to Track
| Metric | Target | Tool |
|--------|--------|------|
| Daily Active Users (DAU) | 30% of signups | Analytics |
| Weekly Retention | 80%+ | Database query |
| Invoices Created/Week | 5+ per active user | API stats |
| SWMS Generated/Week | 2+ per active user | API stats |
| Free → Paid Conversion | 15%+ | Stripe dashboard |
| Churn Rate | <5% monthly | Stripe dashboard |
| NPS Score | 50+ | Survey |
| App Store Rating | 4.5+ | App stores |
| CAC (Customer Acquisition Cost) | <$15 | Marketing spend / signups |
| LTV (Lifetime Value) | >$200 | ARPU × avg months |

---

## Phase 5: Paid Advertising (When Ready - Month 2+)

### 5.1 Facebook/Instagram Ads
- [ ] Budget: $500-1000 NZD/month initially
- [ ] Targeting:
  - Location: New Zealand
  - Interests: Trades, construction, plumbing, electrical, building
  - Job titles: Tradie, plumber, electrician, builder, contractor
  - Age: 25-55
  - Behaviours: Small business owners
- [ ] Ad formats:
  - Single image: App screenshot + pain point headline
  - Video: 15-second app demo
  - Carousel: Feature showcase (SWMS → Invoice → Quote → Track)
- [ ] A/B test:
  - Pain point messaging vs feature messaging
  - Pricing-led vs benefit-led
  - "Free beta" vs "Less than a coffee a week"

### 5.2 Google Ads
- [ ] Budget: $300-500 NZD/month
- [ ] Search campaigns:
  - "SWMS template NZ" → Landing page
  - "tradie invoice app" → Landing page
  - "WorkSafe compliance app NZ" → Landing page
  - "alternative to Tradify" → Comparison page
- [ ] Remarketing: Retarget landing page visitors who didn't sign up

---

## Budget Summary (First 3 Months)

| Item | Cost (NZD) | Notes |
|------|-----------|-------|
| Apple Developer Account | $165 | $99 USD/year |
| Google Play Developer | $40 | $25 USD one-time |
| Domain (trademate.co.nz) | $30 | Annual |
| VPS Hosting (API) | $60/mo = $180 | DigitalOcean Droplet |
| Landing Page Hosting | $0 | Cloudflare Pages (free) |
| Email Service (Resend) | $0-20/mo | Free tier initially |
| Facebook/IG Ads | $500-1000/mo | Start month 2 |
| Google Ads | $300-500/mo | Start month 2 |
| Flyers/Print | $100 | Business cards + flyers |
| **Total (3 months)** | **$1,500-3,000** | Conservative estimate |

---

## Timeline

### Week 1 (NOW)
- [x] ~~Fix TypeScript build errors~~
- [x] ~~Build landing page~~
- [x] ~~Register in CortexForge~~
- [x] ~~Create 8 marketing posts~~
- [ ] Deploy API to production
- [ ] Set up domain/DNS
- [ ] Deploy landing page

### Week 2
- [ ] App Store: Create developer accounts
- [ ] App Store: Generate icons and screenshots
- [ ] Create social media accounts (Facebook, Instagram, LinkedIn)
- [ ] Publish first 4 CortexForge posts
- [ ] Start SEO content (blog posts)
- [ ] Privacy policy + Terms of Service

### Week 3
- [ ] Submit apps to App Store + Play Store
- [ ] Start direct outreach (personal network, WhatsApp)
- [ ] Stripe integration (if ready)
- [ ] Join NZ tradie Facebook groups
- [ ] Publish posts 5-8

### Week 4
- [ ] Apps live on stores (target)
- [ ] First 10 beta users (target)
- [ ] Set up onboarding email sequence
- [ ] Continue content marketing
- [ ] Collect first user feedback

### Month 2
- [ ] 25 beta users (target)
- [ ] Start paid advertising ($500-1000/mo)
- [ ] Launch referral program
- [ ] First blog articles published
- [ ] Iterate based on user feedback

### Month 3
- [ ] 50 users (trigger Stripe billing)
- [ ] Enable paid subscriptions
- [ ] Grandfather beta users with free month
- [ ] Target: 200 paying users by end of month 3
- [ ] Press outreach (NZ tech media)

---

## CortexForge Content Automation Reference

### Company Details
- **Company ID**: `f103b8fd-14e3-431b-a584-63a9bbf576f8`
- **Products**:
  - SWMS & Compliance: `9ffda0a9-3071-47e4-af02-a18f5306ebe5`
  - Invoicing & Quotes: `4f716545-5ef4-41bd-91a0-4c7bcba19747`
  - Job & Expense Tracking: `6cef7a9f-ae8b-4b4a-9134-7b00a3a72d9e`

### API Reference
```bash
# Auth
POST http://localhost:28000/auth/login
Body: {"username": "admin", "password": "admin123"}

# Content API Base
http://localhost:28003/content/

# Create post
POST /content/posts

# Generate image for post
POST /content/posts/{post_id}/generate-media

# List posts
GET /content/posts?company_id={company_id}

# Schedule content
POST /content/posts (with scheduled_at field)

# Generate brand voice prompt
GET /content/brand-voice/generate-prompt?company_id={company_id}

# Auto-generate content
POST /content/onn/automation/generate
```

### Content Schedule Settings
- **Frequency**: 3-4x per week
- **Days**: Monday, Tuesday, Thursday, Friday
- **Time**: 07:00 NZST
- **Tone**: Friendly, practical, straight-talking
- **CTA**: "Try TradeMate Free" → https://trademate.co.nz

---

## Quick Wins (Do Today)
1. ✅ Landing page built
2. ✅ CortexForge marketing content created (8 posts)
3. 🔲 Buy/configure trademate.co.nz domain
4. 🔲 Deploy landing page to Cloudflare Pages
5. 🔲 Create Facebook business page
6. 🔲 Post first marketing content manually while automation ramps up
7. 🔲 Tell 10 tradies you know about the app

---

*Document managed by CortexForge | Project ID: 495 | Updated: February 2026*
