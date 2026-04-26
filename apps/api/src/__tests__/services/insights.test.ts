/**
 * Insights Service Tests
 *
 * Covers all exported functions:
 *   getRevenueComparison
 *     - positive growth: last month > 0, this month higher
 *     - negative growth: this month lower than last
 *     - zero last month with revenue this month → 100% change
 *     - both zero → 0% change
 *     - rounding to 1 decimal place
 *   getInvoiceAging
 *     - returns all four aging buckets as integers
 *     - all zero (no outstanding invoices)
 *   getTopCustomers
 *     - returns up to 5 customers, sorted by revenue
 *     - handles empty results
 *     - handles null customer_id (inline customer name)
 *   getMonthlyRevenue
 *     - returns array of exactly 6 months
 *     - fills missing months with zero revenue
 *     - maps DB rows to correct shape
 *   getInsights
 *     - calls all four sub-functions concurrently via Promise.all
 *     - returns combined InsightsData shape
 */

// ---------------------------------------------------------------------------
// Mocks — before any imports that trigger module evaluation
// ---------------------------------------------------------------------------

const mockDbQuery = jest.fn();
jest.mock('../../services/database.js', () => ({
  __esModule: true,
  default: { query: (...args: unknown[]) => mockDbQuery(...args) },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import insightsService from '../../services/insights.js';

const {
  getRevenueComparison,
  getInvoiceAging,
  getTopCustomers,
  getMonthlyRevenue,
  getInsights,
} = insightsService;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_ID = 'user-test-001';

// ===========================================================================
// getRevenueComparison
// ===========================================================================

describe('getRevenueComparison', () => {
  afterEach(() => jest.clearAllMocks());

  it('calculates positive percent change', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ this_month: '120000', last_month: '100000' }],
    });

    const result = await getRevenueComparison(USER_ID);

    expect(result.thisMonth).toBe(120000);
    expect(result.lastMonth).toBe(100000);
    expect(result.percentChange).toBe(20);
  });

  it('calculates negative percent change', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ this_month: '80000', last_month: '100000' }],
    });

    const result = await getRevenueComparison(USER_ID);

    expect(result.percentChange).toBe(-20);
  });

  it('returns 100 when last month is zero but this month has revenue', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ this_month: '50000', last_month: '0' }],
    });

    const result = await getRevenueComparison(USER_ID);

    expect(result.percentChange).toBe(100);
  });

  it('returns 0 when both months are zero', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ this_month: '0', last_month: '0' }],
    });

    const result = await getRevenueComparison(USER_ID);

    expect(result.percentChange).toBe(0);
    expect(result.thisMonth).toBe(0);
    expect(result.lastMonth).toBe(0);
  });

  it('rounds percent change to one decimal place', async () => {
    // 110000 / 90000 - 1 = 22.222...% → rounds to 22.2
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ this_month: '110000', last_month: '90000' }],
    });

    const result = await getRevenueComparison(USER_ID);

    expect(result.percentChange).toBe(22.2);
  });

  it('queries with the correct userId', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ this_month: '0', last_month: '0' }],
    });

    await getRevenueComparison('specific-user-id');

    expect(mockDbQuery).toHaveBeenCalledWith(
      expect.any(String),
      ['specific-user-id']
    );
  });
});

// ===========================================================================
// getInvoiceAging
// ===========================================================================

describe('getInvoiceAging', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns all aging buckets parsed as integers', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{
        current_count: '5',
        thirty_count: '3',
        sixty_count: '1',
        ninety_count: '0',
        current_amount: '50000',
        thirty_amount: '25000',
        sixty_amount: '8000',
        ninety_amount: '0',
      }],
    });

    const result = await getInvoiceAging(USER_ID);

    expect(result.current).toBe(5);
    expect(result.thirtyDay).toBe(3);
    expect(result.sixtyDay).toBe(1);
    expect(result.ninetyPlus).toBe(0);
    expect(result.currentAmount).toBe(50000);
    expect(result.thirtyDayAmount).toBe(25000);
    expect(result.sixtyDayAmount).toBe(8000);
    expect(result.ninetyPlusAmount).toBe(0);
  });

  it('returns all zeros when no outstanding invoices', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{
        current_count: '0',
        thirty_count: '0',
        sixty_count: '0',
        ninety_count: '0',
        current_amount: '0',
        thirty_amount: '0',
        sixty_amount: '0',
        ninety_amount: '0',
      }],
    });

    const result = await getInvoiceAging(USER_ID);

    expect(result.current).toBe(0);
    expect(result.ninetyPlus).toBe(0);
    expect(result.ninetyPlusAmount).toBe(0);
  });

  it('queries with the correct userId', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{
        current_count: '0', thirty_count: '0', sixty_count: '0', ninety_count: '0',
        current_amount: '0', thirty_amount: '0', sixty_amount: '0', ninety_amount: '0',
      }],
    });

    await getInvoiceAging('aging-user-id');

    expect(mockDbQuery).toHaveBeenCalledWith(
      expect.any(String),
      ['aging-user-id']
    );
  });
});

