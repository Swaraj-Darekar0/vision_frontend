import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
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
  title:              'Leadership Under Pressure',
  durationHint:       'Duration: 1 minute minimum',
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
    // Check for missing display name on mount
    if (user && !user.display_name) {
      setShowNameModal(true);
    }
  }, [user]);

  useEffect(() => {
    // Listen for network connectivity changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;
      
      if (isConnected && wasOffline && user?.id) {
        // Just came back online, sync sessions from cloud
        syncSessionsFromCloud(user.id).then(() => {
          refresh(user.id);
        }).catch((err) => {
          console.error('[Dashboard] Auto-sync failed:', err);
        });
      }
      
      setWasOffline(!isConnected);
    });

    return unsubscribe;
  }, [user?.id, wasOffline, refresh]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        // Sync from cloud and refresh streak data
        syncSessionsFromCloud(user.id).then(() => {
          refresh(user.id);
        }).catch((err) => {
          console.error('[Dashboard] Sync failed:', err);
          // Still refresh with local data
          refresh(user.id);
        });
      }
      
      const loadData = async () => {
        if (!user?.id) return;
        const currentSessions = await getRecentSessions(user.id, 8);
        if (currentSessions.length > 0) {
          const latest = currentSessions[0];
          setLatestSession(latest);

          // Fetch suggested topic from latest session detail
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

      loadData();
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
      {/* Header with Profile Icon */}
      
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

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

        <StreakSection 
          sessions={sessions} 
          onPress={() => navigation.navigate('SessionHistory')} 
        />

        <QuoteCard />

        <TopicCard
          title={todayTopic.title}
          durationHint={todayTopic.durationHint}
          onStart={() => navigation.navigate('Recording', {
            topicTitle:         todayTopic.title,
            minDurationSeconds: todayTopic.minDurationSeconds,
          })}
        />
      </ScrollView>

      {/* Name Input Modal */}
      <NameInputModal 
        visible={showNameModal} 
        onSubmit={handleNameSubmit} 
      />

      {/* Profile Menu Modal */}
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
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={handleLogout}
              >
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
  spacer: {
    flex: 1,
    minHeight: spacing.xl,
  },
  
  // Menu Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60, // Adjust based on header height
    paddingRight: spacing.base,
  },
  menuContainer: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    minWidth: 180,
    shadowColor: "#000",
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
    color: colors.recordingRed, // Use red for logout
    fontSize: fontSize.md,
    fontFamily: fonts.medium,
    marginLeft: spacing.sm,
  },
});

export default DashboardScreen;
