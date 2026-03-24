/**
 * @bossboard/shared
 * Shared types, theme, and utilities for BossBoard.
 */

// Types
export * from './types/index.js';

// Theme
export { colors, getStatusColor, getCategoryColor } from './theme/colors.js';
export type { ColorKey } from './theme/colors.js';

// Utils
export { formatCurrency, formatDate, formatDateTime, formatElapsedTime } from './utils/format.js';
