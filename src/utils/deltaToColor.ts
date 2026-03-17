import { colors } from '../theme/colors';

/**
 * Converts a delta label string to a color token
 */
export function deltaToColor(label: string): string {
  if (label.includes('Improvement')) return colors.positive;
  if (label.includes('Decline'))     return colors.negative;
  return colors.neutral;
}
