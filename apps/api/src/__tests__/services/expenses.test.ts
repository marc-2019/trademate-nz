/**
 * Expenses Service Tests
 *
 * Covers financial correctness for NZ tradie expense tracking:
 *   - createExpense: GST calculation (15% NZ rate), optional fields, default date
 *   - getExpense: found and not-found (404)
 *   - listExpenses: no filters, category filter, date range, pagination
 *   - updateExpense: field updates, GST recalculation on amount/flag change
 *   - deleteExpense: success and not-found (404)
 *   - getExpenseStats: aggregate counts, monthly amounts, GST claimable, by-category breakdown
 *   - getMonthlyTotals: month grouping, default 6-month window
 */

// ---------------------------------------------------------------------------
// Mocks — must appear before any imports that trigger module evaluation
// ---------------------------------------------------------------------------

const mockDbQuery = jest.fn();
jest.mock('../../services/database.js', () => ({
  __esModule: true,
  default: {
    query: (...args: unknown[]) => mockDbQuery(...args),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  createExpense,
  getExpense,
  listExpenses,
  updateExpense,
  deleteExpense,
  getExpenseStats,
  getMonthlyTotals,
} from '../../services/expenses.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GST_RATE = 0.15;

function gstOf(amount: number): number {
  return Math.round(amount * GST_RATE / (1 + GST_RATE));
}

function makeExpenseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'exp-uuid-1',
    user_id: 'user-1',
    date: '2026-01-15',
    amount: 11500,
    category: 'materials',
    description: 'Timber planks',
    vendor: 'Bunnings',
    is_gst_claimable: true,
    gst_amount: gstOf(11500),
    receipt_photo_id: null,
    notes: null,
    created_at: new Date('2026-01-15'),
    updated_at: new Date('2026-01-15'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// createExpense
// ===========================================================================

describe('createExpense', () => {
  it('calculates GST when isGstClaimable is true', async () => {
    const row = makeExpenseRow({ amount: 11500, is_gst_claimable: true, gst_amount: gstOf(11500) });
    mockDbQuery.mockResolvedValue({ rows: [row] });

    const result = await createExpense('user-1', {
      date: '2026-01-15',
      amount: 11500,
      category: 'materials',
      isGstClaimable: true,
    });

    expect(result.gstAmount).toBe(gstOf(11500));
    expect(result.isGstClaimable).toBe(true);

    // Verify GST amount was passed in INSERT query
    const [, params] = mockDbQuery.mock.calls[0] as [string, unknown[]];
    expect(params).toContain(gstOf(11500));
  });

  it('sets gstAmount to 0 when isGstClaimable is false', async () => {
    const row = makeExpenseRow({ is_gst_claimable: false, gst_amount: 0 });
    mockDbQuery.mockResolvedValue({ rows: [row] });

    const result = await createExpense('user-1', {
      date: '2026-01-15',
      amount: 11500,
      category: 'fuel',
      isGstClaimable: false,
    });

    expect(result.gstAmount).toBe(0);
    expect(result.isGstClaimable).toBe(false);
  });

  it('defaults isGstClaimable to false when omitted', async () => {
    const row = makeExpenseRow({ is_gst_claimable: false, gst_amount: 0 });
    mockDbQuery.mockResolvedValue({ rows: [row] });

    await createExpense('user-1', {
      date: '2026-01-15',
      amount: 5000,
      category: 'tools',
    });

    // gstAmount param should be 0 (no GST)
    const [, params] = mockDbQuery.mock.calls[0] as [string, unknown[]];
    expect(params).toContain(0);
  });

  it('maps optional fields to null when omitted', async () => {
    const row = makeExpenseRow({ description: null, vendor: null, notes: null });
    mockDbQuery.mockResolvedValue({ rows: [row] });

    const result = await createExpense('user-1', {
      date: '2026-01-15',
      amount: 3000,
      category: 'other',
    });

    expect(result.description).toBeNull();
    expect(result.vendor).toBeNull();
    expect(result.notes).toBeNull();
  });

  it('returns mapped Expense with camelCase fields', async () => {
    const row = makeExpenseRow();
    mockDbQuery.mockResolvedValue({ rows: [row] });

    const result = await createExpense('user-1', {
      date: '2026-01-15',
      amount: 11500,
      category: 'materials',
      description: 'Timber planks',
      vendor: 'Bunnings',
      isGstClaimable: true,
    });

    expect(result.id).toBe('exp-uuid-1');
    expect(result.userId).toBe('user-1');
    expect(result.category).toBe('materials');
    expect(result.description).toBe('Timber planks');
    expect(result.vendor).toBe('Bunnings');
  });
});

// ===========================================================================
// getExpense
// ===========================================================================

describe('getExpense', () => {
  it('returns the expense when found', async () => {
    const row = makeExpenseRow();
    mockDbQuery.mockResolvedValue({ rows: [row] });

    const result = await getExpense('user-1', 'exp-uuid-1');

    expect(result.id).toBe('exp-uuid-1');
    expect(result.userId).toBe('user-1');
  });

  it('throws 404 when expense does not exist', async () => {
    mockDbQuery.mockResolvedValue({ rows: [] });

    await expect(getExpense('user-1', 'nonexistent')).rejects.toMatchObject({
      statusCode: 404,
      code: 'EXPENSE_NOT_FOUND',
    });
  });
});

// ===========================================================================
// listExpenses
// ===========================================================================

describe('listExpenses', () => {
  it('returns all expenses with default pagination when no filters', async () => {
    const row = makeExpenseRow();
    mockDbQuery
      .mockResolvedValueOnce({ rows: [{ count: '3' }] })  // count query
      .mockResolvedValueOnce({ rows: [row, row, row] });   // data query

    const result = await listExpenses('user-1');

    expect(result.total).toBe(3);
    expect(result.expenses).toHaveLength(3);
  });

  it('passes category filter to query', async () => {
    mockDbQuery
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [makeExpenseRow({ category: 'fuel' })] });

    const result = await listExpenses('user-1', { category: 'fuel' });

    expect(result.expenses[0].category).toBe('fuel');
    // Verify category was in the query params
    const [countQuery, countParams] = mockDbQuery.mock.calls[0] as [string, unknown[]];
    expect(countQuery).toContain('category');
    expect(countParams).toContain('fuel');
  });

  it('passes startDate and endDate filters to query', async () => {
    mockDbQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    await listExpenses('user-1', { startDate: '2026-01-01', endDate: '2026-01-31' });

    const [countQuery, countParams] = mockDbQuery.mock.calls[0] as [string, unknown[]];
    expect(countQuery).toContain('date >=');
    expect(countQuery).toContain('date <=');
    expect(countParams).toContain('2026-01-01');
    expect(countParams).toContain('2026-01-31');
  });

  it('uses provided limit and offset for pagination', async () => {
    mockDbQuery
      .mockResolvedValueOnce({ rows: [{ count: '100' }] })
      .mockResolvedValueOnce({ rows: [] });

    await listExpenses('user-1', { limit: 10, offset: 20 });

    const [, dataParams] = mockDbQuery.mock.calls[1] as [string, unknown[]];
    expect(dataParams).toContain(10);
    expect(dataParams).toContain(20);
  });

  it('returns empty list when no expenses found', async () => {
    mockDbQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await listExpenses('user-1');

    expect(result.total).toBe(0);
    expect(result.expenses).toHaveLength(0);
  });
});

// ===========================================================================
// updateExpense
// ===========================================================================

describe('updateExpense', () => {
  it('recalculates GST when amount changes', async () => {
    const existing = makeExpenseRow({ amount: 11500, is_gst_claimable: true, gst_amount: gstOf(11500) });
    const updated = { ...existing, amount: 23000, gst_amount: gstOf(23000) };

    mockDbQuery
      .mockResolvedValueOnce({ rows: [existing] })  // getExpense call inside updateExpense
      .mockResolvedValueOnce({ rows: [updated] });   // UPDATE result

    const result = await updateExpense('user-1', 'exp-uuid-1', { amount: 23000 });

    expect(result.amount).toBe(23000);
    expect(result.gstAmount).toBe(gstOf(23000));
  });

  it('recalculates GST when isGstClaimable changes from false to true', async () => {
    const existing = makeExpenseRow({ amount: 11500, is_gst_claimable: false, gst_amount: 0 });
    const updated = { ...existing, is_gst_claimable: true, gst_amount: gstOf(11500) };

    mockDbQuery
      .mockResolvedValueOnce({ rows: [existing] })
      .mockResolvedValueOnce({ rows: [updated] });

    const result = await updateExpense('user-1', 'exp-uuid-1', { isGstClaimable: true });

    expect(result.gstAmount).toBe(gstOf(11500));
    expect(result.isGstClaimable).toBe(true);
  });

  it('sets gstAmount to 0 when isGstClaimable changes from true to false', async () => {
    const existing = makeExpenseRow({ amount: 11500, is_gst_claimable: true, gst_amount: gstOf(11500) });
    const updated = { ...existing, is_gst_claimable: false, gst_amount: 0 };

    mockDbQuery
      .mockResolvedValueOnce({ rows: [existing] })
      .mockResolvedValueOnce({ rows: [updated] });

    const result = await updateExpense('user-1', 'exp-uuid-1', { isGstClaimable: false });

    expect(result.gstAmount).toBe(0);
    expect(result.isGstClaimable).toBe(false);
  });

  it('updates description and vendor fields', async () => {
    const existing = makeExpenseRow();
    const updated = { ...existing, description: 'Updated desc', vendor: 'Mitre 10' };

    mockDbQuery
      .mockResolvedValueOnce({ rows: [existing] })
      .mockResolvedValueOnce({ rows: [updated] });

    const result = await updateExpense('user-1', 'exp-uuid-1', {
      description: 'Updated desc',
      vendor: 'Mitre 10',
    });

    expect(result.description).toBe('Updated desc');
    expect(result.vendor).toBe('Mitre 10');
  });

  it('clears optional fields to null when set to empty string', async () => {
    const existing = makeExpenseRow({ description: 'Old desc', vendor: 'Old vendor' });
    const updated = { ...existing, description: null, vendor: null };

    mockDbQuery
      .mockResolvedValueOnce({ rows: [existing] })
      .mockResolvedValueOnce({ rows: [updated] });

    const result = await updateExpense('user-1', 'exp-uuid-1', {
      description: '',
      vendor: '',
    });

    expect(result.description).toBeNull();
    expect(result.vendor).toBeNull();
  });

  it('always recalculates gst_amount even when no other fields change', async () => {
    // The service always appends gst_amount to the UPDATE, so an empty input
    // still issues one SELECT (getExpense) + one UPDATE (gst_amount only).
    const existing = makeExpenseRow({ amount: 11500, is_gst_claimable: true, gst_amount: gstOf(11500) });
    mockDbQuery
      .mockResolvedValueOnce({ rows: [existing] })   // getExpense
      .mockResolvedValueOnce({ rows: [existing] });  // UPDATE gst_amount

    const result = await updateExpense('user-1', 'exp-uuid-1', {});

    expect(mockDbQuery).toHaveBeenCalledTimes(2);
    expect(result.id).toBe('exp-uuid-1');
    expect(result.gstAmount).toBe(gstOf(11500));
  });
});

// ===========================================================================
// deleteExpense
// ===========================================================================

describe('deleteExpense', () => {
  it('deletes the expense successfully', async () => {
    mockDbQuery.mockResolvedValue({ rowCount: 1 });

    await expect(deleteExpense('user-1', 'exp-uuid-1')).resolves.toBeUndefined();
  });

  it('throws 404 when expense not found', async () => {
    mockDbQuery.mockResolvedValue({ rowCount: 0 });

    await expect(deleteExpense('user-1', 'nonexistent')).rejects.toMatchObject({
      statusCode: 404,
      code: 'EXPENSE_NOT_FOUND',
    });
  });
});

// ===========================================================================
// getExpenseStats
// ===========================================================================

describe('getExpenseStats', () => {
  it('returns aggregate counts and GST claimable amount', async () => {
    mockDbQuery
      .mockResolvedValueOnce({
        rows: [{
          total: '42',
          this_month: '8',
          this_month_amount: '95000',
          gst_claimable: '12391',
        }],
      })
      .mockResolvedValueOnce({
        rows: [
          { category: 'materials', total_amount: '50000' },
          { category: 'fuel', total_amount: '15000' },
        ],
      });

    const result = await getExpenseStats('user-1');

    expect(result.total).toBe(42);
    expect(result.thisMonth).toBe(8);
    expect(result.thisMonthAmount).toBe(95000);
    expect(result.gstClaimable).toBe(12391);
  });

  it('populates byCategory with zeroes for missing categories', async () => {
    mockDbQuery
      .mockResolvedValueOnce({
        rows: [{ total: '0', this_month: '0', this_month_amount: '0', gst_claimable: '0' }],
      })
      .mockResolvedValueOnce({ rows: [] }); // no category rows

    const result = await getExpenseStats('user-1');

    expect(result.byCategory.materials).toBe(0);
    expect(result.byCategory.fuel).toBe(0);
    expect(result.byCategory.tools).toBe(0);
    expect(result.byCategory.subcontractor).toBe(0);
    expect(result.byCategory.vehicle).toBe(0);
    expect(result.byCategory.office).toBe(0);
    expect(result.byCategory.other).toBe(0);
  });

  it('maps category rows to byCategory totals', async () => {
    mockDbQuery
      .mockResolvedValueOnce({
        rows: [{ total: '3', this_month: '3', this_month_amount: '65000', gst_claimable: '8478' }],
      })
      .mockResolvedValueOnce({
        rows: [
          { category: 'materials', total_amount: '50000' },
          { category: 'tools', total_amount: '15000' },
        ],
      });

    const result = await getExpenseStats('user-1');

    expect(result.byCategory.materials).toBe(50000);
    expect(result.byCategory.tools).toBe(15000);
    expect(result.byCategory.fuel).toBe(0); // not in result → zero
  });
});

// ===========================================================================
// getMonthlyTotals
// ===========================================================================

describe('getMonthlyTotals', () => {
  it('returns monthly totals with parsed numbers', async () => {
    mockDbQuery.mockResolvedValue({
      rows: [
        { month: '2026-01', total: '45000', count: '5' },
        { month: '2025-12', total: '32000', count: '3' },
      ],
    });

    const result = await getMonthlyTotals('user-1');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ month: '2026-01', total: 45000, count: 5 });
    expect(result[1]).toEqual({ month: '2025-12', total: 32000, count: 3 });
  });

  it('uses default 6-month window when months not specified', async () => {
    mockDbQuery.mockResolvedValue({ rows: [] });

    await getMonthlyTotals('user-1');

    const [, params] = mockDbQuery.mock.calls[0] as [string, unknown[]];
    expect(params).toContain(6);
  });

  it('passes custom months parameter to query', async () => {
    mockDbQuery.mockResolvedValue({ rows: [] });

    await getMonthlyTotals('user-1', 12);

    const [, params] = mockDbQuery.mock.calls[0] as [string, unknown[]];
    expect(params).toContain(12);
  });

  it('returns empty array when no expenses exist', async () => {
    mockDbQuery.mockResolvedValue({ rows: [] });

    const result = await getMonthlyTotals('user-1');

    expect(result).toHaveLength(0);
  });
});
