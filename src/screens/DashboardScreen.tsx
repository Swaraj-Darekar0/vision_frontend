import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Modal, TouchableWithoutFeedback, Platform } from 'react-native';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, fontSize, spacing, radius } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { PerformanceGrid } from '../components/dashboard/PerformanceGrid';
import { StreakSection } from '../components/dashboard/StreakSection';
import { AdaptiveTopicCard } from '../components/dashboard/AdaptiveTopicCard';
import { QuoteCard } from '../components/dashboard/QuoteCard';
import { NameInputModal } from '../components/ui/NameInputModal';
import { StreakMilestoneTip } from '../components/dashboard/StreakMilestoneTip';
import { PendingQueueBanner } from '../components/dashboard/PendingQueueBanner';
import { getRecentSessions, getSessionDetail, syncSessionsFromCloud } from '../cache/sessionCache';
import { SessionListEntry } from '../types/cache';
import { useAuthStore } from '../store/authStore';
import { useStreakStore } from '../store/streakStore';
import { usePlanStore } from '../store/planStore';
import { useSessionStore } from '../store/sessionStore';
import { CACHE_KEYS } from '../cache/cacheKeys';

type DashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

const DashboardScreen = () => {
  const navigation = useNavigation<DashboardNavigationProp>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { user, updateDisplayName, logout, refreshSubscriptionStatus } = useAuthStore();
  const { sessions, milestoneTip, milestoneTipSkill, refresh, dismissMilestoneTip } = useStreakStore();
  const { currentPlan, hydratePlanFromCache, ensurePlan, createWeeklyReview } = usePlanStore();
  const { latestSessionSummary, setLatestSessionSummary, setLatestResult, setRecordingMeta } = useSessionStore();

  const [latestSession, setLatestSession] = useState<SessionListEntry | null>(latestSessionSummary);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const todayIndex = Math.min(dayjs().day() === 0 ? 7 : dayjs().day(), 7);
  const todaySessions = useMemo(
    () =>
      currentPlan?.topics
        .filter((topic) => topic.day === todayIndex)
        .sort((a, b) => a.session - b.session) ?? [],
    [currentPlan, todayIndex],
  );
  const dailySessionTarget = useMemo(() => {
    if (!currentPlan) return 0;
    const plannedCount = todaySessions.length || currentPlan.sessions_per_day || 0;
    return Math.min(plannedCount, 3);
  }, [currentPlan, todaySessions.length]);
  const completedTodayCount = useMemo(
    () => todaySessions.filter((topic) => topic.completed).length,
    [todaySessions],
  );
  const remainingTodayCount = Math.max(dailySessionTarget - completedTodayCount, 0);
  const dailyLimitReached = dailySessionTarget > 0 && remainingTodayCount === 0;
  const totalAllocatedSessions = useMemo(() => {
    if (currentPlan?.topics?.length) {
      return currentPlan.topics.length;
    }

    if (currentPlan?.sessions_per_day) {
      return currentPlan.sessions_per_day * 7;
    }

    return 8;
  }, [currentPlan]);
  const fallbackTopic = useMemo(
    () =>
      currentPlan?.topics
        ?.filter((topic) => !topic.completed)
        .sort((a, b) => (a.day - b.day) || (a.session - b.session))[0] ?? null,
    [currentPlan],
  );

  const todayTopic = useMemo(() => {
    if (!currentPlan || dailyLimitReached) return null;
    return todaySessions.find((topic) => !topic.completed) || fallbackTopic;
  }, [currentPlan, dailyLimitReached, fallbackTopic, todaySessions]);

  useEffect(() => {
    if (user && !user.display_name) {
      setShowNameModal(true);
    }
  }, [user]);

  useEffect(() => {
    setLatestSession(latestSessionSummary);
  }, [latestSessionSummary]);

  useEffect(() => {
    if (!user) return;

    void hydratePlanFromCache(user.id);
    void refreshSubscriptionStatus();

    if (!user.diagnostic_complete) {
      navigation.navigate('DiagnosticEntry');
      return;
    }

    if (!user.onboarding_complete) {
      navigation.navigate('PersonalizationOnboarding');
      return;
    }

    if (
      user.subscription_status === 'active' &&
      user.speaker_level
    ) {
      void ensurePlan({
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
    }
  }, [
    ensurePlan,
    hydratePlanFromCache,
    navigation,
    refreshSubscriptionStatus,
    user,
  ]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected ?? false;

      if (isConnected && wasOffline && user?.id) {
        syncSessionsFromCloud(user.id)
          .then(() => {
            refresh(user.id);
          })
          .catch((err) => {
            console.error('[Dashboard] Auto-sync failed:', err);
          });
      }

      setWasOffline(!isConnected);
    });

    return unsubscribe;
  }, [refresh, user?.id, wasOffline]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        syncSessionsFromCloud(user.id)
          .then(() => {
            refresh(user.id);
          })
          .catch((err) => {
            console.error('[Dashboard] Sync failed:', err);
            refresh(user.id);
          });
      }

      const loadData = async () => {
        if (!user?.id) return;
        const currentSessions = await getRecentSessions(user.id, 8);
        if (currentSessions.length > 0) {
          const latest = currentSessions[0];
          setLatestSession(latest);
          setLatestSessionSummary(latest);
        } else {
          setLatestSession(null);
          setLatestSessionSummary(null);
        }

        if (user.subscription_status === 'active' && currentPlan) {
          const isSunday = dayjs().day() === 0;
          const reviewSeenRaw = await AsyncStorage.getItem(CACHE_KEYS.lastReviewWeek(user.id));
          const reviewSeenWeek = reviewSeenRaw ? Number(reviewSeenRaw) : 0;

          if (isSunday && reviewSeenWeek < currentPlan.week_number) {
            const review = await createWeeklyReview(user.id, currentPlan);
            await AsyncStorage.setItem(CACHE_KEYS.lastReviewWeek(user.id), String(review.week_number));
            navigation.navigate('WeeklyReview', { weekNumber: review.week_number });
          }
        }
      };

      void loadData();
    }, [createWeeklyReview, currentPlan, navigation, refresh, setLatestSessionSummary, user?.id, user?.subscription_status])
  );

  const handleNameSubmit = async (name: string) => {
    await updateDisplayName(name);
    setShowNameModal(false);
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
  };

  const handleGetGoing = async () => {
    if (!user) return;

    if (!user.diagnostic_complete) {
      if (latestSession?.isFirstSession) {
        const diagnosticResult = await getSessionDetail(user.id, latestSession.sessionId);
        if (diagnosticResult) {
          setLatestResult(diagnosticResult, latestSession.localVideoUri ?? null);
          setRecordingMeta(0, latestSession.topicTitle, { isDiagnostic: true });
          navigation.navigate('PostAssessment');
          return;
        }
      }

      navigation.navigate('DiagnosticEntry');
      return;
    }

    if (!user.onboarding_complete) {
      navigation.navigate('PersonalizationOnboarding');
      return;
    }

    if (user.subscription_status !== 'active') {
      navigation.navigate('Paywall', { source: 'dashboard' });
    }
  };

  const shouldResumeFlow =
    !!user &&
    (!user.diagnostic_complete || !user.onboarding_complete || user.subscription_status !== 'active');

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, spacing.md) + spacing.sm }]}>
        <View>
          
          
        </View>
        <TouchableOpacity
          onPress={() => setShowProfileMenu(true)}
          style={styles.profileButton}
          accessibilityRole="button"
          accessibilityLabel="Open profile menu"
        >
          <MaterialIcons name="account-circle" size={32} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {milestoneTip && milestoneTipSkill && (
          <StreakMilestoneTip
            tip={milestoneTip}
            skill={milestoneTipSkill}
            onDismiss={dismissMilestoneTip}
          />
        )}

        <PendingQueueBanner />

        <PerformanceGrid
          isActive={isFocused}
          overallScore={latestSession?.overallScore}
          confidenceScore={latestSession?.confidenceScore}
          clarityScore={latestSession?.clarityScore}
          engagementScore={latestSession?.engagementScore}
          nervousnessScore={latestSession?.nervousnessScore}
        />

        <StreakSection
          sessions={sessions}
          totalAllocatedSessions={totalAllocatedSessions}
          onPress={() => navigation.navigate('SessionHistory')}
        />

        <QuoteCard />
        {currentPlan && dailySessionTarget > 0 && (
          <View style={styles.dailyGoalCard}>
            <Text style={styles.dailyGoalText}>
              complete {dailySessionTarget} sessions by today ({remainingTodayCount} remaining)
            </Text>
          </View>
        )}

        <AdaptiveTopicCard
          topic={todayTopic}
          locked={shouldResumeFlow || dailyLimitReached}
          lockedTitle={
            !user?.diagnostic_complete
              ? 'Complete your diagnostic to continue'
              : !user?.onboarding_complete
              ? 'Continue onboarding to unlock your plan'
              : user?.subscription_status !== 'active'
              ? 'Unlock your plan to begin'
              : "that's it for today, let carry the will tomorrow"
          }
          lockedMessage={
            shouldResumeFlow
              ? undefined
              : 'You have completed all assigned sessions for today.'
          }
          actionLabel={
            shouldResumeFlow
              ? 'Get Going'
              : dailyLimitReached
              ? 'Locked for Today'
              : 'Start Session'
          }
          disableAction={shouldResumeFlow ? false : dailyLimitReached || !todayTopic}
          onUnlock={() => void handleGetGoing()}
          onStart={() => {
            if (!todayTopic || dailyLimitReached) return;
            navigation.navigate('Recording', {
              topicTitle: todayTopic.topic_title,
              minDurationSeconds: Math.max(60, todayTopic.duration_minutes * 60),
              planDay: todayTopic.day,
              planSession: todayTopic.session,
              targetSkill: todayTopic.target_skill,
              weekNumber: currentPlan?.week_number,
            });
          }}
        />
      </ScrollView>

      <NameInputModal visible={showNameModal} onSubmit={handleNameSubmit} />

      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowProfileMenu(false)}>
          <View style={styles.menuOverlay}>
            <View style={styles.menuContainer}>
              <Text style={styles.menuName} numberOfLines={1}>
                {user?.display_name || user?.email || 'User'}
              </Text>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <MaterialIcons name="logout" size={20} color={colors.recordingRed} />
                <Text style={styles.menuItemText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  scrollContent: {
    padding: spacing.base,
    paddingTop: 0,
    minHeight: '100%',
  },
  title: {
    color: colors.dashboardTextPrimary,
    fontSize: fontSize['3xl'],
    fontFamily: fonts.bold,
  },
  subtitle: {
    color: colors.dashboardTextSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    marginTop: spacing.xs,
  },
  profileButton: {
    padding: spacing.sm,
    alignSelf: 'flex-start',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: spacing.base,
  },
  menuContainer: {
    backgroundColor: colors.dashboardSurfaceOverlay,
    borderRadius: radius.md,
    padding: spacing.md,
    minWidth: 180,
    borderWidth: 1,
    borderColor: colors.dashboardBorderSoft,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuName: {
    color: colors.dashboardTextPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
    marginBottom: spacing.sm,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.dashboardBorderFaint,
    marginVertical: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  menuItemText: {
    color: colors.recordingRed,
    fontSize: fontSize.md,
    fontFamily: fonts.medium,
    marginLeft: spacing.sm,
  },
  modelInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dashboardSurfaceBase,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dashboardBorderFaint,
  },
  modelInfoText: {
    color: colors.dashboardTextSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    flex: 1,
  },
  dailyGoalCard: {
    backgroundColor: colors.dashboardSurfaceBase,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dashboardBorderFaint,
  },
  dailyGoalText: {
    color: colors.dashboardTextSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.semiBold,
    textAlign: 'center',
  },
});

export default DashboardScreen;
