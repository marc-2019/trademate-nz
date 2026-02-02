/**
 * SWMS Service
 * Safe Work Method Statement generation and management
 */

import { v4 as uuidv4 } from 'uuid';
import db from './database.js';
import claudeService from './claude.js';
import {
  SWMSDocument,
  SWMSGenerateInput,
  SWMSGenerateResponse,
  SWMSTemplate,
  Hazard,
  Control,
  TradeType,
} from '../types/index.js';
import { createError } from '../middleware/error.js';

// Import templates
import electricianTemplate from '../templates/swms-electrician.json' assert { type: 'json' };
import plumberTemplate from '../templates/swms-plumber.json' assert { type: 'json' };
import builderTemplate from '../templates/swms-builder.json' assert { type: 'json' };

const templates: Record<TradeType, SWMSTemplate> = {
  electrician: electricianTemplate as unknown as SWMSTemplate,
  plumber: plumberTemplate as unknown as SWMSTemplate,
  builder: builderTemplate as unknown as SWMSTemplate,
  landscaper: builderTemplate as unknown as SWMSTemplate, // Use builder as fallback
  other: builderTemplate as unknown as SWMSTemplate,
};

/**
 * Get available templates
 */
export function getTemplates(): { tradeType: TradeType; name: string; version: string }[] {
  return [
    { tradeType: 'electrician', name: 'Electrician SWMS', version: '1.0' },
    { tradeType: 'plumber', name: 'Plumber SWMS', version: '1.0' },
    { tradeType: 'builder', name: 'Builder/Construction SWMS', version: '1.0' },
  ];
}

/**
 * Get template by trade type
 */
export function getTemplate(tradeType: TradeType): SWMSTemplate {
  const template = templates[tradeType];
  if (!template) {
    throw createError(`Template not found for trade type: ${tradeType}`, 404, 'TEMPLATE_NOT_FOUND');
  }
  return template;
}

/**
 * Generate a new SWMS document
 */
export async function generateSWMS(
  userId: string,
  input: SWMSGenerateInput
): Promise<SWMSGenerateResponse> {
  const template = getTemplate(input.tradeType);
  const swmsId = uuidv4();

  // Generate AI suggestions if enabled
  let suggestedHazards: Hazard[] = [];
  let suggestedControls: Control[] = [];

  if (input.useAI !== false) {
    try {
      // Get AI hazard suggestions
      const hazardStrings = await claudeService.generateHazardSuggestions(
        input.tradeType,
        input.jobDescription,
        input.siteAddress || ''
      );

      suggestedHazards = hazardStrings.map((description, index) => ({
        id: `hazard-${index}`,
        category: 'ai-suggested',
        description,
        aiGenerated: true,
      }));

      // Get AI control suggestions for hazards
      if (suggestedHazards.length > 0) {
        const controlMap = await claudeService.generateControlMeasures(
          hazardStrings,
          input.tradeType
        );

        suggestedControls = Object.entries(controlMap).map(([hazardDesc, control], index) => ({
          hazardId: suggestedHazards.find(h => h.description === hazardDesc)?.id || `hazard-${index}`,
          controlType: control.controlType,
          description: control.primaryControl,
          ppeRequired: control.ppeRequired,
          aiGenerated: true,
        }));
      }
    } catch (error) {
      console.error('AI suggestion error (non-fatal):', error);
      // Continue without AI suggestions
    }
  }

  // Create document in database
  const result = await db.query<SWMSDocument>(
    `INSERT INTO swms_documents (
      id, user_id, template_type, title, status,
      job_description, site_address, client_name, expected_duration,
      hazards, controls, ppe_required,
      is_synced, local_id
    )
    VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10, $11, true, $12)
    RETURNING *`,
    [
      swmsId,
      userId,
      input.tradeType,
      `SWMS - ${input.jobDescription.substring(0, 50)}`,
      input.jobDescription,
      input.siteAddress || null,
      input.clientName || null,
      input.expectedDuration || null,
      JSON.stringify(suggestedHazards),
      JSON.stringify(suggestedControls),
      JSON.stringify([]),
      uuidv4(), // local_id for offline sync
    ]
  );

  const document = result.rows[0];

  return {
    swmsId,
    document: {
      id: document.id,
      templateType: input.tradeType,
      title: document.title,
      status: 'draft',
      jobDescription: input.jobDescription,
      siteAddress: input.siteAddress || null,
      clientName: input.clientName || null,
      expectedDuration: input.expectedDuration || null,
    },
    suggestedHazards,
    suggestedControls,
    template,
  };
}

/**
 * Get SWMS by ID
 */
