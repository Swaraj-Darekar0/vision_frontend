import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { Easing, FadeIn, FadeOut } from 'react-native-reanimated';

import { fonts } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { useAuthStore } from '../store/authStore';
import { usePlanStore } from '../store/planStore';
import { useSessionStore } from '../store/sessionStore';
import { getRecentSessions, syncSessionsFromCloud } from '../cache/sessionCache';

type WelcomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const WELCOME_DURATION_MS = 2200;

function resolveDisplayName(displayName?: string | null, email?: string | null) {
  if (displayName?.trim()) {
    return displayName.trim();
  }

  if (email?.trim()) {
    const handle = email.split('@')[0]?.trim();
    if (handle) {
      return handle.charAt(0).toUpperCase() + handle.slice(1);
    }
  }

  return 'there';
}

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const consumeWelcome = useAuthStore((state) => state.consumeWelcome);
  const refreshSubscriptionStatus = useAuthStore((state) => state.refreshSubscriptionStatus);
  const hydratePlanFromCache = usePlanStore((state) => state.hydratePlanFromCache);
  const ensurePlan = usePlanStore((state) => state.ensurePlan);
  const setLatestSessionSummary = useSessionStore((state) => state.setLatestSessionSummary);

  const displayName = useMemo(
    () => resolveDisplayName(user?.display_name, user?.email),
    [user?.display_name, user?.email],
  );

  useEffect(() => {
    let isMounted = true;
    let welcomeTimer: ReturnType<typeof setTimeout> | null = null;

    const preloadDashboard = async () => {
      if (!user?.id) {
        return;
      }

      await hydratePlanFromCache(user.id);

      const cachedSessions = await getRecentSessions(user.id, 8);
      if (isMounted) {
        setLatestSessionSummary(cachedSessions[0] ?? null);
      }

      try {
        await refreshSubscriptionStatus();
      } catch (error) {
        console.warn('[Welcome] Failed to refresh subscription status before dashboard:', error);
      }

      if (user.subscription_status === 'active' && user.speaker_level) {
        try {
          await ensurePlan({
            userId: user.id,
            profile: {
              identity: user.identity ?? null,
              work_domain: user.work_domain ?? null,
              interest_areas: user.interest_areas ?? [],
              speaking_goal: user.speaking_goal ?? null,
              practice_frequency: user.practice_frequency ?? null,
            },
            speakerLevel: user.speaker_level,
          });
        } catch (error) {
          console.warn('[Welcome] Failed to ensure weekly plan before dashboard:', error);
        }
      }

      try {
        await syncSessionsFromCloud(user.id);
        const syncedSessions = await getRecentSessions(user.id, 8);
        if (isMounted) {
          setLatestSessionSummary(syncedSessions[0] ?? cachedSessions[0] ?? null);
        }
      } catch (error) {
        console.warn('[Welcome] Session sync failed, using cached dashboard data.', error);
      }
    };

    const holdForWelcome = new Promise<void>((resolve) => {
      welcomeTimer = setTimeout(resolve, WELCOME_DURATION_MS);
    });

    void Promise.all([holdForWelcome, preloadDashboard()]).then(() => {
      if (!isMounted) return;

      navigation.replace('Dashboard');
      requestAnimationFrame(() => {
        consumeWelcome();
      });
    });

    return () => {
      isMounted = false;
      if (welcomeTimer) {
        clearTimeout(welcomeTimer);
      }
    };
  }, [
    consumeWelcome,
    ensurePlan,
    hydratePlanFromCache,
    navigation,
    refreshSubscriptionStatus,
    setLatestSessionSummary,
    user,
  ]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.View
        entering={FadeIn.duration(500).easing(Easing.out(Easing.cubic))}
        exiting={FadeOut.duration(260)}
        style={[styles.copyWrap, { paddingTop: insets.top + 76 }]}
      >
        <Text style={styles.welcomeText}>Welcome,</Text>
        <Text style={styles.nameText}>{displayName}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  copyWrap: {
    paddingHorizontal: 32,
  },
  welcomeText: {
    color: '#F5F7FA',
    fontSize: 34,
    lineHeight: 40,
    fontFamily: fonts.extraBold,
    letterSpacing: -1.3,
  },
  nameText: {
    color: '#F5F7FA',
    fontSize: 34,
    lineHeight: 40,
    fontFamily: fonts.extraBold,
    letterSpacing: -1.3,
  },
});
