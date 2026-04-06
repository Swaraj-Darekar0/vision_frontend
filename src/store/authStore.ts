import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/client';
import { supabase } from '../api/supabase';
import {
  applyBackendSession,
  persistSessionAccessToken,
  registerUnauthorizedHandler,
  syncStoredAccessToken,
} from '../api/authSession';
import { ENDPOINTS } from '../api/endpoints';
import { clearAllSessions } from '../cache/sessionCache';
import { CACHE_KEYS } from '../cache/cacheKeys';
import { UserProfile } from '../types/database';
import { SpeakerLevel, UserPersonalizationProfile } from '../types/plan';
import { usePlanStore } from './planStore';
import { useSessionStore } from './sessionStore';
import { useStreakStore } from './streakStore';

interface User extends UserProfile {
  email: string;
}

interface SubscriptionState {
  subscription_status: 'free' | 'active' | 'expired';
  subscription_plan: 'weekly' | 'monthly' | null;
  subscription_start: string | null;
  subscription_end: string | null;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  shouldShowWelcome: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  consumeWelcome: () => void;
  updateDisplayName: (name: string) => Promise<void>;
  updatePersonalizationProfile: (profile: UserPersonalizationProfile) => Promise<void>;
  setSpeakerLevel: (speakerLevel: SpeakerLevel) => Promise<void>;
  markDiagnosticComplete: () => Promise<void>;
  activateSubscription: (plan: 'weekly' | 'monthly') => Promise<void>;
  refreshSubscriptionStatus: () => Promise<void>;
  logout: () => Promise<void>;
  handleSessionExpired: () => Promise<void>;
}

async function persistUser(user: User) {
  await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
}

async function clearPersistedAuth(userId?: string) {
  usePlanStore.getState().reset();
  useSessionStore.getState().clear();

  if (userId) {
    await clearAllSessions(userId);
    await AsyncStorage.removeItem(CACHE_KEYS.weeklyPlan(userId));
    await AsyncStorage.removeItem(CACHE_KEYS.usedTopics(userId));
    await AsyncStorage.removeItem(CACHE_KEYS.subscription(userId));
    await AsyncStorage.removeItem(CACHE_KEYS.userProfile(userId));
    useStreakStore.getState().reset();
  }

  await AsyncStorage.removeItem(CACHE_KEYS.OFFLINE_QUEUE);
  await SecureStore.deleteItemAsync('auth_token');
  await SecureStore.deleteItemAsync('auth_user');
}

async function safeUpsertProfile(id: string, values: Record<string, unknown>) {
  const { error } = await supabase
    .from('user_profiles')
    .upsert({ id, ...values, updated_at: new Date().toISOString() }, { onConflict: 'id' });

  if (error) {
    console.warn('[AuthStore] Profile sync skipped:', error.message);
  }
}

async function syncProfileToBackend(id: string, values: Record<string, unknown>) {
  try {
    await apiClient.post(ENDPOINTS.subscriptionProfile, {
      user_id: id,
      ...values,
    });
  } catch (error) {
    console.warn('[AuthStore] Profile endpoint unavailable, falling back to Supabase direct write.');
    await safeUpsertProfile(id, values);
  }
}

async function syncSubscriptionStatusFromBackend(user: User) {
  const { data } = await apiClient.get(ENDPOINTS.subscriptionStatus, {
    params: { user_id: user.id },
  });

  const next = mergeSubscriptionState(user, {
    subscription_status: data?.status ?? user.subscription_status ?? 'free',
    subscription_plan: data?.plan ?? user.subscription_plan ?? null,
    subscription_end: data?.subscription_end ?? user.subscription_end ?? null,
  });

  return next;
}

function buildProfilePayload(user: User) {
  return {
    display_name: user.display_name ?? '',
    speaking_goals: user.speaking_goals ?? [],
    identity: user.identity ?? null,
    work_domain: user.work_domain ?? null,
    interest_areas: user.interest_areas ?? [],
    speaking_goal: user.speaking_goal ?? null,
    practice_frequency: user.practice_frequency ?? null,
    speaker_level: user.speaker_level ?? null,
    subscription_status: user.subscription_status ?? 'free',
    subscription_plan: user.subscription_plan ?? null,
    subscription_start: user.subscription_start ?? null,
    subscription_end: user.subscription_end ?? null,
    onboarding_complete: user.onboarding_complete ?? false,
    diagnostic_complete: user.diagnostic_complete ?? false,
  };
}

async function ensureUserProfileRecord(user: User) {
  await safeUpsertProfile(user.id, buildProfilePayload(user));
}

