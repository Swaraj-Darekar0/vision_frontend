/**
 * Converts seconds to HH:MM:SS format
 */
export function formatElapsedSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s]
    .map(v => v < 10 ? "0" + v : v)
    .join(":");
}

/**
 * Converts seconds to a duration label like "14m 23s"
 */
export function formatDurationLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}
