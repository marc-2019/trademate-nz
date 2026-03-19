/**
 * BossBoard Theme Colors
 * 
 * SINGLE SOURCE OF TRUTH for all colors in the app.
 * Change colors here and they propagate everywhere.
 * 
 * Usage:
 *   import { colors } from '@/src/theme/colors';
 *   <View style={{ backgroundColor: colors.primary }} />
 */

export const colors = {
  // =========================================================================
  // BRAND COLORS
  // =========================================================================
  
  /** Navy Blue - Primary brand color. Headers, nav, text headings. */
  primary: '#1A2A44',
  
  /** Vibrant Orange - Accent color. CTAs, buttons, active states, icons. */
  accent: '#FF6B35',
  
  /** White - Clean backgrounds, text on dark surfaces. */
  white: '#FFFFFF',
  
  // =========================================================================
  // EXTENDED PALETTE
  // =========================================================================
  
  /** Deep navy for shadows, footers, overlays */
  primaryDark: '#0F1B2E',
  
  /** Softer orange for hover states, subtle backgrounds */
  accentLight: '#FFA07A',
  
  /** Off-white for cards, secondary backgrounds */
  backgroundLight: '#F5F5F5',
  
  /** Main app background */
  background: '#F8FAFC',
  
  /** Card/surface background */
  surface: '#FFFFFF',
  
  // =========================================================================
  // TEXT COLORS
  // =========================================================================
  
  /** Primary text - headings, important content */
  textPrimary: '#111827',
  
  /** Secondary text - descriptions, labels */
  textSecondary: '#64748B',
  
  /** Muted text - timestamps, hints */
  textMuted: '#94A3B8',
  
  /** Text on primary/dark backgrounds */
  textOnPrimary: '#FFFFFF',
  
  /** Text on accent/orange backgrounds */
  textOnAccent: '#FFFFFF',
  
  // =========================================================================
  // UI ELEMENTS
  // =========================================================================
  
  /** Borders, dividers */
  border: '#E5E7EB',
  
  /** Lighter borders for cards */
  borderLight: '#F3F4F6',
  
  /** Input field backgrounds */
  inputBackground: '#F9FAFB',
  
  /** Disabled state */
  disabled: '#9CA3AF',
  
  /** Switch/toggle inactive track */
  switchInactive: '#9CA3AF',
  
  // =========================================================================
  // STATUS COLORS
  // =========================================================================
  
  /** Success - paid, completed, verified */
  success: '#10B981',
  successLight: '#D1FAE5',
  
  /** Warning - pending, expiring soon */
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  
  /** Danger - overdue, expired, errors */
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  
  /** Info - neutral informational */
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  
  // =========================================================================
  // CATEGORY COLORS (for charts, tags, etc.)
  // =========================================================================
  
  categories: {
    labour: '#FF6B35',     // Orange (accent)
    materials: '#1A2A44',  // Navy (primary)
    subcontractor: '#8B5CF6',
    equipment: '#06B6D4',
    travel: '#F59E0B',
    other: '#6B7280',
  },
  
  // =========================================================================
  // ROLE COLORS
  // =========================================================================
  
  roles: {
    owner: '#FF6B35',
    admin: '#1A2A44',
    worker: '#10B981',
  },
  
  // =========================================================================
  // INVOICE STATUS COLORS
  // =========================================================================
  
  invoiceStatus: {
    draft: '#6B7280',
    sent: '#FF6B35',
    paid: '#10B981',
    overdue: '#EF4444',
  },
} as const;

/** Type for accessing color keys */
export type ColorKey = keyof typeof colors;

/** 
 * Helper: get status color for invoice/job status 
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    draft: colors.invoiceStatus.draft,
    sent: colors.invoiceStatus.sent,
    paid: colors.invoiceStatus.paid,
    overdue: colors.invoiceStatus.overdue,
    active: colors.success,
    completed: colors.success,
    cancelled: colors.danger,
    pending: colors.warning,
    expired: colors.danger,
    signed: colors.success,
    archived: colors.textMuted,
  };
  return statusColors[status] || colors.textSecondary;
}

/**
 * Helper: get category color for expense/product types
 */
export function getCategoryColor(category: string): string {
  const key = category as keyof typeof colors.categories;
  return colors.categories[key] || colors.categories.other;
}
