/**
 * Customers Routes
 * /api/v1/customers/*
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import customersService from '../services/customers.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  defaultPaymentTerms: z.number().int().min(1).max(365).optional(),
  defaultIncludeGst: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  defaultPaymentTerms: z.number().int().min(1).max(365).optional().nullable(),
  defaultIncludeGst: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/v1/customers
 * Create a new customer
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
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

    const customer = await customersService.createCustomer(
      req.user!.userId,
      validation.data
    );

    res.status(201).json({
      success: true,
      data: { customer },
      message: 'Customer created successfully',
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /api/v1/customers
 * List user's customers
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { search, limit, offset, includeInactive } = req.query;

    const result = await customersService.listCustomers(
      req.user!.userId,
      {
        search: search as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        includeInactive: includeInactive === 'true',
      }
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /api/v1/customers/:id
 * Get specific customer
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const customer = await customersService.getCustomerById(
      id,
      req.user!.userId
    );

    if (!customer) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Customer not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { customer },
    });
  } catch (error) {
    throw error;
  }
});

/**
 * PUT /api/v1/customers/:id
 * Update customer
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

    const id = req.params.id as string;
    const customer = await customersService.updateCustomer(
      id,
      req.user!.userId,
      validation.data
    );

    if (!customer) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Customer not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { customer },
      message: 'Customer updated successfully',
    });
  } catch (error) {
    throw error;
  }
});

/**
 * DELETE /api/v1/customers/:id
 * Soft-delete customer (set is_active = false)
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const deleted = await customersService.deleteCustomer(
      id,
      req.user!.userId
    );

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Customer not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Customer deactivated successfully',
    });
  } catch (error) {
    throw error;
  }
});

export default router;
