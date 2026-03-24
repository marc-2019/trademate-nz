/**
 * BossBoard API Types
 *
 * Re-exports all shared types from @bossboard/shared.
 * Only the Express request augmentation stays here (Express-specific).
 */

// Re-export everything from the shared package
export * from '@bossboard/shared';

// Import JwtPayload for the Express augmentation below
import type { JwtPayload } from '@bossboard/shared';

// =============================================================================
// EXPRESS REQUEST EXTENSIONS (API-only, not shared)
// =============================================================================

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
