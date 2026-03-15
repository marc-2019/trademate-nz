/**
 * Subscription Service Tests
 * Tests the pure business logic functions
 */

const mockDbQuery = jest.fn();
jest.mock('../../services/database.js', () => ({
  __esModule: true,
  default: { query: (...args: any[]) => mockDbQuery(...args) },
}));

jest.mock('../../middleware/error.js', () => ({
  createError: (message: string, statusCode: number, code: string) => {
    const error = new Error(message) as any;
    error.statusCode = statusCode;
    error.code = code;
    return error;
  },
}));

import {
  getTierLimits,
  getAllTiers,
  isBetaMode,
  getUserSubscription,
  getTierUsage,
  canCreateInvoice,
  canCreateSwms,
  canAddTeamMember,
  isFeatureAvailable,
} from '../../services/subscriptions.js';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Subscription Service', () => {
  describe('getTierLimits', () => {
    it('should return tradie-level limits in beta mode (overrides free tier)', () => {
      // Beta mode is hardcoded to true in the service
      const limits = getTierLimits('free');
      // In beta, free users get tradie-level access
      expect(limits.invoicesPerMonth).toBeNull(); // unlimited
      expect(limits.swmsPerMonth).toBeNull(); // unlimited
      expect(limits.pdfExport).toBe(true);
      expect(limits.quotes).toBe(true);
      expect(limits.tier).toBe('free'); // tier label preserved
    });

    it('should return limits for tradie tier', () => {
      const limits = getTierLimits('tradie');
      expect(limits.tier).toBe('tradie');
      expect(limits.pdfExport).toBe(true);
      expect(limits.emailInvoice).toBe(true);
    });

    it('should return limits for team tier', () => {
      const limits = getTierLimits('team');
      expect(limits.tier).toBe('team');
    });
  });

  describe('getAllTiers', () => {
    it('should return all three tiers', () => {
      const tiers = getAllTiers();
      expect(tiers).toHaveLength(3);
      expect(tiers.map(t => t.tier)).toEqual(['free', 'tradie', 'team']);
    });

    it('should have correct free tier limits', () => {
      const tiers = getAllTiers();
      const free = tiers[0];
      expect(free.invoicesPerMonth).toBe(3);
      expect(free.swmsPerMonth).toBe(2);
      expect(free.pdfExport).toBe(false);
    });

    it('should have unlimited invoices for tradie', () => {
      const tiers = getAllTiers();
      const tradie = tiers[1];
      expect(tradie.invoicesPerMonth).toBeNull();
    });

    it('should have team members limit for team tier', () => {
      const tiers = getAllTiers();
      const team = tiers[2];
      expect(team.teamMembers).toBe(5);
    });
  });

  describe('isBetaMode', () => {
    it('should return true (currently in beta)', () => {
      expect(isBetaMode()).toBe(true);
    });
  });

  describe('getUserSubscription', () => {
    it('should return subscription info', async () => {
      mockDbQuery.mockResolvedValue({
        rows: [{
          subscription_tier: 'free',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          subscription_started_at: null,
          subscription_expires_at: null,
        }],
      });

      const sub = await getUserSubscription('user-1');

      expect(sub.tier).toBe('free');
      expect(sub.stripeCustomerId).toBeNull();
    });

    it('should throw 404 when user not found', async () => {
      mockDbQuery.mockResolvedValue({ rows: [] });

      await expect(getUserSubscription('missing'))
        .rejects.toThrow('User not found');
    });
  });

  describe('getTierUsage', () => {
    it('should aggregate usage from multiple queries', async () => {
      mockDbQuery
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })  // invoices
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })  // swms
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // team members

      const usage = await getTierUsage('user-1');

      expect(usage.invoicesThisMonth).toBe(5);
      expect(usage.swmsThisMonth).toBe(3);
      expect(usage.teamMemberCount).toBe(2);
      expect(mockDbQuery).toHaveBeenCalledTimes(3);
    });
  });

  describe('canCreateInvoice', () => {
    it('should allow unlimited invoices for tradie tier (beta)', async () => {
      const result = await canCreateInvoice('user-1', 'tradie');
      expect(result.allowed).toBe(true);
    });

    it('should allow invoices for free tier in beta (gets tradie limits)', async () => {
      // In beta, free gets tradie limits (unlimited)
      const result = await canCreateInvoice('user-1', 'free');
      expect(result.allowed).toBe(true);
    });
  });

  describe('canCreateSwms', () => {
    it('should allow unlimited SWMS for tradie tier', async () => {
      const result = await canCreateSwms('user-1', 'tradie');
      expect(result.allowed).toBe(true);
    });
  });

  describe('canAddTeamMember', () => {
    it('should reject for free tier', async () => {
      const result = await canAddTeamMember('user-1', 'free');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Team plan');
    });

    it('should reject for tradie tier', async () => {
      const result = await canAddTeamMember('user-1', 'tradie');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Team plan');
    });

    it('should allow for team tier within limit', async () => {
      mockDbQuery.mockResolvedValue({ rows: [{ count: '3' }] });

      const result = await canAddTeamMember('user-1', 'team');
      expect(result.allowed).toBe(true);
    });

    it('should allow for team tier in beta (inherits unlimited from tradie limits)', async () => {
      // In beta mode, getTierLimits returns tradie limits where teamMembers=null (unlimited)
      mockDbQuery.mockResolvedValue({ rows: [{ count: '5' }] });

      const result = await canAddTeamMember('user-1', 'team');
      expect(result.allowed).toBe(true);
    });
  });

  describe('isFeatureAvailable', () => {
    it('should return true for tradie features in beta', () => {
      // In beta, all users get tradie-level features
      expect(isFeatureAvailable('free', 'pdfExport')).toBe(true);
      expect(isFeatureAvailable('free', 'quotes')).toBe(true);
      expect(isFeatureAvailable('free', 'expenses')).toBe(true);
    });

    it('should return true for all features on tradie tier', () => {
      expect(isFeatureAvailable('tradie', 'pdfExport')).toBe(true);
      expect(isFeatureAvailable('tradie', 'emailInvoice')).toBe(true);
      expect(isFeatureAvailable('tradie', 'photos')).toBe(true);
    });
  });
});
