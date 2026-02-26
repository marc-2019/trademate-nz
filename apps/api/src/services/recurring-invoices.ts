/**
 * Recurring Invoices Service
 * Monthly invoice templates with fixed/variable line items
 */

import { v4 as uuidv4 } from 'uuid';
import db from './database.js';
import invoicesService from './invoices.js';
import {
  RecurringInvoice,
  ProductType,
  RecurringInvoiceCreateInput,
  RecurringInvoiceUpdateInput,
} from '../types/index.js';

/**
 * Transform DB row to RecurringInvoice type
 */
function transformRecurring(row: Record<string, unknown>): RecurringInvoice {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    customerId: row.customer_id as string,
    name: row.name as string,
    recurrence: row.recurrence as 'monthly',
    dayOfMonth: row.day_of_month as number,
    isAutoGenerate: row.is_auto_generate as boolean,
    includeGst: row.include_gst as boolean,
    paymentTerms: row.payment_terms as number,
    notes: row.notes as string | null,
    isActive: row.is_active as boolean,
    lastGeneratedAt: row.last_generated_at as Date | null,
    nextGenerationDate: row.next_generation_date as string | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

/**
 * Transform to mobile-friendly snake_case format
 */
function transformForMobile(rec: RecurringInvoice): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: rec.id,
    user_id: rec.userId,
    customer_id: rec.customerId,
    name: rec.name,
    recurrence: rec.recurrence,
    day_of_month: rec.dayOfMonth,
    is_auto_generate: rec.isAutoGenerate,
    include_gst: rec.includeGst,
    payment_terms: rec.paymentTerms,
    notes: rec.notes,
    is_active: rec.isActive,
    last_generated_at: rec.lastGeneratedAt,
    next_generation_date: rec.nextGenerationDate,
    created_at: rec.createdAt,
    updated_at: rec.updatedAt,
  };

  if (rec.customer) {
    result.customer = {
      id: rec.customer.id,
      name: rec.customer.name,
      email: rec.customer.email,
      phone: rec.customer.phone,
    };
  }

  if (rec.lineItems) {
    result.line_items = rec.lineItems.map((li) => ({
      id: li.id,
      recurring_invoice_id: li.recurringInvoiceId,
      product_service_id: li.productServiceId,
      description: li.description,
      unit_price: li.unitPrice,
      quantity: li.quantity,
      type: li.type,
      sort_order: li.sortOrder,
      product_name: li.productName,
    }));
  }

  return result;
}

/**
 * Compute next generation date from day_of_month
 */
