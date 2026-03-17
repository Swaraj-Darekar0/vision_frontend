export const colors = {
  // Backgrounds
  backgroundDark:    '#0D0D0D',
  surfaceDark:       '#161616',
  surfaceElevated:   '#1E1E1E',
  buttonDark:        '#1A1A1A',

  // Text
  textPrimary:       '#FFFFFF',
  textSecondary:     '#888888',
  textMuted:         '#666666',
  textNeutral:       '#9CA3AF',

  // Brand
  primary:           '#1152D4',
  primaryTint:       'rgba(17, 82, 212, 0.15)',

  // Streak / Status
  streakHigh:        '#39D353',   // overall_score > 0.70
  streakMed:         '#006D32',   // overall_score 0.40–0.70
  streakLow:         '#0E4429',   // overall_score < 0.40
  streakEmpty:       '#27272A',   // no session

  // Recording
  recordingRed:      '#EF4444',
  recordingRedBg:    'rgba(239, 68, 68, 0.20)',
  recordingRedBorder:'rgba(239, 68, 68, 0.30)',

  // Overlays
  gradientTop:       'rgba(0, 0, 0, 0.80)',
  gradientBottom:    'rgba(0, 0, 0, 0.90)',
  frostedGlass:      'rgba(255, 255, 255, 0.10)',
  frostedGlassHover: 'rgba(255, 255, 255, 0.20)',

  // Borders
  borderDark:        '#1F2937',
  borderMuted:       'rgba(255, 255, 255, 0.08)',

  // Feedback
  positive:          '#39D353',
  negative:          '#EF4444',
  neutral:           '#888888',
} as const;
