/**
 * Certifications Routes
 * /api/v1/certifications/*
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import certificationsService from '../services/certifications.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const certificationTypes = [
  'electrical',
  'gas',
  'plumbing',
  'lpg',
  'first_aid',
  'site_safe',
  'other',
] as const;

const createSchema = z.object({
  type: z.enum(certificationTypes),
  name: z.string().min(1, 'Certification name is required'),
  certNumber: z.string().optional(),
  issuingBody: z.string().optional(),
  issueDate: z.string().optional(), // ISO date string
  expiryDate: z.string().optional(), // ISO date string
});

const updateSchema = z.object({
  type: z.enum(certificationTypes).optional(),
  name: z.string().min(1).optional(),
  certNumber: z.string().optional().nullable(),
  issuingBody: z.string().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
});

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/v1/certifications
 * Create a new certification
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = createSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
        details: validation.error.errors,
      });
      return;
    }

    const certification = await certificationsService.createCertification(
      req.user!.userId,
      validation.data
    );

    res.status(201).json({
      success: true,
      data: { certification },
      message: 'Certification created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/certifications
 * List user's certifications
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, offset } = req.query;

    const result = await certificationsService.listCertifications(
      req.user!.userId,
      {
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      }
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/certifications/expiring
 * Get certifications expiring soon
 */
router.get('/expiring', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

    const certifications = await certificationsService.getExpiringCertifications(
      req.user!.userId,
      days
    );

    res.json({
      success: true,
      data: { certifications },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/certifications/:id
 * Get specific certification
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const certification = await certificationsService.getCertificationById(
      id,
      req.user!.userId
    );

    if (!certification) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Certification not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { certification },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/certifications/:id
 * Update certification
 */
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
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

    const id = req.params.id as string;
    const certification = await certificationsService.updateCertification(
      id,
      req.user!.userId,
      validation.data
    );

    if (!certification) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Certification not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { certification },
      message: 'Certification updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/certifications/:id
 * Delete certification
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const deleted = await certificationsService.deleteCertification(
      id,
      req.user!.userId
    );

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Certification not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Certification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