function computeNextGenerationDate(dayOfMonth: number): string {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-indexed

  // If we've passed the day this month, schedule for next month
  if (now.getDate() >= dayOfMonth) {
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  // Format as YYYY-MM-DD
  const m = String(month + 1).padStart(2, '0');
  const d = String(dayOfMonth).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Create a recurring invoice with line items (transaction)
 */
export async function createRecurringInvoice(
  userId: string,
  input: RecurringInvoiceCreateInput
): Promise<Record<string, unknown>> {
  const recurringId = uuidv4();
  const dayOfMonth = input.dayOfMonth ?? 1;
  const nextGen = computeNextGenerationDate(dayOfMonth);

  // Determine isAutoGenerate: true if ALL line items are 'fixed'
  const isAutoGenerate = input.lineItems.every((li) => li.type === 'fixed');

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Insert recurring invoice
    await client.query<Record<string, unknown>>(
      `INSERT INTO recurring_invoices (
        id, user_id, customer_id, name, recurrence, day_of_month,
        is_auto_generate, include_gst, payment_terms, notes,
        next_generation_date
      )
      VALUES ($1, $2, $3, $4, 'monthly', $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        recurringId,
        userId,
        input.customerId,
        input.name,
        dayOfMonth,
        isAutoGenerate,
        input.includeGst ?? true,
        input.paymentTerms ?? 20,
        input.notes || null,
        nextGen,
      ]
    );

    // Insert line items
    for (let i = 0; i < input.lineItems.length; i++) {
      const li = input.lineItems[i];
      await client.query(
        `INSERT INTO recurring_line_items (
          id, recurring_invoice_id, product_service_id,
          description, unit_price, quantity, type, sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          uuidv4(),
          recurringId,
          li.productServiceId,
          li.description || null,
          li.unitPrice,
          li.quantity ?? 1,
          li.type,
          i,
        ]
      );
    }

    await client.query('COMMIT');

    // Fetch full detail to return
    return await getRecurringInvoiceById(recurringId, userId) as Record<string, unknown>;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get recurring invoice by ID with customer and line items
 */
export async function getRecurringInvoiceById(
  recurringId: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  const result = await db.query<Record<string, unknown>>(
    `SELECT ri.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
     FROM recurring_invoices ri
     JOIN customers c ON c.id = ri.customer_id
     WHERE ri.id = $1 AND ri.user_id = $2`,
    [recurringId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const rec = transformRecurring(row);

  // Attach customer info
  rec.customer = {
    id: row.customer_id as string,
    userId: userId,
    name: row.customer_name as string,
    email: row.customer_email as string | null,
    phone: row.customer_phone as string | null,
    address: null,
    notes: null,
    defaultPaymentTerms: null,
    defaultIncludeGst: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Fetch line items with product names
  const liResult = await db.query<Record<string, unknown>>(
    `SELECT rli.*, ps.name as product_name
     FROM recurring_line_items rli
     JOIN products_services ps ON ps.id = rli.product_service_id
     WHERE rli.recurring_invoice_id = $1
     ORDER BY rli.sort_order ASC`,
    [recurringId]
  );

  rec.lineItems = liResult.rows.map((liRow) => ({
    id: liRow.id as string,
    recurringInvoiceId: liRow.recurring_invoice_id as string,
    productServiceId: liRow.product_service_id as string,
    description: liRow.description as string | null,
    unitPrice: liRow.unit_price as number,
    quantity: liRow.quantity as number,
    type: liRow.type as ProductType,
    sortOrder: liRow.sort_order as number,
    createdAt: liRow.created_at as Date,
    updatedAt: liRow.updated_at as Date,
    productName: liRow.product_name as string,
  }));

  return transformForMobile(rec);
}

/**
 * List recurring invoices for user
 */
export async function listRecurringInvoices(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ recurringInvoices: Record<string, unknown>[]; total: number }> {
  const { limit = 50, offset = 0 } = options;

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM recurring_invoices WHERE user_id = $1`,
    [userId]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await db.query<Record<string, unknown>>(
    `SELECT ri.*, c.name as customer_name
     FROM recurring_invoices ri
     JOIN customers c ON c.id = ri.customer_id
     WHERE ri.user_id = $1
     ORDER BY ri.is_active DESC, ri.name ASC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const recurringInvoices = result.rows.map((row) => {
    const rec = transformRecurring(row);
    const mobile = transformForMobile(rec);
    mobile.customer_name = row.customer_name;
    return mobile;
  });

  return { recurringInvoices, total };
}

/**
 * Get pending recurring invoices split by auto-generate vs needs-input
 */
export async function getPendingRecurringInvoices(
  userId: string
): Promise<{ autoGenerate: Record<string, unknown>[]; needsInput: Record<string, unknown>[] }> {
  const result = await db.query<Record<string, unknown>>(
    `SELECT ri.*, c.name as customer_name
     FROM recurring_invoices ri
     JOIN customers c ON c.id = ri.customer_id
     WHERE ri.user_id = $1
       AND ri.is_active = true
       AND ri.next_generation_date <= CURRENT_DATE
     ORDER BY ri.next_generation_date ASC`,
    [userId]
  );

  const autoGenerate: Record<string, unknown>[] = [];
  const needsInput: Record<string, unknown>[] = [];

  for (const row of result.rows) {
    const rec = transformRecurring(row);
    const mobile = transformForMobile(rec);
    mobile.customer_name = row.customer_name;

    if (rec.isAutoGenerate) {
      autoGenerate.push(mobile);
    } else {
      needsInput.push(mobile);
    }
  }

  return { autoGenerate, needsInput };
}

/**
 * Update recurring invoice (optionally replace line items)
 */
export async function updateRecurringInvoice(
  recurringId: string,
  userId: string,
  updates: RecurringInvoiceUpdateInput
): Promise<Record<string, unknown> | null> {
  // Verify ownership
  const existing = await db.query(
    'SELECT id FROM recurring_invoices WHERE id = $1 AND user_id = $2',
    [recurringId, userId]
  );
  if (existing.rows.length === 0) return null;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Build dynamic update for recurring_invoices fields
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      dayOfMonth: 'day_of_month',
      includeGst: 'include_gst',
      paymentTerms: 'payment_terms',
      notes: 'notes',
      isActive: 'is_active',
    };

    for (const [key, value] of Object.entries(updates)) {
      if (fieldMap[key] && value !== undefined) {
        fields.push(`${fieldMap[key]} = $${paramIndex++}`);
        values.push(value ?? null);
      }
    }

    // Handle line items replacement
    if (updates.lineItems) {
      // Delete existing
      await client.query(
        'DELETE FROM recurring_line_items WHERE recurring_invoice_id = $1',
        [recurringId]
      );

      // Insert new
      for (let i = 0; i < updates.lineItems.length; i++) {
        const li = updates.lineItems[i];
        await client.query(
          `INSERT INTO recurring_line_items (
            id, recurring_invoice_id, product_service_id,
            description, unit_price, quantity, type, sort_order
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            uuidv4(),
            recurringId,
            li.productServiceId,
            li.description || null,
            li.unitPrice,
            li.quantity ?? 1,
            li.type,
            i,
          ]
        );
      }

      // Recompute is_auto_generate
      const isAutoGenerate = updates.lineItems.every((li) => li.type === 'fixed');
      fields.push(`is_auto_generate = $${paramIndex++}`);
      values.push(isAutoGenerate);
    }

    // Recompute next_generation_date if dayOfMonth changed
    if (updates.dayOfMonth !== undefined) {
      const nextGen = computeNextGenerationDate(updates.dayOfMonth);
      fields.push(`next_generation_date = $${paramIndex++}`);
      values.push(nextGen);
    }

    if (fields.length > 0) {
      fields.push('updated_at = NOW()');
      values.push(recurringId, userId);

      await client.query(
        `UPDATE recurring_invoices SET ${fields.join(', ')}
         WHERE id = $${paramIndex++} AND user_id = $${paramIndex}`,
        values
      );
    }

    await client.query('COMMIT');
    return await getRecurringInvoiceById(recurringId, userId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete recurring invoice (hard delete, cascades to line items)
 */
export async function deleteRecurringInvoice(
  recurringId: string,
  userId: string
): Promise<boolean> {
  const result = await db.query(
    'DELETE FROM recurring_invoices WHERE id = $1 AND user_id = $2',
    [recurringId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Generate a draft invoice from a recurring invoice config
 */
export async function generateInvoiceFromRecurring(
  recurringId: string,
  userId: string,
  variableAmounts?: Record<string, number>
): Promise<Record<string, unknown>> {
  // Fetch recurring config with customer + line items
  const recResult = await db.query<Record<string, unknown>>(
    `SELECT ri.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
     FROM recurring_invoices ri
     JOIN customers c ON c.id = ri.customer_id
     WHERE ri.id = $1 AND ri.user_id = $2`,
    [recurringId, userId]
  );

  if (recResult.rows.length === 0) {
    throw new Error('Recurring invoice not found');
  }

  const recRow = recResult.rows[0];

  // Fetch line items
  const liResult = await db.query<Record<string, unknown>>(
    `SELECT rli.*, ps.name as product_name
     FROM recurring_line_items rli
     JOIN products_services ps ON ps.id = rli.product_service_id
     WHERE rli.recurring_invoice_id = $1
     ORDER BY rli.sort_order ASC`,
    [recurringId]
  );

  // Build invoice line items
  const invoiceLineItems = liResult.rows.map((li) => {
    const liId = li.id as string;
    const quantity = li.quantity as number;
    const storedPrice = li.unit_price as number;
    const type = li.type as string;

    let amount: number;
    if (type === 'variable' && variableAmounts && variableAmounts[liId] !== undefined) {
      amount = variableAmounts[liId];
    } else {
      amount = storedPrice * quantity;
    }

    const description = (li.description as string) || (li.product_name as string);
    return { description, amount };
  });

  // Calculate due date from payment terms
  const paymentTerms = recRow.payment_terms as number;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + paymentTerms);
  const dueDateStr = dueDate.toISOString().split('T')[0];

  // Create the invoice via existing service
  const invoice = await invoicesService.createInvoice(userId, {
    clientName: recRow.customer_name as string,
    clientEmail: (recRow.customer_email as string) || undefined,
    clientPhone: (recRow.customer_phone as string) || undefined,
    lineItems: invoiceLineItems,
    includeGst: recRow.include_gst as boolean,
    dueDate: dueDateStr,
    notes: (recRow.notes as string) || undefined,
    customerId: recRow.customer_id as string,
    recurringInvoiceId: recurringId,
  });

  // Update last_generated_at and next_generation_date
  const dayOfMonth = recRow.day_of_month as number;
  const nextGen = computeNextGenerationDate(dayOfMonth);

  await db.query(
    `UPDATE recurring_invoices
     SET last_generated_at = NOW(), next_generation_date = $1, updated_at = NOW()
     WHERE id = $2`,
    [nextGen, recurringId]
  );

  return invoice as unknown as Record<string, unknown>;
}

/**
 * Get last invoice amounts for a recurring invoice (for reference when entering variable amounts)
 */
export async function getLastAmounts(
  recurringId: string,
  userId: string
): Promise<Record<string, unknown>[]> {
  // Find the most recent invoice generated from this recurring config
  const invoiceResult = await db.query<Record<string, unknown>>(
    `SELECT line_items FROM invoices
     WHERE recurring_invoice_id = $1 AND user_id = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [recurringId, userId]
  );

  if (invoiceResult.rows.length === 0) {
    return [];
  }

  const lineItems = invoiceResult.rows[0].line_items;
  const parsed = typeof lineItems === 'string' ? JSON.parse(lineItems) : lineItems;
  return parsed || [];
}

export default {
  createRecurringInvoice,
  getRecurringInvoiceById,
  listRecurringInvoices,
  getPendingRecurringInvoices,
  updateRecurringInvoice,
  deleteRecurringInvoice,
  generateInvoiceFromRecurring,
  getLastAmounts,
};
