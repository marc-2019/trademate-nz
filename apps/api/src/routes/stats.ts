/**
 * Stats Routes
 * /api/v1/stats/*
 */

import { Router, Request, Response } from 'express';
import db from '../services/database.js';
import invoicesService from '../services/invoices.js';
import certificationsService from '../services/certifications.js';
import { authenticate } from '../middleware/auth.js';
import { DashboardStats } from '../types/index.js';

const router = Router();

/**
 * GET /api/v1/stats/dashboard
 * Get dashboard statistics for the authenticated user
 */
router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Get SWMS stats
    const swmsResult = await db.query<{
      total: string;
      this_month: string;
      signed: string;
      draft: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as this_month,
        COUNT(*) FILTER (WHERE status = 'signed') as signed,
        COUNT(*) FILTER (WHERE status = 'draft') as draft
       FROM swms_documents WHERE user_id = $1`,
      [userId]
    );
    const swmsRow = swmsResult.rows[0];

    // Get invoice stats
    const invoiceStats = await invoicesService.getInvoiceStats(userId);

    // Get certification stats
    const certStats = await certificationsService.getCertificationStats(userId);

    const stats: DashboardStats = {
      swms: {
        total: parseInt(swmsRow.total, 10),
        thisMonth: parseInt(swmsRow.this_month, 10),
        signed: parseInt(swmsRow.signed, 10),
        draft: parseInt(swmsRow.draft, 10),
      },
      invoices: invoiceStats,
      certifications: certStats,
    };

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    throw error;
  }
});

export default router;
