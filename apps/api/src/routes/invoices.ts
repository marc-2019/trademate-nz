/**
 * Invoice Routes
 * /api/v1/invoices/*
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import invoicesService from '../services/invoices.js';
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

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().int().min(0, 'Amount must be positive (in cents)'),
});

const createSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  swmsId: z.string().uuid().optional(),
  jobDescription: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  includeGst: z.boolean().optional().default(true),
  dueDate: z.string().optional(), // ISO date string
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  clientName: z.string().min(1).optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  swmsId: z.string().uuid().optional().nullable(),
  jobDescription: z.string().optional(),
  lineItems: z.array(lineItemSchema).optional(),
  includeGst: z.boolean().optional(),
  dueDate: z.string().optional().nullable(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  notes: z.string().optional(),
});

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/v1/invoices
 * Create a new invoice
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

    // Clean up empty clientEmail
    const input = {
      ...validation.data,
      clientEmail: validation.data.clientEmail || undefined,
    };

    const invoice = await invoicesService.createInvoice(req.user!.userId, input);

    res.status(201).json({
      success: true,
      data: { invoice },
      message: 'Invoice created successfully',
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /api/v1/invoices
 * List user's invoices
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status, limit, offset } = req.query;

    const result = await invoicesService.listInvoices(req.user!.userId, {
      status: status as 'draft' | 'sent' | 'paid' | 'overdue' | undefined,
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
 * GET /api/v1/invoices/:id
 * Get specific invoice
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await invoicesService.getInvoiceById(id, req.user!.userId);

    if (!invoice) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Invoice not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { invoice },
    });
  } catch (error) {
    throw error;
  }
});

/**
 * PUT /api/v1/invoices/:id
 * Update invoice (only draft invoices)
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
    const invoice = await invoicesService.updateInvoice(
      id,
      req.user!.userId,
      validation.data
    );

    if (!invoice) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Invoice not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { invoice },
      message: 'Invoice updated successfully',
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
 * DELETE /api/v1/invoices/:id
 * Delete invoice
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await invoicesService.deleteInvoice(id, req.user!.userId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Invoice not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /api/v1/invoices/:id/send
 * Mark invoice as sent
 */
router.post('/:id/send', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await invoicesService.markAsSent(id, req.user!.userId);

    if (!invoice) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Invoice not found or already sent',
      });
      return;
    }

    res.json({
      success: true,
      data: { invoice },
      message: 'Invoice marked as sent',
    });
  } catch (error) {
    throw error;
  }
});

/**
 * POST /api/v1/invoices/:id/paid
 * Mark invoice as paid
 */
router.post('/:id/paid', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await invoicesService.markAsPaid(id, req.user!.userId);

    if (!invoice) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Invoice not found or not in sent/overdue status',
      });
      return;
    }

    res.json({
      success: true,
      data: { invoice },
      message: 'Invoice marked as paid',
    });
  } catch (error) {
    throw error;
  }
});

export default router;
