/**
 * Error Handling Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Global error handler
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = config.isDevelopment ? err.message : 'An unexpected error occurred';

  res.status(statusCode).json({
    success: false,
    error: err.code || 'INTERNAL_ERROR',
    message,
    ...(config.isDevelopment && { stack: err.stack }),
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'The requested resource does not exist',
  });
}

/**
 * Create an application error with status code
 */
export function createError(message: string, statusCode = 500, code?: string): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export default { errorHandler, notFoundHandler, createError };
