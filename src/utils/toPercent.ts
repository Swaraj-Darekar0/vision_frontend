/**
 * Converts a 0-1 float to a '78%' string
 */
export const toPercent = (s: number) => `${Math.round(s * 100)}%`;
