// src/store/streakStore.ts

import { create } from 'zustand';
import { SessionListEntry } from '../types/cache';
import { STREAK } from '../theme/constants';
import { getRecentSessions } from '../cache/sessionCache';
import apiClient from '../api/client';

export interface SkillStreak {
  skill: typeof STREAK.SKILL_KEYS[number] | 'overall';
  currentStreak: number;    // consecutive days with a session
  longestStreak: number;
  lastMilestoneShown: number; // last milestone we fetched a tip for
}

export interface StreakState {
  sessions: SessionListEntry[];           // last 8, for grid display
  skillStreaks: SkillStreak[];
  milestoneTip: string | null;            // non-null when a new milestone is hit
  milestoneTipSkill: string | null;
  hasCompletedTodaySession: boolean;      // drives QuoteCard locked/unlocked state
  isLoading: boolean;
  refresh: (userId: string) => Promise<void>;
  reset: () => void;
  dismissMilestoneTip: () => void;
}

export const useStreakStore = create<StreakState>((set, get) => ({
  sessions: [],
  skillStreaks: [],
  milestoneTip: null,
  milestoneTipSkill: null,
  hasCompletedTodaySession: false,
  isLoading: false,

  refresh: async (userId: string) => {
    if (!userId) return;

    set({ isLoading: true });
    const sessions = await getRecentSessions(userId, STREAK.GRID_SIZE);
    const skillStreaks = computeSkillStreaks(sessions);
    const hasCompletedTodaySession = checkTodaySession(sessions);
    set({ sessions, skillStreaks, hasCompletedTodaySession, isLoading: false });
    // set({
    //   milestoneTip: "You've hit a 3-day streak! Your consistency is impressive. Try to maintain this pace to build lasting public speaking confidence.",
    //   milestoneTipSkill: 'overall',
    // });
    // Check for new milestones — fetch tip from Supabase only on milestone hit
    const { milestoneTip } = get();
    if (!milestoneTip) {
      await checkAndFetchMilestoneTip(skillStreaks, set);
    }
  },

  reset: () => set({
    sessions: [],
    skillStreaks: [],
    milestoneTip: null,
    milestoneTipSkill: null,
    hasCompletedTodaySession: false,
    isLoading: false,
  }),

  dismissMilestoneTip: () => set({ milestoneTip: null, milestoneTipSkill: null }),
}));

// ── Streak computation (pure, no side effects) ─────────────────────────────────

function checkTodaySession(sessions: SessionListEntry[]): boolean {
  // Uses device local timezone — matches the user's intuitive definition of "today"
  const todayKey = new Date().toLocaleDateString('sv'); // 'YYYY-MM-DD' in local TZ
  return sessions.some((s) => {
    const sessionKey = new Date(s.processedAt).toLocaleDateString('sv');
    return sessionKey === todayKey;
  });
}

function computeSkillStreaks(sessions: SessionListEntry[]): SkillStreak[] {
  // Sessions are sorted newest-first from getRecentSessions
  // A "streak day" = any calendar day with at least one session
  const keys: Array<typeof STREAK.SKILL_KEYS[number] | 'overall'> = [
    ...STREAK.SKILL_KEYS, 'overall',
  ];

  return keys.map((skill) => {
    let current = 0;
    let longest = 0;
    let prevDate: string | null = null;

    for (const session of sessions) {
      const dateKey = session.processedAt.slice(0, 10); // 'YYYY-MM-DD'
      if (dateKey === prevDate) continue; // multiple sessions same day = 1 streak day

      const score =
        skill === 'overall'
          ? session.overallScore
          : (session as any)[`${skill}Score`] ?? session.overallScore;

      if (score >= 0.40) { // any "medium" or above session keeps streak alive
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
      prevDate = dateKey;
    }

    return {
      skill,
      currentStreak: current,
      longestStreak: longest,
      lastMilestoneShown: 0,
    };
  });
}

async function checkAndFetchMilestoneTip(
  skillStreaks: SkillStreak[],
  set: (partial: Partial<StreakState>) => void,
) {
  for (const sk of skillStreaks) {
    const nextMilestone = STREAK.MILESTONE_DAYS.find(
      (m) => m <= sk.currentStreak && m > sk.lastMilestoneShown,
    );
    if (nextMilestone) {
      try {
        const { data } = await apiClient.get(
          `/streak/tip?milestone=${nextMilestone}&skill=${sk.skill}`,
        );
        if (data?.tip_text) {
          set({
            milestoneTip: data.tip_text,
            milestoneTipSkill: sk.skill,
          });
          sk.lastMilestoneShown = nextMilestone;
        }
      } catch {
        // Network failure — no tip shown, user not disrupted
      }
      break; // Show at most one tip per refresh
    }
  }
}
