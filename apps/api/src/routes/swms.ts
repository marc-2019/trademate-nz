/**
 * SWMS Routes
 * /api/v1/swms/*
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import swmsService from '../services/swms.js';
import { authenticate } from '../middleware/auth.js';

// App error type for error handling
interface AppError extends Error {
  statusCode: number;
  code: string;
}

const router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const generateSchema = z.object({
  tradeType: z.enum(['electrician', 'plumber', 'builder', 'landscaper', 'other']),
  jobDescription: z.string().min(10, 'Job description must be at least 10 characters'),
  siteAddress: z.string().optional(),
  clientName: z.string().optional(),
  expectedDuration: z.string().optional(),
  useAI: z.boolean().optional().default(true),
});

const updateSchema = z.object({
  title: z.string().optional(),
  status: z.enum(['draft', 'signed', 'archived']).optional(),
  jobDescription: z.string().optional(),
  siteAddress: z.string().optional(),
  clientName: z.string().optional(),
  expectedDuration: z.string().optional(),
  hazards: z.array(z.any()).optional(),
  controls: z.array(z.any()).optional(),
  ppeRequired: z.array(z.string()).optional(),
  emergencyPlan: z.string().optional(),
  isolationProcedure: z.string().optional(),
});

const signSchema = z.object({
  signature: z.string().min(1, 'Signature is required'),
  role: z.enum(['worker', 'supervisor']),
});

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/v1/swms/templates
 * List available SWMS templates
 */
router.get('/templates', (_req: Request, res: Response) => {
  const templates = swmsService.getTemplates();
  res.json({
    success: true,
    data: { templates },
  });
});

/**
 * GET /api/v1/swms/templates/:tradeType
 * Get specific SWMS template
 */
router.get('/templates/:tradeType', (req: Request, res: Response) => {
  try {
    const { tradeType } = req.params;
    const template = swmsService.getTemplate(tradeType as any);
    res.json({
      success: true,
      data: { template },
    });
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      const appError = error as AppError;
      res.status(appError.statusCode).json({
        success: false,
        error: appError.code,
        message: appError.message,
      });
      return;
    }
    throw error;
  }
});

/**
 * POST /api/v1/swms/generate
 * Generate a new SWMS document
 */
router.post('/generate', authenticate, async (req: Request, res: Response) => {
  try {
    const validation = generateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
        details: validation.error.errors,
      });
      return;
    }

    const result = await swmsService.generateSWMS(req.user!.userId, validation.data);

    res.status(201).json({
      success: true,
      data: result,
      message: 'SWMS document generated successfully',
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /api/v1/swms
 * List user's SWMS documents
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status, limit, offset } = req.query;

    const result = await swmsService.listSWMS(req.user!.userId, {
      status: status as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /api/v1/swms/:id
 * Get specific SWMS document
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const document = await swmsService.getSWMSById(id as string, req.user!.userId);

    if (!document) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'SWMS document not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { document },
    });
  } catch (error) {
    throw error;
  }
});

/**
 * PUT /api/v1/swms/:id
 * Update SWMS document
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
      });
      return;
    }

    const { id } = req.params;
    const document = await swmsService.updateSWMS(
      id as string,
      req.user!.userId,
      validation.data
    );

    if (!document) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'SWMS document not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { document },
      message: 'SWMS document updated successfully',
    });
  } catch (error) {
    throw error;
  }
});

/**
 * DELETE /api/v1/swms/:id
 * Delete SWMS document
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await swmsService.deleteSWMS(id as string, req.user!.userId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'SWMS document not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'SWMS document deleted successfully',
    });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /api/v1/swms/:id/sign
 * Sign SWMS document
 */
router.post('/:id/sign', authenticate, async (req: Request, res: Response) => {
  try {
    const validation = signSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
      });
      return;
    }

    const { id } = req.params;
    const document = await swmsService.signSWMS(
      id as string,
      req.user!.userId,
      validation.data.signature,
      validation.data.role
    );

    if (!document) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'SWMS document not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { document },
      message: 'SWMS document signed successfully',
    });
  } catch (error) {
    throw error;
  }
});

export default router;
