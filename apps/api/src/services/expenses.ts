/**
 * Expenses Service
 * Expense tracking with categories and GST support
 */

import db from './database.js';
import {
  Expense,
  ExpenseCategory,
  ExpenseCreateInput,
  ExpenseUpdateInput,
  ExpenseStats,
} from '../types/index.js';
import { createError } from '../middleware/error.js';

const GST_RATE = 0.15; // NZ GST rate

/**
 * Create a new expense
 */
export async function createExpense(userId: string, input: ExpenseCreateInput): Promise<Expense> {
  const {
    date,
    amount,
    category,
    description,
    vendor,
    isGstClaimable = false,
    notes,
  } = input;

  // Calculate GST amount if claimable
  const gstAmount = isGstClaimable ? Math.round(amount * GST_RATE / (1 + GST_RATE)) : 0;

  const result = await db.query<{
    id: string;
    user_id: string;
    date: string;
    amount: number;
    category: string;
    description: string | null;
    vendor: string | null;
    is_gst_claimable: boolean;
    gst_amount: number;
    receipt_photo_id: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `INSERT INTO expenses (user_id, date, amount, category, description, vendor, is_gst_claimable, gst_amount, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      userId,
      date || new Date().toISOString().split('T')[0],
      amount,
      category,
      description || null,
      vendor || null,
      isGstClaimable,
      gstAmount,
      notes || null,
    ]
  );

  return mapRowToExpense(result.rows[0]);
}

/**
 * Get an expense by ID
 */
export async function getExpense(userId: string, expenseId: string): Promise<Expense> {
  const result = await db.query(
    'SELECT * FROM expenses WHERE id = $1 AND user_id = $2',
    [expenseId, userId]
  );

  if (result.rows.length === 0) {
    throw createError('Expense not found', 404, 'EXPENSE_NOT_FOUND');
  }

  return mapRowToExpense(result.rows[0] as Record<string, unknown>);
}

/**
 * List expenses with optional filtering
 */
export async function listExpenses(
  userId: string,
  params: {
    category?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ expenses: Expense[]; total: number }> {
  const { category, startDate, endDate, limit = 50, offset = 0 } = params;

  let whereClause = 'WHERE user_id = $1';
  const queryParams: (string | number)[] = [userId];
  let paramIndex = 2;

  if (category) {
    whereClause += ` AND category = $${paramIndex}`;
    queryParams.push(category);
    paramIndex++;
  }

  if (startDate) {
    whereClause += ` AND date >= $${paramIndex}`;
    queryParams.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND date <= $${paramIndex}`;
    queryParams.push(endDate);
    paramIndex++;
  }

  // Get total count
  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM expenses ${whereClause}`,
    queryParams
  );

  // Get paginated results
  const result = await db.query(
    `SELECT * FROM expenses ${whereClause} ORDER BY date DESC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...queryParams, limit, offset]
  );

  return {
    expenses: (result.rows as Record<string, unknown>[]).map(mapRowToExpense),
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * Update an expense
 */
export async function updateExpense(
  userId: string,
  expenseId: string,
  input: ExpenseUpdateInput
): Promise<Expense> {
  // Verify ownership
  const existing = await getExpense(userId, expenseId);

  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];
  let paramIndex = 1;

  if (input.date !== undefined) {
    updates.push(`date = $${paramIndex}`);
    values.push(input.date);
    paramIndex++;
  }

  if (input.amount !== undefined) {
    updates.push(`amount = $${paramIndex}`);
    values.push(input.amount);
    paramIndex++;
  }

  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex}`);
    values.push(input.category);
    paramIndex++;
  }

  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    values.push(input.description || null);
    paramIndex++;
  }

  if (input.vendor !== undefined) {
    updates.push(`vendor = $${paramIndex}`);
    values.push(input.vendor || null);
    paramIndex++;
  }

  if (input.isGstClaimable !== undefined) {
    updates.push(`is_gst_claimable = $${paramIndex}`);
    values.push(input.isGstClaimable);
    paramIndex++;
  }

  if (input.notes !== undefined) {
    updates.push(`notes = $${paramIndex}`);
    values.push(input.notes || null);
    paramIndex++;
  }

  // Recalculate GST if amount or GST claimable status changed
  const finalAmount = input.amount ?? existing.amount;
  const finalGstClaimable = input.isGstClaimable ?? existing.isGstClaimable;
  const gstAmount = finalGstClaimable ? Math.round(finalAmount * GST_RATE / (1 + GST_RATE)) : 0;
  updates.push(`gst_amount = $${paramIndex}`);
  values.push(gstAmount);
  paramIndex++;

  if (updates.length === 0) {
    return existing;
  }

  values.push(expenseId);
  values.push(userId);

  const result = await db.query(
    `UPDATE expenses SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
    values
  );

  return mapRowToExpense(result.rows[0] as Record<string, unknown>);
}

