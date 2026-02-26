/**
 * Legal Routes (No Authentication Required)
 * Serves HTML pages required for App Store / Play Store compliance.
 *
 * GET /privacy  - Privacy Policy
 * GET /terms    - Terms of Service
 * GET /support  - Support / Contact
 */

import { Router, Request, Response } from 'express';
import { config } from '../config/index.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/privacy', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderPrivacyPolicy());
});

router.get('/terms', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderTermsOfService());
});

router.get('/support', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderSupportPage());
});

// ─────────────────────────────────────────────────────────────────────────────
// HTML HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function esc(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Shared page wrapper */
function page(title: string, body: string): string {
  const appName = esc(config.appName);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} - ${appName}</title>
  <style>${getStyles()}</style>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <a href="/privacy" class="brand">${appName}</a>
      <nav>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/support">Support</a>
      </nav>
    </div>
  </header>
  <main class="container">
    <div class="card">
      ${body}
    </div>
  </main>
  <footer class="site-footer">
    <div class="footer-inner">
      <p>&copy; ${new Date().getFullYear()} Instilligent Limited. All rights reserved.</p>
      <p class="footer-links">
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="/support">Support</a>
      </p>
    </div>
  </footer>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVACY POLICY
// ─────────────────────────────────────────────────────────────────────────────

