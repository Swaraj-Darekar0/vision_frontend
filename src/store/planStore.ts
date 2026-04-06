import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { create } from 'zustand';
import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { CACHE_KEYS } from '../cache/cacheKeys';
import { PlanContext, PlanTopic, UserPersonalizationProfile, WeeklyPlan, WeeklyReview } from '../types/plan';
import { computeAdaptivePlanParams } from '../utils/computeAdaptivePlanParams';

interface GeneratePlanInput {
  userId: string;
  profile: UserPersonalizationProfile;
  speakerLevel: WeeklyPlan['speaker_level'];
  weekNumber?: number;
  planContext?: Partial<PlanContext>;
}

interface PlanStore {
  currentPlan: WeeklyPlan | null;
  weeklyReview: WeeklyReview | null;
  isGenerating: boolean;
  reset: () => void;
  hydratePlanFromCache: (userId: string) => Promise<WeeklyPlan | null>;
  loadPlan: (userId: string) => Promise<WeeklyPlan | null>;
  savePlan: (userId: string, plan: WeeklyPlan) => Promise<void>;
  generateWeeklyPlan: (input: GeneratePlanInput) => Promise<WeeklyPlan>;
  markTopicComplete: (userId: string, topic: { day: number; session: number; sessionId?: string | null }) => Promise<void>;
  ensurePlan: (input: GeneratePlanInput) => Promise<WeeklyPlan>;
  createWeeklyReview: (userId: string, plan: WeeklyPlan) => Promise<WeeklyReview>;
  markReviewShown: (userId: string, weekNumber: number) => Promise<void>;
  setWeeklyReview: (review: WeeklyReview | null) => void;
}

function tierToLabel(weekNumber: number): PlanTopic['tier'] {
  if (weekNumber >= 4) return 'tier_4';
  if (weekNumber === 3) return 'tier_3';
  if (weekNumber === 2) return 'tier_2';
  return 'tier_1';
}

