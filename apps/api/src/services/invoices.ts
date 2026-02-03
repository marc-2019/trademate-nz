/**
 * Invoices Service
 * Invoice creation, management, and payment tracking
 */

import { v4 as uuidv4 } from 'uuid';
import db from './database.js';
import {
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  InvoiceCreateInput,
  InvoiceUpdateInput,
} from '../types/index.js';
import { createError } from '../middleware/error.js';

const GST_RATE = 0.15; // NZ GST rate

/**
 * Generate next invoice number for user (INV-0001, INV-0002, etc.)
 */
export async function getNextInvoiceNumber(userId: string): Promise<string> {
  const result = await db.query<{ count: string }>(
    'SELECT COUNT(*) as count FROM invoices WHERE user_id = $1',
    [userId]
  );
  const count = parseInt(result.rows[0].count, 10) + 1;
  return `INV-${count.toString().padStart(4, '0')}`;
}

/**
 * Calculate invoice totals from line items
 */
function calculateTotals(
  lineItems: { description: string; amount: number }[],
  includeGst: boolean = true
): { subtotal: number; gstAmount: number; total: number } {
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const gstAmount = includeGst ? Math.round(subtotal * GST_RATE) : 0;
  const total = subtotal + gstAmount;
  return { subtotal, gstAmount, total };
}

/**
 * Create a new invoice
 */
export async function createInvoice(
  userId: string,
  input: InvoiceCreateInput
): Promise<Invoice> {
  const invoiceNumber = await getNextInvoiceNumber(userId);
  const invoiceId = uuidv4();

  // Add IDs to line items
  const lineItems: InvoiceLineItem[] = input.lineItems.map((item) => ({
    id: uuidv4(),
    description: item.description,
    amount: item.amount,
  }));

  // Calculate totals
  const { subtotal, gstAmount, total } = calculateTotals(
    input.lineItems,
    input.includeGst !== false
  );

  const result = await db.query<Invoice>(
    `INSERT INTO invoices (
      id, user_id, invoice_number,
      client_name, client_email, client_phone,
      swms_id, job_description,
      line_items, subtotal, gst_amount, total,
      status, due_date,
      bank_account_name, bank_account_number, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft', $13, $14, $15, $16)
    RETURNING *`,
    [
      invoiceId,
      userId,
      invoiceNumber,
      input.clientName,
      input.clientEmail || null,
      input.clientPhone || null,
      input.swmsId || null,
      input.jobDescription || null,
      JSON.stringify(lineItems),
      subtotal,
      gstAmount,
      total,
      input.dueDate || null,
      input.bankAccountName || null,
      input.bankAccountNumber || null,
      input.notes || null,
    ]
  );

  return transformInvoice(result.rows[0]);
}

/**
 * Transform DB row to Invoice type with proper casing
 */
function transformInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    invoiceNumber: row.invoice_number as string,
    clientName: row.client_name as string,
    clientEmail: row.client_email as string | null,
    clientPhone: row.client_phone as string | null,
    swmsId: row.swms_id as string | null,
    jobDescription: row.job_description as string | null,
    lineItems: typeof row.line_items === 'string'
      ? JSON.parse(row.line_items)
      : (row.line_items as InvoiceLineItem[]) || [],
    subtotal: row.subtotal as number,
    gstAmount: row.gst_amount as number,
    total: row.total as number,
    status: row.status as InvoiceStatus,
    dueDate: row.due_date as string | null,
    paidAt: row.paid_at as Date | null,
    bankAccountName: row.bank_account_name as string | null,
    bankAccountNumber: row.bank_account_number as string | null,
    notes: row.notes as string | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

/**
 * Transform to mobile-friendly snake_case format
 */
function transformForMobile(invoice: Invoice): Record<string, unknown> {
  return {
    id: invoice.id,
    user_id: invoice.userId,
    invoice_number: invoice.invoiceNumber,
    client_name: invoice.clientName,
    client_email: invoice.clientEmail,
    client_phone: invoice.clientPhone,
    swms_id: invoice.swmsId,
    job_description: invoice.jobDescription,
    line_items: invoice.lineItems,
    subtotal: invoice.subtotal,
    gst_amount: invoice.gstAmount,
    total: invoice.total,
    status: invoice.status,
    due_date: invoice.dueDate,
    paid_at: invoice.paidAt,
    bank_account_name: invoice.bankAccountName,
    bank_account_number: invoice.bankAccountNumber,
    notes: invoice.notes,
    created_at: invoice.createdAt,
    updated_at: invoice.updatedAt,
  };
}

/**
 * Get invoice by ID
 */
