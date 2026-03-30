import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Modal, TouchableWithoutFeedback, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

import { colors, fonts, fontSize, spacing, radius } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { PerformanceGrid } from '../components/dashboard/PerformanceGrid';
import { StreakSection } from '../components/dashboard/StreakSection';
import { TopicCard } from '../components/dashboard/TopicCard';
import { QuoteCard } from '../components/dashboard/QuoteCard';
import { NameInputModal } from '../components/ui/NameInputModal';
import { StreakMilestoneTip } from '../components/dashboard/StreakMilestoneTip';
import { PendingQueueBanner } from '../components/dashboard/PendingQueueBanner';
import { getRecentSessions, getSessionDetail, syncSessionsFromCloud } from '../cache/sessionCache';
import { SessionListEntry } from '../types/cache';
import { useAuthStore } from '../store/authStore';
import { useStreakStore } from '../store/streakStore';

type DashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

const DEFAULT_TOPIC = {
  title: 'Leadership Under Pressure',
  durationHint: 'Duration: 1 minute minimum',
  minDurationSeconds: 60,
};

const DashboardScreen = () => {
  const navigation = useNavigation<DashboardNavigationProp>();
  const { user, updateDisplayName, logout } = useAuthStore();
  const { sessions, milestoneTip, milestoneTipSkill, refresh, dismissMilestoneTip } = useStreakStore();

  const [latestSession, setLatestSession] = useState<SessionListEntry | null>(null);
  const [todayTopic, setTodayTopic] = useState(DEFAULT_TOPIC);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (user && !user.display_name) {
      setShowNameModal(true);
    }
  }, [user]);

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

          try {
            const detail = await getSessionDetail(user.id, latest.sessionId);
            if (detail?.llm_feedback?.suggest_next_presentation_topics) {
              const topics = detail.llm_feedback.suggest_next_presentation_topics;
              const topicTitle = Array.isArray(topics) ? topics[0] : topics;
              setTodayTopic({
                title: topicTitle,
                durationHint: 'Duration: 1 minute minimum',
                minDurationSeconds: 60,
              });
            } else {
              setTodayTopic(DEFAULT_TOPIC);
            }
          } catch (error) {
            console.error('[Dashboard] Failed to load session detail for suggested topics:', error);
            setTodayTopic(DEFAULT_TOPIC);
          }
        } else {
          setLatestSession(null);
          setTodayTopic(DEFAULT_TOPIC);
        }
      };

      void loadData();
    }, [refresh, user?.id])
  );

  const handleNameSubmit = async (name: string) => {
    await updateDisplayName(name);
    setShowNameModal(false);
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Overview</Text>
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
          overallScore={latestSession?.overallScore}
          confidenceScore={latestSession?.confidenceScore}
        />

        <StreakSection sessions={sessions} onPress={() => navigation.navigate('SessionHistory')} />

        <QuoteCard />

        <View style={styles.modelInfoContainer}>
          <MaterialIcons name="bolt" size={18} color={colors.primary} />
          <Text style={styles.modelInfoText}>
            {Platform.OS === 'android'
              ? 'Android build uses native ML Kit pose capture in real time.'
              : 'Real-time pose capture is currently enabled on Android builds.'}
          </Text>
        </View>

        <TopicCard
          title={todayTopic.title}
          durationHint={todayTopic.durationHint}
          onStart={() =>
            navigation.navigate('Recording', {
              topicTitle: todayTopic.title,
              minDurationSeconds: todayTopic.minDurationSeconds,
            })
          }
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
    backgroundColor: colors.backgroundDark,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.base,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  scrollContent: {
    padding: spacing.base,
    paddingTop: 0,
    minHeight: '100%',
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize['3xl'],
    fontFamily: fonts.bold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    marginTop: spacing.xs,
  },
  profileButton: {
    padding: spacing.xs,
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
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    minWidth: 180,
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
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
    marginBottom: spacing.sm,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.borderDark,
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
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  modelInfoText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontFamily: fonts.medium,
    flex: 1,
  },
});

export default DashboardScreen;
