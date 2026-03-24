/**
 * BossBoard Theme Colors
 *
 * Re-exports from @bossboard/shared for backwards compatibility.
 * All colors are defined in the shared package as the single source of truth.
 *
 * Usage:
 *   import { colors } from '@/src/theme/colors';
 *   <View style={{ backgroundColor: colors.primary }} />
 */

export { colors, getStatusColor, getCategoryColor } from '@bossboard/shared';
export type { ColorKey } from '@bossboard/shared';
