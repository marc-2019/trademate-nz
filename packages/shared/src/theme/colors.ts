/**
 * BossBoard Theme Colors
 *
 * SINGLE SOURCE OF TRUTH for all colors across API, mobile, and web.
 * Platform-agnostic — consumed by React Native StyleSheet and Tailwind CSS alike.
 */

export const colors = {
  // Brand
  primary: '#1A2A44',
  accent: '#FF6B35',
  white: '#FFFFFF',

  // Extended palette
  primaryDark: '#0F1B2E',
  accentLight: '#FFA07A',
  backgroundLight: '#F5F5F5',
  background: '#F8FAFC',
  surface: '#FFFFFF',

  // Text
  textPrimary: '#111827',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  // UI elements
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  inputBackground: '#F9FAFB',
  disabled: '#9CA3AF',
  switchInactive: '#9CA3AF',

  // Status
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Category colors (charts, tags)
  categories: {
    labour: '#FF6B35',
    materials: '#1A2A44',
    subcontractor: '#8B5CF6',
    equipment: '#06B6D4',
    travel: '#F59E0B',
    other: '#6B7280',
  },

  // Role colors
  roles: {
    owner: '#FF6B35',
    admin: '#1A2A44',
    worker: '#10B981',
  },

  // Invoice status colors
  invoiceStatus: {
    draft: '#6B7280',
    sent: '#FF6B35',
    paid: '#10B981',
    overdue: '#EF4444',
  },
} as const;

export type ColorKey = keyof typeof colors;

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

export function getCategoryColor(category: string): string {
  const key = category as keyof typeof colors.categories;
  return colors.categories[key] || colors.categories.other;
}
