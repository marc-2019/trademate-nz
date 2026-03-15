/**
 * Error Middleware Tests
 */

import { Request, Response, NextFunction } from 'express';

jest.mock('../../config/index.js', () => ({
  config: { isDevelopment: true },
}));

import { errorHandler, notFoundHandler, createError } from '../../middleware/error.js';

describe('Error Middleware', () => {
  describe('errorHandler', () => {
    it('should handle errors with statusCode', () => {
      const err = createError('Not found', 404, 'NOT_FOUND');
      const req = {} as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect((res.json as jest.Mock).mock.calls[0][0]).toMatchObject({
        success: false,
        error: 'NOT_FOUND',
        message: 'Not found',
      });
    });

    it('should default to 500 for errors without statusCode', () => {
      const err = new Error('Something broke') as any;
      const req = {} as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;
      const next = jest.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404', () => {
      const req = {} as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      notFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect((res.json as jest.Mock).mock.calls[0][0]).toMatchObject({
        success: false,
        error: 'NOT_FOUND',
      });
    });
  });

  describe('createError', () => {
    it('should create an error with statusCode and code', () => {
      const err = createError('Bad request', 400, 'BAD_REQUEST');

      expect(err.message).toBe('Bad request');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
      expect(err).toBeInstanceOf(Error);
    });

    it('should default statusCode to 500', () => {
      const err = createError('Server error');

      expect(err.statusCode).toBe(500);
    });
  });
});
