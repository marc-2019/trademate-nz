/**
 * BossBoard Brand Colors (API-side)
 * Used in HTML templates (legal pages, email templates, public invoice pages).
 * Must stay in sync with mobile src/theme/colors.ts
 */

export const brandColors = {
  primary: '#1A2A44',       // Navy Blue
  accent: '#FF6B35',        // Vibrant Orange
  white: '#FFFFFF',
  primaryDark: '#0F1B2E',   // Deep navy
  accentLight: '#FFA07A',   // Soft orange
  background: '#F3F4F6',
  surface: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  link: '#2563EB',          // Standard web link blue
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
} as const;
