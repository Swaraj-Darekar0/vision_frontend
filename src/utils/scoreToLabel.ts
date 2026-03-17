/**
 * Converts a 0-1 float to a 'High' | 'Medium' | 'Low' label
 */
export function scoreToLabel(s: number): 'High' | 'Medium' | 'Low' {
  if (s >= 0.70) return 'High';
  if (s >= 0.40) return 'Medium';
  return 'Low';
}