function mergeSubscriptionState(user: User, next: Partial<SubscriptionState>): User {
  const merged = { ...user, ...next } as User;

  if (
    merged.subscription_status === 'active' &&
    merged.subscription_end &&
    new Date(merged.subscription_end).getTime() < Date.now()
  ) {
    merged.subscription_status = 'expired';
  }

  return merged;
}

async function fetchCombinedUser(sessionUser: { id: string; email?: string | null }) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', sessionUser.id)
    .single();

  return mergeSubscriptionState(
    {
      ...(profile || {}),
      id: sessionUser.id,
      email: sessionUser.email ?? '',
      display_name: profile?.display_name ?? '',
      speaking_goals: profile?.speaking_goals ?? [],
      interest_areas: profile?.interest_areas ?? [],
      subscription_status: profile?.subscription_status ?? 'free',
      onboarding_complete: profile?.onboarding_complete ?? false,
      diagnostic_complete: profile?.diagnostic_complete ?? false,
      updated_at: profile?.updated_at ?? new Date().toISOString(),
    } as User,
    {},
  );
}

let authListenerInitialized = false;

function ensureAuthListener() {
  if (authListenerInitialized) return;
  authListenerInitialized = true;

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
      await persistSessionAccessToken(session?.access_token ?? null);
      return;
    }

    if (event === 'SIGNED_OUT') {
      await useAuthStore.getState().handleSessionExpired();
    }
  });
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  shouldShowWelcome: false,

  initialize: async () => {
    try {
      const userRaw = await SecureStore.getItemAsync('auth_user');
      ensureAuthListener();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        const cachedUser = userRaw ? (JSON.parse(userRaw) as User) : null;
        await clearPersistedAuth(cachedUser?.id);
        set({ user: null, isAuthenticated: false, shouldShowWelcome: false });
        return;
      }

      await syncStoredAccessToken();

      const {
        data: { user: sbUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !sbUser) {
        const cachedUser = userRaw ? (JSON.parse(userRaw) as User) : null;
        await clearPersistedAuth(cachedUser?.id);
        await supabase.auth.signOut();
        set({ user: null, isAuthenticated: false, shouldShowWelcome: false });
        return;
      }

      const combinedUser = await fetchCombinedUser(sbUser);
      await ensureUserProfileRecord(combinedUser);
      await persistUser(combinedUser);
      await AsyncStorage.setItem(CACHE_KEYS.userProfile(combinedUser.id), JSON.stringify(combinedUser));
      set({ user: combinedUser, isAuthenticated: true, shouldShowWelcome: true });
    } catch (error) {
      console.error('[AuthStore] Initialization failed:', error);
      const cachedUserRaw = await SecureStore.getItemAsync('auth_user');
      const cachedUser = cachedUserRaw ? (JSON.parse(cachedUserRaw) as User) : null;
      await clearPersistedAuth(cachedUser?.id);
      set({ user: null, isAuthenticated: false, shouldShowWelcome: false });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    usePlanStore.getState().reset();
    useSessionStore.getState().clear();

    const { data } = await apiClient.post(ENDPOINTS.authLogin, { email, password });

    if (!data.access_token || !data.refresh_token) {
      throw new Error('No refreshable session received from backend');
    }

    await applyBackendSession(data.access_token, data.refresh_token);

    const {
      data: { user: sbUser },
      error: sbError,
    } = await supabase.auth.getUser();

    if (sbError || !sbUser) {
      throw new Error(sbError?.message || 'Failed to restore user session from Supabase');
    }

    const combinedUser = await fetchCombinedUser(sbUser);
    await ensureUserProfileRecord(combinedUser);

    await persistUser(combinedUser);
    await AsyncStorage.setItem(CACHE_KEYS.userProfile(combinedUser.id), JSON.stringify(combinedUser));
    set({ user: combinedUser, isAuthenticated: true, shouldShowWelcome: true });
  },

  signup: async (email, password) => {
    usePlanStore.getState().reset();
    useSessionStore.getState().clear();

    const { data } = await apiClient.post(ENDPOINTS.authSignup, { email, password });

    if (!data.access_token || !data.refresh_token) {
      throw new Error('No refreshable session received from backend during signup');
    }

    await applyBackendSession(data.access_token, data.refresh_token);

    const {
      data: { user: sbUser },
      error: sbError,
    } = await supabase.auth.getUser();

    if (sbError || !sbUser) {
      throw new Error(sbError?.message || 'Failed to restore user session from Supabase after signup');
    }

    const newUser: User = {
      id: sbUser.id,
      email: sbUser.email!,
      display_name: '',
      speaking_goals: [],
      interest_areas: [],
      identity: null,
      work_domain: null,
      speaking_goal: null,
      practice_frequency: null,
      speaker_level: null,
      subscription_status: 'free',
      subscription_plan: null,
      subscription_start: null,
      subscription_end: null,
      onboarding_complete: false,
      diagnostic_complete: false,
      updated_at: new Date().toISOString(),
    };

    await ensureUserProfileRecord(newUser);
    await persistUser(newUser);
    await AsyncStorage.setItem(CACHE_KEYS.userProfile(newUser.id), JSON.stringify(newUser));
    set({ user: newUser, isAuthenticated: true, shouldShowWelcome: true });
  },

  consumeWelcome: () => {
    set({ shouldShowWelcome: false });
  },

  updateDisplayName: async (name) => {
    const { user } = get();
    if (!user) throw new Error('No user logged in');

    await safeUpsertProfile(user.id, { display_name: name });

    const updatedUser = { ...user, display_name: name };
    await persistUser(updatedUser);
    await AsyncStorage.setItem(CACHE_KEYS.userProfile(user.id), JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  updatePersonalizationProfile: async (profile) => {
    const { user } = get();
    if (!user) throw new Error('No user logged in');

    await syncProfileToBackend(user.id, {
      identity: profile.identity,
      work_domain: profile.work_domain,
      interest_areas: profile.interest_areas,
      speaking_goal: profile.speaking_goal,
      practice_frequency: profile.practice_frequency,
    });

    const updatedUser = {
      ...user,
      ...profile,
      onboarding_complete: true,
    };

    await persistUser(updatedUser);
    await AsyncStorage.setItem(CACHE_KEYS.userProfile(user.id), JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  setSpeakerLevel: async (speakerLevel) => {
    const { user } = get();
    if (!user) throw new Error('No user logged in');

    await syncProfileToBackend(user.id, { speaker_level: speakerLevel });

    const updatedUser = { ...user, speaker_level: speakerLevel };
    await persistUser(updatedUser);
    await AsyncStorage.setItem(CACHE_KEYS.userProfile(user.id), JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  markDiagnosticComplete: async () => {
    const { user } = get();
    if (!user) throw new Error('No user logged in');

    await syncProfileToBackend(user.id, { diagnostic_complete: true });

    const updatedUser = { ...user, diagnostic_complete: true };
    await persistUser(updatedUser);
    await AsyncStorage.setItem(CACHE_KEYS.userProfile(user.id), JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  activateSubscription: async (plan) => {
    const { user } = get();
    if (!user) throw new Error('No user logged in');

    const { data } = await apiClient.post(ENDPOINTS.subscriptionActivate, {
      user_id: user.id,
      plan,
      payment_reference: `frontend_${plan}_${Date.now()}`,
    });

    const updatedUser = mergeSubscriptionState(user, {
      subscription_status: data?.status ?? 'active',
      subscription_plan: data?.plan ?? plan,
      subscription_end: data?.subscription_end ?? null,
      subscription_start: user.subscription_start ?? new Date().toISOString(),
    });

    await persistUser(updatedUser);
    await AsyncStorage.setItem(CACHE_KEYS.subscription(user.id), JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },

  refreshSubscriptionStatus: async () => {
    const { user } = get();
    if (!user) return;

    let updatedUser = user;
    try {
      updatedUser = await syncSubscriptionStatusFromBackend(user);
    } catch (error) {
      console.warn('[AuthStore] Subscription status endpoint unavailable, using cached status.');
      updatedUser = mergeSubscriptionState(user, {});
    }

    if (
      updatedUser.subscription_status !== user.subscription_status ||
      updatedUser.subscription_end !== user.subscription_end ||
      updatedUser.subscription_plan !== user.subscription_plan
    ) {
      await persistUser(updatedUser);
      await AsyncStorage.setItem(CACHE_KEYS.subscription(user.id), JSON.stringify(updatedUser));
      set({ user: updatedUser });
    }
  },

  logout: async () => {
    const { user } = get();
    await clearPersistedAuth(user?.id);
    await supabase.auth.signOut();

    set({ user: null, isAuthenticated: false, shouldShowWelcome: false });
  },

  handleSessionExpired: async () => {
    const { user } = get();
    await clearPersistedAuth(user?.id);
    set({ user: null, isAuthenticated: false, isLoading: false, shouldShowWelcome: false });
  },
}));

registerUnauthorizedHandler(async () => {
  await useAuthStore.getState().handleSessionExpired();
});
