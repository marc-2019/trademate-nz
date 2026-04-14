/**
 * Authentication Middleware Tests
 * Tests JWT verification, optional auth, and role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test_jwt_secret';

jest.mock('../../config/index.js', () => ({
  config: {
    jwt: { secret: JWT_SECRET },
  },
}));

jest.mock('../../types/index.js', () => ({}));

import { authenticate, optionalAuth, requireTeam, requireTeamRole } from '../../middleware/auth.js';

function createMockReqResNext(headers: Record<string, string> = {}) {
  const req = { headers, user: undefined } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

function makeToken(payload: object, secret = JWT_SECRET, options: jwt.SignOptions = {}) {
  return jwt.sign(payload, secret, options);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// authenticate
// =============================================================================

describe('authenticate', () => {
  it('should call next and attach user when token is valid', () => {
    const payload = { userId: 'u1', email: 'a@b.com' };
    const token = makeToken(payload);
    const { req, res, next } = createMockReqResNext({
      authorization: `Bearer ${token}`,
    });

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user.userId).toBe('u1');
    expect((req as any).user.email).toBe('a@b.com');
  });

  it('should return 401 when Authorization header is missing', () => {
    const { req, res, next } = createMockReqResNext();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error).toBe('Authentication required');
  });

  it('should return 401 when Authorization header does not start with Bearer', () => {
    const { req, res, next } = createMockReqResNext({
      authorization: 'Basic abc123',
    });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 with Token expired error for expired tokens', () => {
    const token = makeToken({ userId: 'u1' }, JWT_SECRET, { expiresIn: -1 });
    const { req, res, next } = createMockReqResNext({
      authorization: `Bearer ${token}`,
    });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error).toBe('Token expired');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 for tokens signed with wrong secret', () => {
    const token = makeToken({ userId: 'u1' }, 'wrong_secret');
    const { req, res, next } = createMockReqResNext({
      authorization: `Bearer ${token}`,
    });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error).toBe('Invalid token');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 for malformed token strings', () => {
    const { req, res, next } = createMockReqResNext({
      authorization: 'Bearer not.a.valid.jwt',
    });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should attach teamId and teamRole when present in token', () => {
    const payload = { userId: 'u1', email: 'a@b.com', teamId: 'team1', teamRole: 'admin' };
    const token = makeToken(payload);
    const { req, res, next } = createMockReqResNext({
      authorization: `Bearer ${token}`,
    });

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user.teamId).toBe('team1');
    expect((req as any).user.teamRole).toBe('admin');
  });
});

// =============================================================================
// optionalAuth
// =============================================================================

describe('optionalAuth', () => {
  it('should call next without user when no Authorization header', () => {
    const { req, res, next } = createMockReqResNext();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user).toBeUndefined();
  });

  it('should attach user and call next when token is valid', () => {
    const payload = { userId: 'u2', email: 'x@y.com' };
    const token = makeToken(payload);
    const { req, res, next } = createMockReqResNext({
      authorization: `Bearer ${token}`,
    });

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user.userId).toBe('u2');
  });

  it('should call next without user when token is invalid (no failure)', () => {
    const { req, res, next } = createMockReqResNext({
      authorization: 'Bearer garbage.token.here',
    });

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user).toBeUndefined();
  });

  it('should call next without user when token is expired (no failure)', () => {
    const token = makeToken({ userId: 'u1' }, JWT_SECRET, { expiresIn: -1 });
    const { req, res, next } = createMockReqResNext({
      authorization: `Bearer ${token}`,
    });

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user).toBeUndefined();
  });
});

// =============================================================================
// requireTeam
// =============================================================================

describe('requireTeam', () => {
  it('should call next when user has teamId', () => {
    const { req, res, next } = createMockReqResNext();
    (req as any).user = { userId: 'u1', teamId: 'team1' };

    requireTeam(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should return 403 when user has no teamId', () => {
    const { req, res, next } = createMockReqResNext();
    (req as any).user = { userId: 'u1' };

    requireTeam(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error).toBe('TEAM_REQUIRED');
  });

  it('should return 403 when user is undefined', () => {
    const { req, res, next } = createMockReqResNext();
    // req.user is undefined by default

    requireTeam(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

// =============================================================================
// requireTeamRole
// =============================================================================

describe('requireTeamRole', () => {
  it('should call next when user has the required role', () => {
    const { req, res, next } = createMockReqResNext();
    (req as any).user = { userId: 'u1', teamId: 'team1', teamRole: 'owner' };

    requireTeamRole('owner')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should call next when user role is one of multiple allowed roles', () => {
    const { req, res, next } = createMockReqResNext();
    (req as any).user = { userId: 'u1', teamId: 'team1', teamRole: 'admin' };

    requireTeamRole('owner', 'admin')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should return 403 when user role is not in allowed roles', () => {
    const { req, res, next } = createMockReqResNext();
    (req as any).user = { userId: 'u1', teamId: 'team1', teamRole: 'worker' };

    requireTeamRole('owner', 'admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error).toBe('INSUFFICIENT_ROLE');
    expect(body.message).toContain('owner');
    expect(body.message).toContain('admin');
  });

  it('should return 403 when user has no teamId', () => {
    const { req, res, next } = createMockReqResNext();
    (req as any).user = { userId: 'u1', teamRole: 'owner' };

    requireTeamRole('owner')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.error).toBe('TEAM_REQUIRED');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when user has no teamRole', () => {
    const { req, res, next } = createMockReqResNext();
    (req as any).user = { userId: 'u1', teamId: 'team1' };

    requireTeamRole('owner')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when user is undefined', () => {
    const { req, res, next } = createMockReqResNext();

    requireTeamRole('owner')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
