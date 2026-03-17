// src/theme/constants.ts

export const STREAK = {
  MILESTONE_DAYS: [3, 7, 14, 30],       // Days that trigger motivational tip fetch
  SKILL_KEYS: ['confidence', 'clarity', 'engagement', 'nervousness'] as const,
  GRID_SIZE: 8,                           // 4x2 grid squares on dashboard
} as const;

export const OFFLINE_QUEUE = {
  MAX_SESSIONS: 3,                        // Hard cap on queued sessions
  RETRY_MAX: 3,                           // Max upload retry attempts per session
  RETRY_DELAY_MS: 5_000,                 // Delay between retries
  BACKGROUND_TASK_NAME: 'QUEUE_DRAIN',   // expo-task-manager identifier
} as const;

export const SHARE_CARD = {
  WIDTH: 1080,
  HEIGHT: 1080,
  BACKGROUND: '#0D0D0D',
  ACCENT: '#1152D4',
  GREEN: '#39D353',
} as const;
