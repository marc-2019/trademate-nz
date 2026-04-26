/** Server-side API URL (internal, not exposed to browser).
 *  In production (Railway), this should be set to the API service's internal URL
 *  or the public URL. Falls back to production public URL. */
export const API_URL = process.env.API_URL || (
  process.env.RAILWAY_ENVIRONMENT
    ? 'https://api.instilligent.com'
    : (process.env.NODE_ENV === 'development' ? 'http://bossboard-dev-api:29000' : 'http://localhost:29000')
);

/** Cookie names */
export const ACCESS_TOKEN_COOKIE = 'bb_access_token';
export const REFRESH_TOKEN_COOKIE = 'bb_refresh_token';

/** App branding */
export const APP_NAME = 'BossBoard';
export const APP_TAGLINE = 'Your whole business. One screen.';