// ===========================================================================
// getTopCustomers
// ===========================================================================

describe('getTopCustomers', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns customer list with correct shape', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        { customer_id: 'cust-1', customer_name: 'Acme Ltd', revenue: '60000', invoice_count: '3' },
        { customer_id: 'cust-2', customer_name: 'BuildCo', revenue: '40000', invoice_count: '2' },
      ],
    });

    const result = await getTopCustomers(USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0].customerId).toBe('cust-1');
    expect(result[0].customerName).toBe('Acme Ltd');
    expect(result[0].revenue).toBe(60000);
    expect(result[0].invoiceCount).toBe(3);
  });

  it('returns empty array when no paid invoices', async () => {
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getTopCustomers(USER_ID);

    expect(result).toEqual([]);
  });

  it('handles null customer_id (inline customer)', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        { customer_id: null, customer_name: 'Walk-in Client', revenue: '15000', invoice_count: '1' },
      ],
    });

    const result = await getTopCustomers(USER_ID);

    expect(result[0].customerId).toBe('');
    expect(result[0].customerName).toBe('Walk-in Client');
  });

  it('returns at most 5 customers (DB LIMIT enforced)', async () => {
    // Return exactly 5 rows — the SQL LIMIT 5 is in the query
    const rows = Array.from({ length: 5 }, (_, i) => ({
      customer_id: `cust-${i}`,
      customer_name: `Customer ${i}`,
      revenue: String(50000 - i * 5000),
      invoice_count: '2',
    }));
    mockDbQuery.mockResolvedValueOnce({ rows });

    const result = await getTopCustomers(USER_ID);

    expect(result).toHaveLength(5);
  });
});

// ===========================================================================
// getMonthlyRevenue
// ===========================================================================

describe('getMonthlyRevenue', () => {
  afterEach(() => jest.clearAllMocks());

  it('always returns an array of exactly 6 months', async () => {
    // Even with no DB data, should fill 6 months
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getMonthlyRevenue(USER_ID);

    expect(result).toHaveLength(6);
  });

  it('fills missing months with zero revenue and count', async () => {
    // Only return one month — the rest should be filled with zeros
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ month: key, revenue: '75000', count: '4' }],
    });

    const result = await getMonthlyRevenue(USER_ID);

    expect(result).toHaveLength(6);
    const filled = result.filter(m => m.revenue === 0);
    expect(filled).toHaveLength(5);
    const current = result.find(m => m.month === key);
    expect(current?.revenue).toBe(75000);
    expect(current?.count).toBe(4);
  });

  it('each month entry has required fields', async () => {
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getMonthlyRevenue(USER_ID);

    for (const m of result) {
      expect(m).toHaveProperty('month');
      expect(m).toHaveProperty('label');
      expect(m).toHaveProperty('revenue');
      expect(m).toHaveProperty('count');
      expect(typeof m.month).toBe('string');
      expect(typeof m.label).toBe('string');
      expect(typeof m.revenue).toBe('number');
      expect(typeof m.count).toBe('number');
    }
  });

  it('month keys are in YYYY-MM format', async () => {
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getMonthlyRevenue(USER_ID);

    for (const m of result) {
      expect(m.month).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  it('months are in ascending chronological order', async () => {
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getMonthlyRevenue(USER_ID);

    for (let i = 1; i < result.length; i++) {
      expect(result[i].month >= result[i - 1].month).toBe(true);
    }
  });
});

// ===========================================================================
// getInsights (integration: calls all sub-functions)
// ===========================================================================

describe('getInsights', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns combined InsightsData with all four sections', async () => {
    // getInsights calls Promise.all([getRevenueComparison, getInvoiceAging, getTopCustomers, getMonthlyRevenue])
    // Each sub-function makes its own db.query call
    // Revenue comparison
    mockDbQuery.mockResolvedValueOnce({ rows: [{ this_month: '100000', last_month: '80000' }] });
    // Invoice aging
    mockDbQuery.mockResolvedValueOnce({
      rows: [{
        current_count: '2', thirty_count: '1', sixty_count: '0', ninety_count: '0',
        current_amount: '20000', thirty_amount: '8000', sixty_amount: '0', ninety_amount: '0',
      }],
    });
    // Top customers
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ customer_id: 'c-1', customer_name: 'Test Co', revenue: '50000', invoice_count: '2' }],
    });
    // Monthly revenue
    mockDbQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getInsights(USER_ID);

    expect(result).toHaveProperty('revenue');
    expect(result).toHaveProperty('aging');
    expect(result).toHaveProperty('topCustomers');
    expect(result).toHaveProperty('monthlyRevenue');
    expect(result.revenue.thisMonth).toBe(100000);
    expect(result.aging.current).toBe(2);
    expect(result.topCustomers).toHaveLength(1);
    expect(result.monthlyRevenue).toHaveLength(6);
  });

  it('propagates DB errors', async () => {
    mockDbQuery.mockRejectedValue(new Error('DB timeout'));

    await expect(getInsights(USER_ID)).rejects.toThrow('DB timeout');
  });
});
