/**
 * Customers Service
 * Customer management with contact details and billing preferences
 */

import { v4 as uuidv4 } from 'uuid';
import db from './database.js';
import {
  Customer,
  CustomerCreateInput,
  CustomerUpdateInput,
} from '../types/index.js';

/**
 * Transform DB row to Customer type with proper casing
 */
function transformCustomer(row: Record<string, unknown>): Customer {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    email: row.email as string | null,
    phone: row.phone as string | null,
    address: row.address as string | null,
    notes: row.notes as string | null,
    defaultPaymentTerms: row.default_payment_terms as number | null,
    defaultIncludeGst: row.default_include_gst as boolean,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

/**
 * Transform to mobile-friendly snake_case format
 */
function transformForMobile(customer: Customer): Record<string, unknown> {
  return {
    id: customer.id,
    user_id: customer.userId,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    notes: customer.notes,
    default_payment_terms: customer.defaultPaymentTerms,
    default_include_gst: customer.defaultIncludeGst,
    is_active: customer.isActive,
    created_at: customer.createdAt,
    updated_at: customer.updatedAt,
  };
}

/**
 * Create a new customer
 */
export async function createCustomer(
  userId: string,
  input: CustomerCreateInput
): Promise<Record<string, unknown>> {
  const customerId = uuidv4();

  const result = await db.query<Record<string, unknown>>(
    `INSERT INTO customers (
      id, user_id, name, email, phone,
      address, notes, default_payment_terms, default_include_gst
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      customerId,
      userId,
      input.name,
      input.email || null,
      input.phone || null,
      input.address || null,
      input.notes || null,
      input.defaultPaymentTerms || null,
      input.defaultIncludeGst ?? true,
    ]
  );

  return transformForMobile(transformCustomer(result.rows[0]));
}

/**
 * Get customer by ID
 */
export async function getCustomerById(
  customerId: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  const result = await db.query<Record<string, unknown>>(
    `SELECT * FROM customers WHERE id = $1 AND user_id = $2`,
    [customerId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return transformForMobile(transformCustomer(result.rows[0]));
}

/**
 * List customers for user
 */
export async function listCustomers(
  userId: string,
  options: { search?: string; limit?: number; offset?: number; includeInactive?: boolean } = {}
): Promise<{ customers: Record<string, unknown>[]; total: number }> {
  const { search, limit = 50, offset = 0, includeInactive = false } = options;

  const conditions: string[] = ['user_id = $1'];
  const params: unknown[] = [userId];
  let paramIndex = 2;

  if (!includeInactive) {
    conditions.push('is_active = true');
  }

  if (search) {
    conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM customers WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get items ordered by name
  const result = await db.query<Record<string, unknown>>(
    `SELECT * FROM customers
     WHERE ${whereClause}
     ORDER BY name ASC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  const customers = result.rows.map((row) =>
    transformForMobile(transformCustomer(row))
  );

  return { customers, total };
}

/**
 * Update customer
 */
export async function updateCustomer(
  customerId: string,
  userId: string,
  updates: CustomerUpdateInput
): Promise<Record<string, unknown> | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    address: 'address',
    notes: 'notes',
    defaultPaymentTerms: 'default_payment_terms',
    defaultIncludeGst: 'default_include_gst',
    isActive: 'is_active',
  };

  for (const [key, value] of Object.entries(updates)) {
    if (fieldMap[key] && value !== undefined) {
      fields.push(`${fieldMap[key]} = $${paramIndex++}`);
      values.push(value ?? null);
    }
  }

  if (fields.length === 0) {
    return getCustomerById(customerId, userId);
  }

  fields.push('updated_at = NOW()');
  values.push(customerId, userId);

  const result = await db.query<Record<string, unknown>>(
    `UPDATE customers SET ${fields.join(', ')}
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  return transformForMobile(transformCustomer(result.rows[0]));
}

/**
 * Soft-delete customer (set is_active = false)
 */
export async function deleteCustomer(
  customerId: string,
  userId: string
): Promise<boolean> {
  const result = await db.query(
    `UPDATE customers SET is_active = false, updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND is_active = true`,
    [customerId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export default {
  createCustomer,
  getCustomerById,
  listCustomers,
  updateCustomer,
  deleteCustomer,
};