export async function getSWMSById(
  swmsId: string,
  userId: string
): Promise<SWMSDocument | null> {
  const result = await db.query<SWMSDocument>(
    `SELECT id, user_id as "userId", template_type as "templateType", title, status,
            job_description as "jobDescription", site_address as "siteAddress",
            client_name as "clientName", expected_duration as "expectedDuration",
            hazards, controls, ppe_required as "ppeRequired",
            emergency_plan as "emergencyPlan", isolation_procedure as "isolationProcedure",
            worker_signature as "workerSignature", worker_signed_at as "workerSignedAt",
            supervisor_signature as "supervisorSignature", supervisor_signed_at as "supervisorSignedAt",
            pdf_url as "pdfUrl", is_synced as "isSynced", local_id as "localId",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM swms_documents
     WHERE id = $1 AND user_id = $2`,
    [swmsId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const doc = result.rows[0];
  return {
    ...doc,
    hazards: typeof doc.hazards === 'string' ? JSON.parse(doc.hazards) : doc.hazards,
    controls: typeof doc.controls === 'string' ? JSON.parse(doc.controls) : doc.controls,
    ppeRequired: typeof doc.ppeRequired === 'string' ? JSON.parse(doc.ppeRequired) : doc.ppeRequired,
  };
}

/**
 * List SWMS documents for user
 */
export async function listSWMS(
  userId: string,
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<{ items: SWMSDocument[]; total: number }> {
  const { status, limit = 20, offset = 0 } = options;

  let whereClause = 'user_id = $1';
  const params: unknown[] = [userId];

  if (status) {
    whereClause += ' AND status = $2';
    params.push(status);
  }

  // Get total count
  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM swms_documents WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get items
  const result = await db.query<SWMSDocument>(
    `SELECT id, user_id as "userId", template_type as "templateType", title, status,
            job_description as "jobDescription", site_address as "siteAddress",
            client_name as "clientName", created_at as "createdAt", updated_at as "updatedAt"
     FROM swms_documents
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    items: result.rows,
    total,
  };
}

/**
 * Update SWMS document
 */
export async function updateSWMS(
  swmsId: string,
  userId: string,
  updates: Partial<SWMSDocument>
): Promise<SWMSDocument | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  const allowedFields = [
    'title', 'status', 'jobDescription', 'siteAddress', 'clientName',
    'expectedDuration', 'hazards', 'controls', 'ppeRequired',
    'emergencyPlan', 'isolationProcedure', 'workerSignature', 'workerSignedAt',
    'supervisorSignature', 'supervisorSignedAt',
  ];

  const fieldMap: Record<string, string> = {
    jobDescription: 'job_description',
    siteAddress: 'site_address',
    clientName: 'client_name',
    expectedDuration: 'expected_duration',
    ppeRequired: 'ppe_required',
    emergencyPlan: 'emergency_plan',
    isolationProcedure: 'isolation_procedure',
    workerSignature: 'worker_signature',
    workerSignedAt: 'worker_signed_at',
    supervisorSignature: 'supervisor_signature',
    supervisorSignedAt: 'supervisor_signed_at',
  };

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && value !== undefined) {
      const dbField = fieldMap[key] || key;
      const dbValue = ['hazards', 'controls', 'ppeRequired'].includes(key)
        ? JSON.stringify(value)
        : value;
      fields.push(`${dbField} = $${paramIndex++}`);
      values.push(dbValue);
    }
  }

  if (fields.length === 0) {
    return getSWMSById(swmsId, userId);
  }

  fields.push('updated_at = NOW()');
  values.push(swmsId, userId);

  const result = await db.query<SWMSDocument>(
    `UPDATE swms_documents SET ${fields.join(', ')}
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  return getSWMSById(swmsId, userId);
}

/**
 * Delete SWMS document
 */
export async function deleteSWMS(swmsId: string, userId: string): Promise<boolean> {
  const result = await db.query(
    'DELETE FROM swms_documents WHERE id = $1 AND user_id = $2',
    [swmsId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Sign SWMS document
 */
export async function signSWMS(
  swmsId: string,
  userId: string,
  signature: string,
  role: 'worker' | 'supervisor'
): Promise<SWMSDocument | null> {
  const signatureField = role === 'worker' ? 'worker_signature' : 'supervisor_signature';
  const signedAtField = role === 'worker' ? 'worker_signed_at' : 'supervisor_signed_at';

  // Update signature
  await db.query(
    `UPDATE swms_documents SET ${signatureField} = $1, ${signedAtField} = NOW(), updated_at = NOW()
     WHERE id = $2 AND user_id = $3`,
    [signature, swmsId, userId]
  );

  // Check if both signatures are present to update status
  const doc = await getSWMSById(swmsId, userId);
  if (doc?.workerSignature) {
    await db.query(
      `UPDATE swms_documents SET status = 'signed' WHERE id = $1`,
      [swmsId]
    );
  }

  return getSWMSById(swmsId, userId);
}

export default {
  getTemplates,
  getTemplate,
  generateSWMS,
  getSWMSById,
  listSWMS,
  updateSWMS,
  deleteSWMS,
  signSWMS,
};
