/**
 * Expenses Routes
 * /api/v1/expenses/*
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { attachSubscription, requireFeature } from '../middleware/subscription.js';
import expensesService from '../services/expenses.js';

const router = Router();

// Valid expense categories
const expenseCategories = ['materials', 'fuel', 'tools', 'subcontractor', 'vehicle', 'office', 'other'] as const;

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createExpenseSchema = z.object({
  date: z.string().optional(),
  amount: z.number().int().positive('Amount must be positive'),
  category: z.enum(expenseCategories),
  description: z.string().max(500).optional(),
  vendor: z.string().max(255).optional(),
  isGstClaimable: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

const updateExpenseSchema = z.object({
  date: z.string().optional(),
  amount: z.number().int().positive('Amount must be positive').optional(),
  category: z.enum(expenseCategories).optional(),
  description: z.string().max(500).optional(),
  vendor: z.string().max(255).optional(),
  isGstClaimable: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/v1/expenses
 * Create a new expense
 */
router.post('/', authenticate, attachSubscription, requireFeature('expenses'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = createExpenseSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors.map((e) => e.message).join(', '),
      });
      return;
    }

    const userId = req.user!.userId;
    const expense = await expensesService.createExpense(userId, validation.data);

    res.status(201).json({
      success: true,
      data: { expense },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/expenses
 * List expenses with optional filtering
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { category, startDate, endDate, limit, offset } = req.query;

    const result = await expensesService.listExpenses(userId, {
      category: category as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/expenses/stats
 * Get expense statistics
 */
router.get('/stats', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const stats = await expensesService.getExpenseStats(userId);

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/expenses/monthly
 * Get monthly totals
 */
router.get('/monthly', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const months = req.query.months ? parseInt(req.query.months as string, 10) : 6;
    const totals = await expensesService.getMonthlyTotals(userId, months);

    res.json({
      success: true,
      data: { totals },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/expenses/:id
 * Get a single expense
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const expense = await expensesService.getExpense(userId, req.params.id as string);

    res.json({
      success: true,
      data: { expense },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/expenses/:id
 * Update an expense
 */
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = updateExpenseSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors.map((e) => e.message).join(', '),
      });
      return;
    }

    const userId = req.user!.userId;
    const expense = await expensesService.updateExpense(
      userId,
      req.params.id as string,
      validation.data
    );

    res.json({
      success: true,
      data: { expense },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/expenses/:id
 * Delete an expense
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    await expensesService.deleteExpense(userId, req.params.id as string);

    res.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