function renderPrivacyPolicy(): string {
  const appName = esc(config.appName);

  return page('Privacy Policy', `
      <h1>Privacy Policy</h1>
      <p class="meta">Effective Date: 1 February 2026 &middot; Last Updated: February 2026</p>

      <p>
        Instilligent Limited (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the
        ${appName} mobile application and associated services (the &ldquo;Service&rdquo;). This Privacy
        Policy explains how we collect, use, disclose, and safeguard your information when you use our
        Service. We are committed to compliance with the
        <strong>New Zealand Privacy Act 2020</strong> and its Information Privacy Principles.
      </p>

      <h2>1. Information We Collect</h2>

      <h3>1.1 Information You Provide</h3>
      <ul>
        <li><strong>Account information</strong> &ndash; name, email address, phone number, and password when you register.</li>
        <li><strong>Business information</strong> &ndash; company name, trade type, GST number, business address, and bank account details for invoicing.</li>
        <li><strong>Financial data</strong> &ndash; invoices, quotes, expenses, and payment records you create within the Service.</li>
        <li><strong>Compliance documents</strong> &ndash; Safe Work Method Statements (SWMS), risk assessments, and certification details.</li>
        <li><strong>Job and site information</strong> &ndash; job logs, site addresses, clock-in/out times, and job descriptions.</li>
        <li><strong>Customer data</strong> &ndash; names, email addresses, phone numbers, and addresses of your clients that you enter.</li>
        <li><strong>Photos</strong> &ndash; images you upload for job documentation, receipts, or certifications.</li>
      </ul>

      <h3>1.2 Information Collected Automatically</h3>
      <ul>
        <li><strong>Device information</strong> &ndash; device type, operating system, unique device identifiers, and mobile network information.</li>
        <li><strong>Usage data</strong> &ndash; features accessed, screens viewed, and interaction patterns to improve the Service.</li>
        <li><strong>Push notification tokens</strong> &ndash; device tokens used to deliver push notifications you have opted into.</li>
        <li><strong>Approximate location</strong> &ndash; when you explicitly grant permission, for pre-filling site addresses in job logs.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use collected information to:</p>
      <ul>
        <li>Provide, operate, and maintain the Service, including generating invoices, quotes, and compliance documents.</li>
        <li>Generate AI-powered compliance documentation (SWMS, hazard suggestions, control measures) using the Anthropic Claude API.</li>
        <li>Send push notifications for certification expiry reminders, invoice updates, and team invitations.</li>
        <li>Process subscription billing and manage your account.</li>
        <li>Generate business insights, dashboard statistics, and revenue reports.</li>
        <li>Communicate with you about updates, security alerts, and support matters.</li>
        <li>Detect, prevent, and address technical issues and security threats.</li>
        <li>Comply with legal obligations under New Zealand law.</li>
      </ul>

      <h2>3. AI-Powered Features</h2>
      <p>
        ${appName} uses the Anthropic Claude API to generate compliance documents such as Safe Work
        Method Statements. When you use AI-powered features:
      </p>
      <ul>
        <li>Relevant job details (trade type, job description, site information) are sent to the Anthropic API to generate document content.</li>
        <li>No personally identifiable information (such as your name or email) is sent to the AI service.</li>
        <li>AI-generated content is suggestions only and should be reviewed by a qualified professional before use.</li>
        <li>Anthropic&rsquo;s data handling is governed by their own privacy policy.</li>
      </ul>

      <h2>4. Data Sharing and Disclosure</h2>
      <p>We do not sell your personal information. We may share data with:</p>
      <ul>
        <li><strong>Anthropic (Claude API)</strong> &ndash; trade type and job descriptions for AI document generation. No personal identifiers are shared.</li>
        <li><strong>Expo (Push Notifications)</strong> &ndash; device push tokens to deliver notifications you have opted into.</li>
        <li><strong>Stripe</strong> &ndash; payment processing for subscriptions. Stripe handles payment card data directly; we do not store card numbers.</li>
        <li><strong>Email service providers</strong> &ndash; to deliver invoice emails and account notifications on your behalf.</li>
        <li><strong>Your clients</strong> &ndash; when you share an invoice via a public link or email, your business details and invoice data are visible to the recipient.</li>
        <li><strong>Team members</strong> &ndash; if you use team features, data may be shared with members of your team as configured by the team owner.</li>
        <li><strong>Law enforcement</strong> &ndash; when required by law or to protect the rights, property, or safety of our users.</li>
      </ul>

      <h2>5. Data Storage and Security</h2>
      <ul>
        <li>Your data is stored on secure servers. Where commercially practicable, we use infrastructure located in New Zealand or Australia.</li>
        <li>All data is transmitted using TLS encryption (HTTPS).</li>
        <li>Passwords are hashed using industry-standard algorithms and are never stored in plain text.</li>
        <li>Database access is restricted and protected by authentication credentials and network security controls.</li>
        <li>We conduct regular reviews of our data collection, storage, and processing practices.</li>
      </ul>

      <h2>6. Data Retention</h2>
      <p>
        We retain your personal information for as long as your account is active or as needed to
        provide the Service. If you delete your account, we will delete or anonymise your personal
        data within 90 days, except where retention is required by law (for example, financial
        records required under the Tax Administration Act 1994).
      </p>

      <h2>7. Your Rights Under the NZ Privacy Act 2020</h2>
      <p>Under the New Zealand Privacy Act 2020, you have the right to:</p>
      <ul>
        <li><strong>Access</strong> &ndash; request a copy of the personal information we hold about you.</li>
        <li><strong>Correction</strong> &ndash; ask us to correct any inaccurate or incomplete personal information.</li>
        <li><strong>Deletion</strong> &ndash; request deletion of your personal information, subject to any legal retention requirements.</li>
        <li><strong>Complaint</strong> &ndash; lodge a complaint with the <a href="https://www.privacy.org.nz" target="_blank" rel="noopener">Office of the Privacy Commissioner</a> if you believe your privacy has been breached.</li>
      </ul>
      <p>
        To exercise any of these rights, contact us at
        <a href="mailto:privacy@instilligent.nz">privacy@instilligent.nz</a>.
        We will respond within 20 working days as required by the Act.
      </p>

      <h2>8. Children&rsquo;s Privacy</h2>
      <p>
        The Service is not directed at individuals under the age of 16. We do not knowingly collect
        personal information from children under 16. If we become aware that a child under 16 has
        provided us with personal information, we will take steps to delete such information promptly.
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of material changes
        by posting the new policy within the app and, where appropriate, sending you a push
        notification or email. Your continued use of the Service after changes are posted constitutes
        acceptance of the updated policy.
      </p>

      <h2>10. Contact Us</h2>
      <div class="contact-box">
        <p><strong>Privacy Officer</strong></p>
        <p>Instilligent Limited</p>
        <p>New Zealand</p>
        <p>Email: <a href="mailto:privacy@instilligent.nz">privacy@instilligent.nz</a></p>
      </div>
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// TERMS OF SERVICE
// ─────────────────────────────────────────────────────────────────────────────

function renderTermsOfService(): string {
  const appName = esc(config.appName);

  return page('Terms of Service', `
      <h1>Terms of Service</h1>
      <p class="meta">Effective Date: 1 February 2026 &middot; Last Updated: February 2026</p>

      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the ${appName} mobile
        application and associated services (the &ldquo;Service&rdquo;) operated by Instilligent
        Limited (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), a company registered
        in New Zealand.
      </p>
      <p>
        By creating an account or using the Service, you agree to be bound by these Terms. If you do
        not agree, please do not use the Service.
      </p>

      <h2>1. Service Description</h2>
      <p>${appName} is a mobile application designed for New Zealand tradespeople and small service businesses. The Service includes:</p>
      <ul>
        <li>Business management tools &ndash; invoicing, quoting, expense tracking, and job logging.</li>
        <li>Compliance documentation &ndash; AI-assisted generation of Safe Work Method Statements (SWMS), risk assessments, and safety checklists.</li>
        <li>Certification tracking &ndash; trade licence and certification expiry monitoring with reminders.</li>
        <li>Team management &ndash; inviting team members, role assignment, and shared access to business data.</li>
        <li>Client portal &ndash; shareable invoice links for your customers.</li>
        <li>Dashboard and insights &ndash; revenue reporting, outstanding invoice tracking, and business analytics.</li>
      </ul>

      <h2>2. Account Registration</h2>
      <ul>
        <li>You must be at least 16 years old to create an account.</li>
        <li>You must provide accurate, complete, and current information during registration.</li>
        <li>You are responsible for maintaining the confidentiality of your password and for all activities under your account.</li>
        <li>You must notify us immediately of any unauthorised use of your account.</li>
        <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
      </ul>

      <h2>3. Subscription Tiers and Pricing</h2>
      <p>${appName} offers the following subscription tiers (prices in NZD, inclusive of GST):</p>
      <table class="pricing-table">
        <thead>
          <tr>
            <th>Tier</th>
            <th>Price</th>
            <th>Includes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Free</strong></td>
            <td>$0</td>
            <td>3 invoices/month, 2 SWMS/month, basic dashboard</td>
          </tr>
          <tr>
            <td><strong>Tradie</strong></td>
            <td>$4.99/week (~$19.99/month)</td>
            <td>Unlimited invoices, SWMS, quotes, expenses, job logs, PDF export, email invoices, photos</td>
          </tr>
          <tr>
            <td><strong>Team</strong></td>
            <td>$9.99/week (~$39.99/month)</td>
            <td>Everything in Tradie + up to 5 team members, team management, shared data</td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Beta Programme:</strong> During the beta period, all users receive Tradie-tier access
        at no charge. We will provide at least 14 days&rsquo; notice before the beta period ends and
        paid subscriptions commence.
      </p>
      <p>
        Subscription payments are processed by Stripe. By subscribing to a paid tier, you agree to
        Stripe&rsquo;s terms of service. You may cancel your subscription at any time; access
        continues until the end of the current billing period.
      </p>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any unlawful purpose or in violation of New Zealand law.</li>
        <li>Submit false, misleading, or fraudulent information.</li>
        <li>Attempt to gain unauthorised access to the Service, other accounts, or our systems.</li>
        <li>Use automated tools (bots, scrapers) to access the Service without our written consent.</li>
        <li>Interfere with or disrupt the integrity or performance of the Service.</li>
        <li>Upload malicious code, viruses, or harmful content.</li>
        <li>Use the Service to send spam or unsolicited communications.</li>
        <li>Resell, redistribute, or sublicence the Service without our written consent.</li>
      </ul>

      <h2>5. Intellectual Property</h2>
      <ul>
        <li>The Service, including its design, code, features, and content, is the intellectual property of Instilligent Limited and is protected by New Zealand and international intellectual property laws.</li>
        <li>You retain ownership of the data you enter into the Service (invoices, documents, photos, etc.).</li>
        <li>By using the Service, you grant us a limited licence to process your data solely for the purpose of providing the Service.</li>
        <li>You may not copy, modify, reverse-engineer, or create derivative works from the Service.</li>
      </ul>

      <h2>6. AI-Generated Content Disclaimer</h2>
      <div class="disclaimer-box">
        <p>
          <strong>Important:</strong> ${appName} uses artificial intelligence (the Anthropic Claude API)
          to assist in generating compliance documents such as Safe Work Method Statements (SWMS),
          hazard suggestions, and control measures.
        </p>
        <p>
          AI-generated content is provided as <strong>suggestions only</strong> and does not constitute
          legal, safety, or professional advice. You are solely responsible for reviewing, verifying,
          and approving all AI-generated content before use. We strongly recommend having compliance
          documents reviewed by a qualified health and safety professional.
        </p>
        <p>
          Instilligent Limited does not warrant that AI-generated content is accurate, complete, or
          suitable for any particular purpose. We accept no liability for any loss or damage arising
          from reliance on AI-generated content.
        </p>
      </div>

      <h2>7. Limitation of Liability</h2>
      <p>To the maximum extent permitted by New Zealand law:</p>
      <ul>
        <li>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, whether express or implied.</li>
        <li>We do not warrant that the Service will be uninterrupted, error-free, or secure.</li>
        <li>We shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</li>
        <li>Our total liability for any claim relating to the Service shall not exceed the amount you have paid us in the 12 months preceding the claim.</li>
      </ul>

      <h2>8. Consumer Guarantees Act</h2>
      <p>
        Nothing in these Terms is intended to limit your rights under the
        <strong>New Zealand Consumer Guarantees Act 1993</strong>. Where the Consumer Guarantees Act
        applies, the Service must be provided with reasonable care and skill, be fit for its intended
        purpose, and comply with any description provided.
      </p>

      <h2>9. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless Instilligent Limited, its directors, employees, and
        agents from any claims, damages, losses, or expenses (including reasonable legal fees) arising
        from your use of the Service, your violation of these Terms, or your violation of any
        third-party rights.
      </p>

      <h2>10. Dispute Resolution</h2>
      <ul>
        <li>These Terms are governed by the laws of New Zealand.</li>
        <li>Any disputes shall first be addressed through good-faith negotiation between the parties.</li>
        <li>If a dispute cannot be resolved through negotiation within 30 days, either party may refer the matter to mediation administered in accordance with the Arbitrators&rsquo; and Mediators&rsquo; Institute of New Zealand (AMINZ) Mediation Protocol.</li>
        <li>The courts of New Zealand shall have exclusive jurisdiction over any dispute that cannot be resolved through mediation.</li>
      </ul>

      <h2>11. Termination</h2>
      <ul>
        <li>You may delete your account at any time through the app settings or by contacting us.</li>
        <li>We may suspend or terminate your account if you breach these Terms, with notice where practicable.</li>
        <li>Upon termination, your right to use the Service ceases immediately.</li>
        <li>You may request a copy of your data within 30 days of termination. After 90 days, your data will be deleted in accordance with our Privacy Policy.</li>
      </ul>

      <h2>12. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. We will notify you of material changes by
        posting the updated Terms within the app and, where appropriate, via email or push
        notification. Continued use of the Service after changes are posted constitutes acceptance
        of the updated Terms.
      </p>

      <h2>13. Contact Us</h2>
      <div class="contact-box">
        <p><strong>Legal Enquiries</strong></p>
        <p>Instilligent Limited</p>
        <p>New Zealand</p>
        <p>Email: <a href="mailto:legal@instilligent.nz">legal@instilligent.nz</a></p>
      </div>
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORT / CONTACT
// ─────────────────────────────────────────────────────────────────────────────

function renderSupportPage(): string {
  const appName = esc(config.appName);

  return page('Support', `
      <h1>Support &amp; Contact</h1>
      <p class="meta">We&rsquo;re here to help you get the most out of ${appName}.</p>

      <div class="support-grid">

        <div class="support-card">
          <div class="support-icon">&#9993;</div>
          <h3>Email Support</h3>
          <p>
            For general enquiries, account issues, or anything else, email us at:
          </p>
          <p class="support-email">
            <a href="mailto:support@instilligent.nz">support@instilligent.nz</a>
          </p>
          <p class="support-note">We aim to respond within <strong>2 business days</strong>.</p>
        </div>

        <div class="support-card">
          <div class="support-icon">&#128027;</div>
          <h3>Report a Bug</h3>
          <p>Found something that doesn&rsquo;t work as expected? Please include:</p>
          <ul>
            <li>A description of what happened and what you expected.</li>
            <li>The screen or feature where the issue occurred.</li>
            <li>Your device type and operating system version.</li>
            <li>Screenshots if possible.</li>
          </ul>
          <p>
            Send bug reports to
            <a href="mailto:support@instilligent.nz?subject=Bug%20Report">support@instilligent.nz</a>
            with the subject line &ldquo;Bug Report&rdquo;.
          </p>
        </div>

        <div class="support-card">
          <div class="support-icon">&#128161;</div>
          <h3>Feature Requests</h3>
          <p>
            Have an idea that would make ${appName} more useful for your trade? We genuinely want
            to hear it. Email us at
            <a href="mailto:support@instilligent.nz?subject=Feature%20Request">support@instilligent.nz</a>
            with the subject line &ldquo;Feature Request&rdquo;.
          </p>
          <p class="support-note">
            We review every request and prioritise based on demand and impact.
          </p>
        </div>

      </div>

      <h2>Frequently Asked Questions</h2>

      <div class="faq-list">

        <details class="faq-item">
          <summary>What is ${appName}?</summary>
          <p>
            ${appName} is a mobile app built specifically for New Zealand tradespeople and small
            service businesses. It brings together invoicing, quoting, expense tracking, job logging,
            compliance documentation (SWMS), certification tracking, and team management in one
            affordable, easy-to-use app.
          </p>
        </details>

        <details class="faq-item">
          <summary>Is ${appName} free?</summary>
          <p>
            ${appName} offers a free tier with basic features (3 invoices and 2 SWMS per month).
            Paid tiers start at $4.99 NZD per week for unlimited access. During the current beta
            period, all features are available to all users at no charge.
          </p>
        </details>

        <details class="faq-item">
          <summary>Does the app work offline?</summary>
          <p>
            Yes. ${appName} is designed with an offline-first approach. You can create invoices,
            log jobs, and manage your business data without an internet connection. Data
            automatically syncs when you&rsquo;re back online.
          </p>
        </details>

        <details class="faq-item">
          <summary>How are my SWMS documents generated?</summary>
          <p>
            ${appName} uses AI (powered by the Anthropic Claude API) to generate Safe Work Method
            Statements based on your trade type and job description. The generated documents are
            suggestions and should always be reviewed and customised for your specific worksite
            before use.
          </p>
        </details>

        <details class="faq-item">
          <summary>Is my data secure?</summary>
          <p>
            Yes. We use industry-standard encryption for data in transit (TLS/HTTPS) and at rest.
            Passwords are securely hashed and never stored in plain text. See our
            <a href="/privacy">Privacy Policy</a> for full details.
          </p>
        </details>

        <details class="faq-item">
          <summary>Can I use ${appName} with my team?</summary>
          <p>
            Yes. The Team tier ($9.99 NZD/week) supports up to 5 team members. You can invite
            members, assign roles (owner, admin, worker), and share business data across your team.
          </p>
        </details>

        <details class="faq-item">
          <summary>How do I cancel my subscription?</summary>
          <p>
            You can manage your subscription from the Settings screen in the app. If you cancel,
            you&rsquo;ll continue to have access until the end of your current billing period.
            You can also contact us at
            <a href="mailto:support@instilligent.nz">support@instilligent.nz</a> for assistance.
          </p>
        </details>

        <details class="faq-item">
          <summary>How do I delete my account?</summary>
          <p>
            You can request account deletion by emailing
            <a href="mailto:support@instilligent.nz?subject=Account%20Deletion%20Request">support@instilligent.nz</a>
            with the subject &ldquo;Account Deletion Request&rdquo;. We will process your request
            and confirm deletion within 20 working days. You may also request a copy of your data
            before deletion.
          </p>
        </details>

        <details class="faq-item">
          <summary>What New Zealand regulations does ${appName} support?</summary>
          <p>
            ${appName} is designed to help you comply with the Health and Safety at Work Act 2015,
            WorkSafe NZ guidelines, and PCBU (Person Conducting a Business or Undertaking) duties.
            Certification tracking helps you stay on top of trade licence renewals and other
            regulatory requirements.
          </p>
        </details>

        <details class="faq-item">
          <summary>I have a billing question. Who do I contact?</summary>
          <p>
            For any billing or payment enquiries, email us at
            <a href="mailto:support@instilligent.nz?subject=Billing%20Enquiry">support@instilligent.nz</a>
            with the subject &ldquo;Billing Enquiry&rdquo;. Please include the email address
            associated with your account.
          </p>
        </details>

      </div>

      <h2>About Us</h2>
      <div class="contact-box">
        <p><strong>Instilligent Limited</strong></p>
        <p>New Zealand</p>
        <p>Email: <a href="mailto:support@instilligent.nz">support@instilligent.nz</a></p>
      </div>
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

function getStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #F3F4F6;
      color: #111827;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Header ────────────────────────────────────────────────── */
    .site-header {
      background: #1e3a5f;
      color: #fff;
      padding: 0 16px;
    }
    .header-inner {
      max-width: 720px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 56px;
    }
    .brand {
      font-weight: 700;
      font-size: 18px;
      color: #fff;
      text-decoration: none;
    }
    .site-header nav a {
      color: rgba(255,255,255,0.85);
      text-decoration: none;
      font-size: 14px;
      margin-left: 20px;
      transition: color 0.15s;
    }
    .site-header nav a:hover { color: #fff; }

    /* ── Main container ────────────────────────────────────────── */
    .container {
      max-width: 720px;
      margin: 0 auto;
      padding: 32px 16px 48px;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 40px 36px;
    }

    /* ── Typography ─────────────────────────────────────────────── */
    h1 {
      font-size: 28px;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 8px;
    }
    .meta {
      color: #6B7280;
      font-size: 14px;
      margin-bottom: 32px;
    }
    h2 {
      font-size: 20px;
      font-weight: 600;
      color: #1e3a5f;
      margin-top: 36px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #E5E7EB;
    }
    h3 {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-top: 20px;
      margin-bottom: 8px;
    }
    p { margin-bottom: 12px; }
    ul {
      margin-bottom: 16px;
      padding-left: 24px;
    }
    li { margin-bottom: 6px; }
    a { color: #2563EB; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* ── Contact box ────────────────────────────────────────────── */
    .contact-box {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 20px 24px;
      margin-top: 12px;
    }
    .contact-box p { margin-bottom: 4px; }

    /* ── Disclaimer box ─────────────────────────────────────────── */
    .disclaimer-box {
      background: #FFFBEB;
      border: 1px solid #FCD34D;
      border-left: 4px solid #F59E0B;
      border-radius: 8px;
      padding: 20px 24px;
      margin-top: 12px;
    }

    /* ── Pricing table ──────────────────────────────────────────── */
    .pricing-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 20px;
      font-size: 14px;
    }
    .pricing-table th {
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6B7280;
      padding: 10px 12px;
      border-bottom: 2px solid #E5E7EB;
      background: #F9FAFB;
    }
    .pricing-table td {
      padding: 12px;
      border-bottom: 1px solid #F3F4F6;
      vertical-align: top;
    }

    /* ── Support grid ───────────────────────────────────────────── */
    .support-grid {
      display: grid;
      gap: 20px;
      margin-top: 24px;
    }
    .support-card {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 24px;
    }
    .support-icon {
      font-size: 28px;
      margin-bottom: 8px;
    }
    .support-card h3 {
      margin-top: 0;
      color: #1e3a5f;
    }
    .support-email a {
      font-size: 18px;
      font-weight: 600;
      color: #2563EB;
    }
    .support-note {
      font-size: 13px;
      color: #6B7280;
      margin-bottom: 0;
    }
    .support-card ul {
      font-size: 14px;
      margin-bottom: 12px;
    }

    /* ── FAQ ─────────────────────────────────────────────────────── */
    .faq-list {
      margin-top: 16px;
    }
    .faq-item {
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .faq-item summary {
      font-weight: 600;
      font-size: 15px;
      padding: 16px 20px;
      cursor: pointer;
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #fff;
      transition: background 0.15s;
    }
    .faq-item summary:hover { background: #F9FAFB; }
    .faq-item summary::after {
      content: '+';
      font-size: 20px;
      font-weight: 300;
      color: #6B7280;
      flex-shrink: 0;
      margin-left: 12px;
    }
    .faq-item[open] summary::after { content: '\\2212'; }
    .faq-item summary::-webkit-details-marker { display: none; }
    .faq-item p {
      padding: 0 20px 16px;
      color: #374151;
      font-size: 14px;
      line-height: 1.6;
    }
    .faq-item ul {
      padding: 0 20px 16px 44px;
      font-size: 14px;
    }

    /* ── Footer ──────────────────────────────────────────────────── */
    .site-footer {
      border-top: 1px solid #E5E7EB;
      background: #fff;
      padding: 24px 16px;
      margin-top: 16px;
    }
    .footer-inner {
      max-width: 720px;
      margin: 0 auto;
      text-align: center;
      font-size: 13px;
      color: #9CA3AF;
    }
    .footer-links { margin-top: 8px; }
    .footer-links a {
      color: #6B7280;
      text-decoration: none;
      margin: 0 10px;
    }
    .footer-links a:hover { color: #2563EB; }

    /* ── Responsive ─────────────────────────────────────────────── */
    @media (max-width: 480px) {
      .container { padding: 20px 10px 36px; }
      .card { padding: 28px 20px; border-radius: 8px; }
      h1 { font-size: 24px; }
      h2 { font-size: 18px; }
      .header-inner { height: 48px; }
      .brand { font-size: 16px; }
      .site-header nav a { margin-left: 14px; font-size: 13px; }
      .pricing-table { font-size: 13px; }
      .pricing-table th, .pricing-table td { padding: 8px 6px; }
    }
  `;
}

export default router;