/**
 * Delete an expense
 */
export async function deleteExpense(userId: string, expenseId: string): Promise<void> {
  const result = await db.query(
    'DELETE FROM expenses WHERE id = $1 AND user_id = $2',
    [expenseId, userId]
  );

  if (result.rowCount === 0) {
    throw createError('Expense not found', 404, 'EXPENSE_NOT_FOUND');
  }
}

/**
 * Get expense statistics for a user
 */
export async function getExpenseStats(userId: string): Promise<ExpenseStats> {
  const result = await db.query<{
    total: string;
    this_month: string;
    this_month_amount: string;
    gst_claimable: string;
  }>(
    `SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE)) as this_month,
      COALESCE(SUM(amount) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE)), 0) as this_month_amount,
      COALESCE(SUM(gst_amount) FILTER (WHERE is_gst_claimable = true AND date >= date_trunc('month', CURRENT_DATE)), 0) as gst_claimable
     FROM expenses WHERE user_id = $1`,
    [userId]
  );

  // Get breakdown by category for current month
  const categoryResult = await db.query<{ category: string; total_amount: string }>(
    `SELECT category, COALESCE(SUM(amount), 0) as total_amount
     FROM expenses
     WHERE user_id = $1 AND date >= date_trunc('month', CURRENT_DATE)
     GROUP BY category`,
    [userId]
  );

  const byCategory: Record<string, number> = {
    materials: 0,
    fuel: 0,
    tools: 0,
    subcontractor: 0,
    vehicle: 0,
    office: 0,
    other: 0,
  };

  for (const row of categoryResult.rows) {
    byCategory[row.category] = parseInt(row.total_amount, 10);
  }

  const row = result.rows[0];
  return {
    total: parseInt(row.total, 10),
    thisMonth: parseInt(row.this_month, 10),
    thisMonthAmount: parseInt(row.this_month_amount, 10),
    gstClaimable: parseInt(row.gst_claimable, 10),
    byCategory: byCategory as Record<ExpenseCategory, number>,
  };
}

/**
 * Get monthly totals for the last N months
 */
export async function getMonthlyTotals(
  userId: string,
  months: number = 6
): Promise<{ month: string; total: number; count: number }[]> {
  const result = await db.query<{ month: string; total: string; count: string }>(
    `SELECT
      to_char(date, 'YYYY-MM') as month,
      COALESCE(SUM(amount), 0) as total,
      COUNT(*) as count
     FROM expenses
     WHERE user_id = $1 AND date >= (CURRENT_DATE - ($2 || ' months')::interval)
     GROUP BY to_char(date, 'YYYY-MM')
     ORDER BY month DESC`,
    [userId, months]
  );

  return result.rows.map((row) => ({
    month: row.month,
    total: parseInt(row.total, 10),
    count: parseInt(row.count, 10),
  }));
}

/**
 * Map database row to Expense interface
 */
function mapRowToExpense(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    date: (row.date as Date | string).toString().split('T')[0],
    amount: row.amount as number,
    category: row.category as ExpenseCategory,
    description: row.description as string | null,
    vendor: row.vendor as string | null,
    isGstClaimable: row.is_gst_claimable as boolean,
    gstAmount: row.gst_amount as number,
    receiptPhotoId: row.receipt_photo_id as string | null,
    notes: row.notes as string | null,
    createdAt: (row.created_at as Date).toISOString?.() || (row.created_at as string),
    updatedAt: (row.updated_at as Date).toISOString?.() || (row.updated_at as string),
  };
}

export default {
  createExpense,
  getExpense,
  listExpenses,
  updateExpense,
  deleteExpense,
  getExpenseStats,
  getMonthlyTotals,
};
