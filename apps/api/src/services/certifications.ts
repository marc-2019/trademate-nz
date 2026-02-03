/**
 * Certifications Service
 * Trade license and certification management with expiry tracking
 */

import { v4 as uuidv4 } from 'uuid';
import db from './database.js';
import {
  Certification,
  CertificationType,
  CertificationCreateInput,
  CertificationUpdateInput,
} from '../types/index.js';

/**
 * Transform DB row to Certification type with proper casing
 */
function transformCertification(row: Record<string, unknown>): Certification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as CertificationType,
    name: row.name as string,
    certNumber: row.cert_number as string | null,
    issuingBody: row.issuing_body as string | null,
    issueDate: row.issue_date as Date | null,
    expiryDate: row.expiry_date as Date | null,
    documentUrl: row.document_url as string | null,
    reminderSent: row.reminder_sent as boolean,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

/**
 * Transform to mobile-friendly snake_case format
 */
function transformForMobile(cert: Certification): Record<string, unknown> {
  return {
    id: cert.id,
    user_id: cert.userId,
    type: cert.type,
    name: cert.name,
    cert_number: cert.certNumber,
    issuing_body: cert.issuingBody,
    issue_date: cert.issueDate,
    expiry_date: cert.expiryDate,
    document_url: cert.documentUrl,
    reminder_sent: cert.reminderSent,
    created_at: cert.createdAt,
    updated_at: cert.updatedAt,
  };
}

/**
 * Create a new certification
 */
export async function createCertification(
  userId: string,
  input: CertificationCreateInput
): Promise<Record<string, unknown>> {
  const certId = uuidv4();

  const result = await db.query<Record<string, unknown>>(
    `INSERT INTO certifications (
      id, user_id, type, name, cert_number,
      issuing_body, issue_date, expiry_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      certId,
      userId,
      input.type,
      input.name,
      input.certNumber || null,
      input.issuingBody || null,
      input.issueDate || null,
      input.expiryDate || null,
    ]
  );

  return transformForMobile(transformCertification(result.rows[0]));
}

/**
 * Get certification by ID
 */
export async function getCertificationById(
  certId: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  const result = await db.query<Record<string, unknown>>(
    `SELECT * FROM certifications WHERE id = $1 AND user_id = $2`,
    [certId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return transformForMobile(transformCertification(result.rows[0]));
}

/**
 * List certifications for user
 */
export async function listCertifications(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ certifications: Record<string, unknown>[]; total: number }> {
  const { limit = 50, offset = 0 } = options;

  // Get total count
  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM certifications WHERE user_id = $1`,
    [userId]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get items ordered by expiry date (earliest first)
  const result = await db.query<Record<string, unknown>>(
    `SELECT * FROM certifications
     WHERE user_id = $1
     ORDER BY
       CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END,
       expiry_date ASC,
       created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const certifications = result.rows.map((row) =>
    transformForMobile(transformCertification(row))
  );

  return { certifications, total };
}

/**
 * Update certification
 */
export async function updateCertification(
  certId: string,
  userId: string,
  updates: CertificationUpdateInput
): Promise<Record<string, unknown> | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, string> = {
    type: 'type',
    name: 'name',
    certNumber: 'cert_number',
    issuingBody: 'issuing_body',
    issueDate: 'issue_date',
    expiryDate: 'expiry_date',
  };

  for (const [key, value] of Object.entries(updates)) {
    if (fieldMap[key] && value !== undefined) {
      fields.push(`${fieldMap[key]} = $${paramIndex++}`);
      values.push(value || null);
    }
  }

  if (fields.length === 0) {
    return getCertificationById(certId, userId);
  }

  fields.push('updated_at = NOW()');
  values.push(certId, userId);

  const result = await db.query<Record<string, unknown>>(
    `UPDATE certifications SET ${fields.join(', ')}
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  return transformForMobile(transformCertification(result.rows[0]));
}

/**
 * Delete certification
 */
export async function deleteCertification(
  certId: string,
  userId: string
): Promise<boolean> {
  const result = await db.query(
    'DELETE FROM certifications WHERE id = $1 AND user_id = $2',
    [certId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Get certifications expiring within N days
 */
export async function getExpiringCertifications(
  userId: string,
  days: number = 30
): Promise<Record<string, unknown>[]> {
  const result = await db.query<Record<string, unknown>>(
    `SELECT * FROM certifications
     WHERE user_id = $1
       AND expiry_date IS NOT NULL
       AND expiry_date <= CURRENT_DATE + INTERVAL '${days} days'
       AND expiry_date >= CURRENT_DATE
     ORDER BY expiry_date ASC`,
    [userId]
  );

  return result.rows.map((row) =>
    transformForMobile(transformCertification(row))
  );
}

/**
 * Get certification statistics for a user
 */
export async function getCertificationStats(userId: string): Promise<{
  total: number;
  expiringSoon: number;
  expired: number;
}> {
  const result = await db.query<{
    total: string;
    expiring_soon: string;
    expired: string;
  }>(
    `SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (
        WHERE expiry_date IS NOT NULL
          AND expiry_date > CURRENT_DATE
          AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
      ) as expiring_soon,
      COUNT(*) FILTER (
        WHERE expiry_date IS NOT NULL
          AND expiry_date < CURRENT_DATE
      ) as expired
     FROM certifications WHERE user_id = $1`,
    [userId]
  );

  const row = result.rows[0];
  return {
    total: parseInt(row.total, 10),
    expiringSoon: parseInt(row.expiring_soon, 10),
    expired: parseInt(row.expired, 10),
  };
}

export default {
  createCertification,
  getCertificationById,
  listCertifications,
  updateCertification,
  deleteCertification,
  getExpiringCertifications,
  getCertificationStats,
};