function parsePlanData(value: any) {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function normalizeTopic(rawTopic: any): PlanTopic | null {
  if (!rawTopic) return null;

  const resources = parsePlanData(rawTopic.resources) ?? {};

  return {
    day: Number(rawTopic.day ?? 1),
    session: Number(rawTopic.session ?? 1),
    tier: rawTopic.tier ?? 'tier_1',
    topic_title: rawTopic.topic_title ?? rawTopic.title ?? 'Untitled session',
    target_skill: rawTopic.target_skill ?? 'clarity',
    duration_minutes: Number(rawTopic.duration_minutes ?? rawTopic.duration ?? 1),
    completed: Boolean(rawTopic.completed),
    completed_at: rawTopic.completed_at ?? null,
    session_id: rawTopic.session_id ?? null,
    resources: {
      hint: resources.hint ?? rawTopic.hint ?? 'Gather two or three ideas before you begin.',
      research_prompt: resources.research_prompt ?? rawTopic.research_prompt ?? null,
      youtube_search: resources.youtube_search ?? rawTopic.youtube_search ?? null,
    },
  };
}

function normalizeWeeklyPlan(payload: any): WeeklyPlan {
  const planData = parsePlanData(payload?.plan_data) ?? payload;
  const rawTopics =
    (Array.isArray(planData?.topics) && planData.topics) ||
    (Array.isArray(payload?.topics) && payload.topics) ||
    (Array.isArray(planData) && planData) ||
    [];

  return {
    plan_id: payload?.plan_id ?? payload?.id ?? `plan-${Date.now()}`,
    week_number: payload?.week_number ?? 1,
    week_start_date: payload?.week_start_date ?? dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD'),
    sessions_per_day: payload?.sessions_per_day ?? 1,
    speaker_level: payload?.speaker_level ?? 'developing',
    topics: rawTopics.map(normalizeTopic).filter(Boolean) as PlanTopic[],
    generated_at: payload?.generated_at ?? new Date().toISOString(),
  };
}

function normalizeWeeklyReview(payload: any): WeeklyReview {
  return {
    week_number: payload?.week_number ?? 1,
    completion_rate: payload?.completion_rate ?? 0,
    avg_overall_score: payload?.avg_overall_score ?? 0,
    avg_confidence: payload?.avg_confidence ?? undefined,
    avg_clarity: payload?.avg_clarity ?? undefined,
    avg_engagement: payload?.avg_engagement ?? undefined,
    avg_nervousness: payload?.avg_nervousness ?? undefined,
    weakest_metric: payload?.weakest_metric ?? '--',
    strongest_metric: payload?.strongest_metric ?? '--',
    missed_days: Array.isArray(payload?.missed_days) ? payload.missed_days : [],
    review_narrative: payload?.review_narrative ?? '',
    shown_to_user: payload?.shown_to_user ?? false,
  };
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  currentPlan: null,
  weeklyReview: null,
  isGenerating: false,

  reset: () => set({ currentPlan: null, weeklyReview: null, isGenerating: false }),

  hydratePlanFromCache: async (userId) => {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.weeklyPlan(userId));
    const plan = raw ? (JSON.parse(raw) as WeeklyPlan) : null;
    set({ currentPlan: plan });
    return plan;
  },

  loadPlan: async (userId) => {
    try {
      const { data } = await apiClient.get(ENDPOINTS.planCurrent, {
        params: { user_id: userId },
      });
      const plan = normalizeWeeklyPlan(data);
      await AsyncStorage.setItem(CACHE_KEYS.weeklyPlan(userId), JSON.stringify(plan));
      set({ currentPlan: plan });
      return plan;
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 404) {
        set({ currentPlan: null });
        return null;
      }

      const raw = await AsyncStorage.getItem(CACHE_KEYS.weeklyPlan(userId));
      const plan = raw ? (JSON.parse(raw) as WeeklyPlan) : null;
      set({ currentPlan: plan });
      return plan;
    }
  },

  savePlan: async (userId, plan) => {
    await AsyncStorage.setItem(CACHE_KEYS.weeklyPlan(userId), JSON.stringify(plan));
    await AsyncStorage.setItem(CACHE_KEYS.lastPlanAt(userId), plan.generated_at);
    set({ currentPlan: plan });
  },

  generateWeeklyPlan: async ({ userId, profile, speakerLevel, weekNumber = 1, planContext }) => {
    set({ isGenerating: true });
    try {
      const adaptive = computeAdaptivePlanParams({
        speaker_level: speakerLevel,
        current_week: weekNumber,
        tier: tierToLabel(weekNumber),
        sessions_this_week: 7,
        performance_last_week: null,
        ...planContext,
      });
      const usedTopicsRaw = await AsyncStorage.getItem(CACHE_KEYS.usedTopics(userId));
      const usedTopics = usedTopicsRaw ? (JSON.parse(usedTopicsRaw) as string[]) : [];
      const requestBody = {
        user_id: userId,
        week_number: weekNumber,
        week_start_date: dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD'),
        speaker_level: speakerLevel,
        user_profile: profile,
        plan_context: {
          speaker_level: speakerLevel,
          current_week: weekNumber,
          tier: adaptive.tier,
          sessions_this_week: adaptive.sessionsPerDay * 7,
          performance_last_week: planContext?.performance_last_week ?? null,
        },
        sessions_per_day: adaptive.sessionsPerDay,
        previously_used_topics: usedTopics,
      };

      const { data } = await apiClient.post(ENDPOINTS.planGenerate, requestBody);
      const plan = normalizeWeeklyPlan(data);

      await AsyncStorage.setItem(
        CACHE_KEYS.usedTopics(userId),
        JSON.stringify([...usedTopics, ...plan.topics.map((topic) => topic.topic_title)]),
      );
      await get().savePlan(userId, plan);
      return plan;
    } catch (error) {
      const backendPlan = await get().loadPlan(userId);
      if (backendPlan) {
        return backendPlan;
      }

      throw error;
    } finally {
      set({ isGenerating: false });
    }
  },

  markTopicComplete: async (userId, topic) => {
    const plan = get().currentPlan;
    if (!plan) return;

    const nextPlan: WeeklyPlan = {
      ...plan,
      topics: plan.topics.map((entry) =>
        entry.day === topic.day && entry.session === topic.session
          ? {
              ...entry,
              completed: true,
              completed_at: new Date().toISOString(),
              session_id: topic.sessionId ?? null,
            }
          : entry,
      ),
    };

    try {
      await apiClient.patch(ENDPOINTS.planMarkComplete, {
        user_id: userId,
        week_number: plan.week_number,
        day: topic.day,
        session: topic.session,
        session_id: topic.sessionId ?? null,
      });
    } catch (error) {
      console.warn('[PlanStore] Failed to sync completed topic to backend, keeping local state.', error);
    }
    await get().savePlan(userId, nextPlan);
  },

  ensurePlan: async (input) => {
    const existing = await get().loadPlan(input.userId);
    if (existing) {
      const sameWeek = dayjs(existing.week_start_date).isSame(dayjs().startOf('week').add(1, 'day'), 'day');
      if (sameWeek) {
        return existing;
      }
    }

    return get().generateWeeklyPlan(input);
  },

  createWeeklyReview: async (userId, plan) => {
    try {
      const { data } = await apiClient.post(ENDPOINTS.planWeeklyReview, {
        user_id: userId,
        week_number: plan.week_number,
      });
      const review = normalizeWeeklyReview(data);
      set({ weeklyReview: review });
      return review;
    } catch (error) {
      const completionRate =
        plan.topics.length === 0
          ? 0
          : plan.topics.filter((topic) => topic.completed).length / plan.topics.length;

      const review = {
        week_number: plan.week_number,
        completion_rate: completionRate,
        avg_overall_score: completionRate >= 0.85 ? 0.72 : completionRate >= 0.6 ? 0.58 : 0.44,
        weakest_metric: completionRate >= 0.7 ? 'authority' : 'pacing',
        strongest_metric: completionRate >= 0.7 ? 'clarity' : 'engagement',
        missed_days: Array.from({ length: 7 }, (_, index) => index + 1).filter((day) => {
          const sessions = plan.topics.filter((topic) => topic.day === day);
          return sessions.length > 0 && sessions.every((topic) => !topic.completed);
        }),
        review_narrative:
          completionRate >= 0.8
            ? 'You kept strong momentum this week and your plan is ready to stretch you a little further. Clarity is becoming a strength, while pacing still needs deliberate attention.'
            : 'You have real signal from this week, even if consistency dipped. Engagement held up better than pacing, so next week should feel simpler and more focused.',
      } satisfies WeeklyReview;

      set({ weeklyReview: review });
      return review;
    }
  },

  markReviewShown: async (userId, weekNumber) => {
    try {
      await apiClient.patch(ENDPOINTS.planReviewShown, {
        user_id: userId,
        week_number: weekNumber,
      });
    } catch (error) {
      console.warn('[PlanStore] Failed to persist review dismissal:', error);
    }
  },

  setWeeklyReview: (review) => set({ weeklyReview: review }),
}));