export async function getInvoiceById(
  invoiceId: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  const result = await db.query<Record<string, unknown>>(
    `SELECT * FROM invoices WHERE id = $1 AND user_id = $2`,
    [invoiceId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return transformForMobile(transformInvoice(result.rows[0]));
}

/**
 * List invoices for user
 */
export async function listInvoices(
  userId: string,
  options: { status?: InvoiceStatus; limit?: number; offset?: number } = {}
): Promise<{ invoices: Record<string, unknown>[]; total: number }> {
  const { status, limit = 20, offset = 0 } = options;

  let whereClause = 'user_id = $1';
  const params: unknown[] = [userId];

  if (status) {
    whereClause += ' AND status = $2';
    params.push(status);
  }

  // Get total count
  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM invoices WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get items
  const result = await db.query<Record<string, unknown>>(
    `SELECT * FROM invoices
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const invoices = result.rows.map((row) => transformForMobile(transformInvoice(row)));

  return { invoices, total };
}

/**
 * Update invoice
 */
export async function updateInvoice(
  invoiceId: string,
  userId: string,
  updates: InvoiceUpdateInput
): Promise<Record<string, unknown> | null> {
  // First check if invoice exists and is draft
  const existing = await db.query<Record<string, unknown>>(
    'SELECT status FROM invoices WHERE id = $1 AND user_id = $2',
    [invoiceId, userId]
  );

  if (existing.rows.length === 0) {
    return null;
  }

  if (existing.rows[0].status !== 'draft') {
    throw createError('Can only edit draft invoices', 400, 'INVOICE_NOT_EDITABLE');
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    clientName: 'client_name',
    clientEmail: 'client_email',
    clientPhone: 'client_phone',
    swmsId: 'swms_id',
    jobDescription: 'job_description',
    dueDate: 'due_date',
    bankAccountName: 'bank_account_name',
    bankAccountNumber: 'bank_account_number',
    notes: 'notes',
  };

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'lineItems' && value !== undefined) {
      // Recalculate totals when line items change
      const lineItems = (value as { description: string; amount: number }[]).map((item) => ({
        id: uuidv4(),
        description: item.description,
        amount: item.amount,
      }));
      const { subtotal, gstAmount, total } = calculateTotals(
        value as { description: string; amount: number }[],
        updates.includeGst !== false
      );

      fields.push(`line_items = $${paramIndex++}`);
      values.push(JSON.stringify(lineItems));
      fields.push(`subtotal = $${paramIndex++}`);
      values.push(subtotal);
      fields.push(`gst_amount = $${paramIndex++}`);
      values.push(gstAmount);
      fields.push(`total = $${paramIndex++}`);
      values.push(total);
    } else if (fieldMap[key] && value !== undefined) {
      fields.push(`${fieldMap[key]} = $${paramIndex++}`);
      values.push(value);
    }
  }

  if (fields.length === 0) {
    return getInvoiceById(invoiceId, userId);
  }

  fields.push('updated_at = NOW()');
  values.push(invoiceId, userId);

  await db.query(
    `UPDATE invoices SET ${fields.join(', ')}
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex}`,
    values
  );

  return getInvoiceById(invoiceId, userId);
}

/**
 * Delete invoice
 */
export async function deleteInvoice(invoiceId: string, userId: string): Promise<boolean> {
  const result = await db.query(
    'DELETE FROM invoices WHERE id = $1 AND user_id = $2',
    [invoiceId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Mark invoice as sent
 */
export async function markAsSent(
  invoiceId: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  const result = await db.query<Record<string, unknown>>(
    `UPDATE invoices SET status = 'sent', updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status = 'draft'
     RETURNING *`,
    [invoiceId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return transformForMobile(transformInvoice(result.rows[0]));
}

/**
 * Mark invoice as paid
 */
export async function markAsPaid(
  invoiceId: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  const result = await db.query<Record<string, unknown>>(
    `UPDATE invoices SET status = 'paid', paid_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status IN ('sent', 'overdue')
     RETURNING *`,
    [invoiceId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return transformForMobile(transformInvoice(result.rows[0]));
}

/**
 * Get invoice statistics for a user
 */
export async function getInvoiceStats(userId: string): Promise<{
  total: number;
  unpaid: number;
  unpaidAmount: number;
  thisMonth: number;
}> {
  const result = await db.query<{
    total: string;
    unpaid: string;
    unpaid_amount: string;
    this_month: string;
  }>(
    `SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status IN ('sent', 'overdue')) as unpaid,
      COALESCE(SUM(total) FILTER (WHERE status IN ('sent', 'overdue')), 0) as unpaid_amount,
      COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as this_month
     FROM invoices WHERE user_id = $1`,
    [userId]
  );

  const row = result.rows[0];
  return {
    total: parseInt(row.total, 10),
    unpaid: parseInt(row.unpaid, 10),
    unpaidAmount: parseInt(row.unpaid_amount, 10),
    thisMonth: parseInt(row.this_month, 10),
  };
}

export default {
  getNextInvoiceNumber,
  createInvoice,
  getInvoiceById,
  listInvoices,
  updateInvoice,
  deleteInvoice,
  markAsSent,
  markAsPaid,
  getInvoiceStats,
};
