/**
 * Subscription Middleware Tests
 * Tests tier enforcement, feature gating, and limit checking
 */

import { Response, NextFunction } from 'express';

// Mock subscription service
const mockGetUserSubscription = jest.fn();
const mockIsFeatureAvailable = jest.fn();
const mockCanCreateInvoice = jest.fn();
const mockCanCreateSwms = jest.fn();
const mockCanAddTeamMember = jest.fn();

jest.mock('../../services/subscriptions.js', () => ({
  getUserSubscription: (...args: any[]) => mockGetUserSubscription(...args),
  isFeatureAvailable: (...args: any[]) => mockIsFeatureAvailable(...args),
  canCreateInvoice: (...args: any[]) => mockCanCreateInvoice(...args),
  canCreateSwms: (...args: any[]) => mockCanCreateSwms(...args),
  canAddTeamMember: (...args: any[]) => mockCanAddTeamMember(...args),
}));

jest.mock('../../types/index.js', () => ({}));

import {
  attachSubscription,
  requireTier,
  requireFeature,
  checkLimit,
} from '../../middleware/subscription.js';

function createMockReqResNext() {
  const req = { user: { userId: 'test-user-id' } } as any;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Subscription Middleware', () => {
  describe('attachSubscription', () => {
    it('should attach subscription tier to request', async () => {
      const { req, res, next } = createMockReqResNext();
      mockGetUserSubscription.mockResolvedValue({ tier: 'tradie' });

      await attachSubscription(req, res, next);

      expect((req as any).subscriptionTier).toBe('tradie');
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 when no user', async () => {
      const { res, next } = createMockReqResNext();
      const req = {} as any; // no user

      await attachSubscription(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 when user not found', async () => {
      const { req, res, next } = createMockReqResNext();
      const error = { statusCode: 404, message: 'User not found' };
      mockGetUserSubscription.mockRejectedValue(error);

      await attachSubscription(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('requireTier', () => {
    it('should allow when user tier matches', () => {
      const { req, res, next } = createMockReqResNext();
      (req as any).subscriptionTier = 'tradie';

      requireTier('tradie')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow higher tier (team > tradie)', () => {
      const { req, res, next } = createMockReqResNext();
      (req as any).subscriptionTier = 'team';

      requireTier('tradie')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject when tier too low', () => {
      const { req, res, next } = createMockReqResNext();
      (req as any).subscriptionTier = 'free';

      requireTier('tradie')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject when no subscription tier attached', () => {
      const { req, res, next } = createMockReqResNext();

      requireTier('tradie')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.error).toBe('SUBSCRIPTION_REQUIRED');
    });
  });

  describe('requireFeature', () => {
    it('should allow when feature is available', () => {
      const { req, res, next } = createMockReqResNext();
      (req as any).subscriptionTier = 'tradie';
      mockIsFeatureAvailable.mockReturnValue(true);

      requireFeature('pdfExport')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject when feature not available', () => {
      const { req, res, next } = createMockReqResNext();
      (req as any).subscriptionTier = 'free';
      mockIsFeatureAvailable.mockReturnValue(false);

      requireFeature('pdfExport')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.error).toBe('FEATURE_NOT_AVAILABLE');
    });

    it('should reject when no subscription tier', () => {
      const { req, res, next } = createMockReqResNext();

      requireFeature('quotes')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('checkLimit', () => {
    it('should allow invoice creation within limit', async () => {
      const { req, res, next } = createMockReqResNext();
      (req as any).subscriptionTier = 'free';
      mockCanCreateInvoice.mockResolvedValue({ allowed: true });

      await checkLimit('invoice')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invoice creation at limit', async () => {
      const { req, res, next } = createMockReqResNext();
      (req as any).subscriptionTier = 'free';
      mockCanCreateInvoice.mockResolvedValue({
        allowed: false,
        reason: 'Free plan allows 3 invoices per month',
      });

      await checkLimit('invoice')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.error).toBe('LIMIT_REACHED');
    });

    it('should check SWMS limits', async () => {
      const { req, res, next } = createMockReqResNext();
      (req as any).subscriptionTier = 'free';
      mockCanCreateSwms.mockResolvedValue({ allowed: true });

      await checkLimit('swms')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should check team member limits', async () => {
      const { req, res, next } = createMockReqResNext();
      (req as any).subscriptionTier = 'team';
      mockCanAddTeamMember.mockResolvedValue({ allowed: true });

      await checkLimit('teamMember')(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject when no tier or user', async () => {
      const { res, next } = createMockReqResNext();
      const req = {} as any;

      await checkLimit('invoice')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
