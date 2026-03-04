/**
 * Email Service
 * Send invoices via email with PDF attachment using Nodemailer
 */

import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { Invoice } from '../types/index.js';

/**
 * Check if SMTP is configured
 */
export function isSmtpConfigured(): boolean {
  return !!(config.smtp.host && config.smtp.user && config.smtp.pass);

/**
 * Check if Resend HTTP API is configured (preferred over SMTP)
 */
export function isResendConfigured(): boolean {
  return !!config.resendApiKey;
}

/**
 * Send email via Resend HTTP API
 * Used when SMTP ports are blocked (common on cloud platforms like Railway)
 */
async function sendViaResendApi(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<{ messageId: string }> {
  const fromEmail = config.smtp.fromEmail || 'noreply@instilligent.com';
  const fromName = config.smtp.fromName || 'BossBoard';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': \Bearer \\,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: \\ <\>\,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(\Resend API error (\): \\);
  }

  const data = await response.json() as any;
  return { messageId: data.id || 'resend-' + Date.now() };
}
}

/**
 * Create nodemailer transport
 * Uses configured SMTP or falls back to a test account in development
 */
function createTransport() {
  if (!isSmtpConfigured()) {
    throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
  }

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

/**
 * Format cents to NZD currency string
 */
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Build the invoice email HTML body
 */
function buildInvoiceEmailHtml(invoice: Invoice, senderName: string): string {
  const lineItemsHtml = invoice.lineItems
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB;">${item.description}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; text-align: right;">${formatCurrency(item.amount)}</td>
        </tr>`
    )
    .join('');

  const dueDateHtml = invoice.dueDate
    ? `<p style="margin: 0 0 8px; color: #374151;">
        <strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>`
    : '';

  const bankHtml = invoice.bankAccountName || invoice.bankAccountNumber
    ? `<div style="margin-top: 20px; padding: 16px; background: #F9FAFB; border-radius: 8px;">
        <h3 style="margin: 0 0 8px; color: #111827; font-size: 14px;">Payment Details</h3>
        ${invoice.bankAccountName ? `<p style="margin: 0 0 4px; color: #374151; font-size: 13px;"><strong>Account Name:</strong> ${invoice.bankAccountName}</p>` : ''}
        ${invoice.bankAccountNumber ? `<p style="margin: 0 0 4px; color: #374151; font-size: 13px;"><strong>Account Number:</strong> ${invoice.bankAccountNumber}</p>` : ''}
      </div>`
    : '';

  const notesHtml = invoice.notes
    ? `<div style="margin-top: 16px; padding: 12px; background: #FFFBEB; border-radius: 8px;">
        <p style="margin: 0; color: #92400E; font-size: 13px;">${invoice.notes}</p>
      </div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F3F4F6; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background: #2563EB; padding: 24px 32px;">
      <h1 style="margin: 0; color: #FFFFFF; font-size: 20px;">Invoice ${invoice.invoiceNumber}</h1>
      ${invoice.companyName ? `<p style="margin: 8px 0 0; color: #BFDBFE; font-size: 14px;">${invoice.companyName}</p>` : ''}
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <p style="margin: 0 0 4px; color: #6B7280; font-size: 13px;">Bill To:</p>
      <p style="margin: 0 0 16px; color: #111827; font-size: 16px; font-weight: 600;">${invoice.clientName}</p>

      ${invoice.jobDescription ? `<p style="margin: 0 0 16px; color: #374151; font-size: 14px;">${invoice.jobDescription}</p>` : ''}

      ${dueDateHtml}

      <!-- Line Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <thead>
          <tr style="background: #F9FAFB;">
            <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #6B7280; border-bottom: 2px solid #E5E7EB;">Description</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 13px; color: #6B7280; border-bottom: 2px solid #E5E7EB;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="margin-top: 16px; text-align: right;">
        <p style="margin: 0 0 4px; color: #6B7280; font-size: 13px;">Subtotal: ${formatCurrency(invoice.subtotal)}</p>
        ${invoice.includeGst ? `<p style="margin: 0 0 4px; color: #6B7280; font-size: 13px;">GST (15%): ${formatCurrency(invoice.gstAmount)}</p>` : ''}
        <p style="margin: 8px 0 0; color: #111827; font-size: 20px; font-weight: 700;">Total: ${formatCurrency(invoice.total)}</p>
      </div>

      ${bankHtml}
      ${notesHtml}
    </div>

    <!-- Footer -->
    <div style="padding: 16px 32px; background: #F9FAFB; border-top: 1px solid #E5E7EB;">
      <p style="margin: 0; color: #9CA3AF; font-size: 12px; text-align: center;">
        Sent via ${config.smtp.fromName}${senderName ? ` on behalf of ${senderName}` : ''}
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Build plain text version of the invoice email
 */
function buildInvoiceEmailText(invoice: Invoice, senderName: string): string {
  const lines = [
    `Invoice ${invoice.invoiceNumber}`,
    invoice.companyName ? `From: ${invoice.companyName}` : '',
    '',
    `Bill To: ${invoice.clientName}`,
    invoice.jobDescription ? `Job: ${invoice.jobDescription}` : '',
    invoice.dueDate ? `Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-NZ')}` : '',
    '',
    '--- Line Items ---',
    ...invoice.lineItems.map((item) => `  ${item.description}: ${formatCurrency(item.amount)}`),
    '',
    `Subtotal: ${formatCurrency(invoice.subtotal)}`,
    invoice.includeGst ? `GST (15%): ${formatCurrency(invoice.gstAmount)}` : '',
    `Total: ${formatCurrency(invoice.total)}`,
    '',
  ];

  if (invoice.bankAccountName || invoice.bankAccountNumber) {
    lines.push('--- Payment Details ---');
    if (invoice.bankAccountName) lines.push(`Account Name: ${invoice.bankAccountName}`);
    if (invoice.bankAccountNumber) lines.push(`Account Number: ${invoice.bankAccountNumber}`);
    lines.push('');
  }

  if (invoice.notes) {
    lines.push(`Notes: ${invoice.notes}`);
    lines.push('');
  }

  lines.push(`Sent via ${config.smtp.fromName}${senderName ? ` on behalf of ${senderName}` : ''}`);

  return lines.filter((l) => l !== undefined).join('\n');
}

/**
 * Send an invoice email with PDF attachment
 */
export async function sendInvoiceEmail(
  invoice: Invoice,
  pdfBuffer: Buffer,
  recipientEmail: string,
  senderName: string,
  customMessage?: string
): Promise<{ messageId: string }> {
  const transport = createTransport();

  const fromEmail = config.smtp.fromEmail || config.smtp.user;
  const fromDisplay = senderName || config.smtp.fromName;

  const subject = customMessage
    ? `Invoice ${invoice.invoiceNumber} - ${customMessage}`
    : `Invoice ${invoice.invoiceNumber} from ${senderName || config.smtp.fromName}`;

  const info = await transport.sendMail({
    from: `"${fromDisplay}" <${fromEmail}>`,
    to: recipientEmail,
    subject,
    text: buildInvoiceEmailText(invoice, senderName),
    html: buildInvoiceEmailHtml(invoice, senderName),
    attachments: [
      {
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  return { messageId: info.messageId };
}

/**
 * Send an email verification code
 */
/**
 * Send an email verification code
 */
export async function sendVerificationEmail(
  recipientEmail: string,
  code: string
): Promise<{ messageId: string }> {
  const appName = config.smtp.fromName;

  const subject = ${''} - Verify Your Email;

  const html = ${''}<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F3F4F6; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #F97316; padding: 24px 32px;">
      <h1 style="margin: 0; color: #FFFFFF; font-size: 20px;">Verify Your Email</h1>
      <p style="margin: 8px 0 0; color: #FED7AA; font-size: 14px;"></p>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">Welcome to ! Enter this code to verify your email:</p>
      <div style="margin: 24px 0; padding: 20px; background: #FFF7ED; border: 2px solid #F97316; border-radius: 8px; text-align: center;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827;"></span>
      </div>
      <p style="margin: 0 0 8px; color: #6B7280; font-size: 13px;">This code expires in 30 minutes.</p>
      <p style="margin: 0; color: #6B7280; font-size: 13px;">If you didn't create an account, you can safely ignore this email.</p>
    </div>
    <div style="padding: 16px 32px; background: #F9FAFB; border-top: 1px solid #E5E7EB;">
      <p style="margin: 0; color: #9CA3AF; font-size: 12px; text-align: center;">Sent via </p>
    </div>
  </div>
</body>
</html>;

  const text = [
    ${''} - Email Verification,
    '',
    'Welcome! Enter this code to verify your email:',
    '',
    ${''}  ,
    '',
    'This code expires in 30 minutes.',
    "If you didn't create an account, you can safely ignore this email.",
  ].join('\n');

  // Use Resend HTTP API if available (SMTP ports often blocked on cloud platforms)
  if (isResendConfigured()) {
    return sendViaResendApi(recipientEmail, subject, html, text);
  }

  // Fall back to SMTP
  const transport = createTransport();
  const fromEmail = config.smtp.fromEmail || config.smtp.user;
  const info = await transport.sendMail({
    from: "" <>,
    to: recipientEmail,
    subject,
    text,
    html,
  });

  return { messageId: info.messageId };
}

/**
 * Send a password reset email with 6-digit code
 */
export async function sendPasswordResetEmail(
  recipientEmail: string,
  code: string
): Promise<{ messageId: string }> {
  const appName = config.smtp.fromName;

  const subject = ${''} - Password Reset Code: ;

  const html = ${''}<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F3F4F6; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #2563EB; padding: 24px 32px;">
      <h1 style="margin: 0; color: #FFFFFF; font-size: 20px;">Password Reset</h1>
      <p style="margin: 8px 0 0; color: #BFDBFE; font-size: 14px;"></p>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">You requested a password reset. Enter this code in the app:</p>
      <div style="margin: 24px 0; padding: 20px; background: #F9FAFB; border-radius: 8px; text-align: center;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827;"></span>
      </div>
      <p style="margin: 0 0 8px; color: #6B7280; font-size: 13px;">This code expires in 30 minutes.</p>
      <p style="margin: 0; color: #6B7280; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div style="padding: 16px 32px; background: #F9FAFB; border-top: 1px solid #E5E7EB;">
      <p style="margin: 0; color: #9CA3AF; font-size: 12px; text-align: center;">Sent via </p>
    </div>
  </div>
</body>
</html>;

  const text = [
    ${''} - Password Reset,
    '',
    'You requested a password reset. Enter this code in the app:',
    '',
    ${''}  ,
    '',
    'This code expires in 30 minutes.',
    'If you didn\'t request this, you can safely ignore this email.',
  ].join('\n');

  // Use Resend HTTP API if available (SMTP ports often blocked on cloud platforms)
  if (isResendConfigured()) {
    return sendViaResendApi(recipientEmail, subject, html, text);
  }

  // Fall back to SMTP
  const transport = createTransport();
  const fromEmail = config.smtp.fromEmail || config.smtp.user;
  const info = await transport.sendMail({
    from: "" <>,
    to: recipientEmail,
    subject,
    text,
    html,
  });

  return { messageId: info.messageId };
}

export default {
  isSmtpConfigured,
  isResendConfigured,
  sendInvoiceEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
