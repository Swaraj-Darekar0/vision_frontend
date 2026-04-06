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
  BACKGROUND: '#050505',
  ACCENT: '#1152D4',
  GREEN: '#39D353',
} as const;

export const PLAN = {
  SESSIONS_MIN: 1,
  SESSIONS_MAX: 3,
  DURATION_MIN_MINUTES: 1,
  DURATION_MAX_MINUTES: 6,
  DURATION_DIAGNOSTIC: 3,
  ESCALATION_COMPLETION: 0.9,
  ESCALATION_SCORE_DELTA: 0.05,
  DEESCALATION_COMPLETION: 0.6,
  DEESCALATION_SCORE_DELTA: -0.05,
} as const;

export const SPEAKER_LEVEL = {
  DEVELOPING_MAX: 0.44,
  COMPETENT_MAX: 0.69,
  FORCE_DEVELOPING_THRESHOLD: 0.4,
  LABELS: {
    developing: 'Developing',
    competent: 'Competent',
    advanced: 'Advanced',
  },
  TAGLINES: {
    developing: 'Your foundation is being built',
    competent: 'You have the core, now refine it',
    advanced: "You're good. Let's make you exceptional",
  },
} as const;

export const SUBSCRIPTION = {
  PRICE_WEEKLY: 90,
  PRICE_MONTHLY: 480,
  DISPLAY_WEEKLY: 'Rs 90 / week',
  DISPLAY_MONTHLY: 'Rs 480 / month',
  WEEKLY_DAYS: 7,
  MONTHLY_DAYS: 30,
} as const;

export const DIAGNOSTIC_TOPIC = {
  TITLE: 'Tell me about a challenge you recently faced and how you handled it.',
  DURATION_MINUTES: 3,
  MIN_DURATION_SECONDS: 120,
} as const;
