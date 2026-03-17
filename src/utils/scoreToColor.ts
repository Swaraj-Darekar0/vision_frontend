import { colors } from '../theme/colors';

/**
 * Converts a 0-1 float to a streak square color token
 */
export function scoreToStreakColor(score: number): string {
  if (score > 0.70) return colors.streakHigh;   // bright green
  if (score >= 0.40) return colors.streakMed;   // mid green
  return colors.streakLow;                       // dark green
}
