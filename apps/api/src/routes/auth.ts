/**
 * Authentication Routes
 * /api/v1/auth/*
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import authService from '../services/auth.js';
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

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  phone: z.string().optional(),
  tradeType: z.enum(['electrician', 'plumber', 'builder', 'landscaper', 'painter', 'other']).optional(),
  businessName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const updateProfileSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  tradeType: z.enum(['electrician', 'plumber', 'builder', 'landscaper', 'painter', 'other']).optional(),
  businessName: z.string().optional(),
});

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
        details: validation.error.errors,
      });
      return;
    }

    const { user, tokens, verificationCode } = await authService.register(validation.data);

    res.status(201).json({
      success: true,
      data: {
        user,
        tokens,
        verificationCode, // Included for dev/testing; in production, sent via email only
      },
      message: 'Registration successful. Please verify your email.',
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
 * POST /api/v1/auth/login
 * Login a user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
      });
      return;
    }

    const { user, tokens } = await authService.login(validation.data);

    res.json({
      success: true,
      data: {
        user,
        tokens,
      },
      message: 'Login successful',
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
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const validation = refreshSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
      });
      return;
    }

    const tokens = await authService.refreshToken(validation.data.refreshToken);

    res.json({
      success: true,
      data: { tokens },
      message: 'Token refreshed successfully',
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
 * POST /api/v1/auth/logout
 * Logout user (revoke refresh token)
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(req.user!.userId, refreshToken);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await authService.getUserById(req.user!.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    throw error;
  }
});

/**
 * PUT /api/v1/auth/me
 * Update current user profile
 */
router.put('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
      });
      return;
    }

    const user = await authService.updateUser(req.user!.userId, validation.data);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { user },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    throw error;
  }
});

// =============================================================================
// PASSWORD RESET ROUTES (unauthenticated)
// =============================================================================

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Reset code must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * POST /api/v1/auth/forgot-password
 * Request a password reset code (unauthenticated)
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
      });
      return;
    }

    await authService.forgotPassword(validation.data.email);

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with that email, a reset code has been sent.',
    });
  } catch (error) {
    // Swallow errors to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with that email, a reset code has been sent.',
    });
  }
});

/**
 * POST /api/v1/auth/reset-password
 * Reset password with code (unauthenticated)
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
      });
      return;
    }

    await authService.resetPassword(
      validation.data.email,
      validation.data.code,
      validation.data.newPassword
    );

    res.json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
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

// =============================================================================
// VERIFICATION & ONBOARDING ROUTES
// =============================================================================

const verifyEmailSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

/**
 * POST /api/v1/auth/verify-email
 * Verify email with 6-digit code
 */
router.post('/verify-email', authenticate, async (req: Request, res: Response) => {
  try {
    const validation = verifyEmailSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
      });
      return;
    }

    const user = await authService.verifyEmail(req.user!.userId, validation.data.code);

    res.json({
      success: true,
      data: { user },
      message: 'Email verified successfully',
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
 * POST /api/v1/auth/resend-verification
 * Resend verification code
 */
router.post('/resend-verification', authenticate, async (req: Request, res: Response) => {
  try {
    const { verificationCode } = await authService.resendVerification(req.user!.userId);

    res.json({
      success: true,
      data: { verificationCode }, // Included for dev/testing; in production, sent via email only
      message: 'Verification code sent',
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
 * POST /api/v1/auth/complete-onboarding
 * Mark onboarding as completed
 */
router.post('/complete-onboarding', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await authService.completeOnboarding(req.user!.userId);

    res.json({
      success: true,
      data: { user },
      message: 'Onboarding completed',
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

export default router;
