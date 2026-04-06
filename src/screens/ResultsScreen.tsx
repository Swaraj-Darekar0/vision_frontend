import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import dayjs from 'dayjs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, fontSize, spacing, radius } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { useSessionStore } from '../store/sessionStore';
import { ResultsView } from '../components/ui/ResultsView';
import { SessionActivityCard } from '../components/ui/SessionActivityCard';
import { formatDurationLabel } from '../utils/formatTime';
import { captureAndShareCard } from '../utils/shareCard';
import { usePlanStore } from '../store/planStore';
import { useAuthStore } from '../store/authStore';

type ResultsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Results'>;

const ResultsScreen = () => {
  const navigation = useNavigation<ResultsScreenNavigationProp>();
  const { latestResult, elapsedSeconds, topicTitle, localVideoUri, clear, planDay, planSession } = useSessionStore();
  const { user } = useAuthStore();
  const { markTopicComplete } = usePlanStore();
  const insets = useSafeAreaInsets();
  
  const cardRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);

  React.useEffect(() => {
    if (!user?.id || !latestResult || !planDay || !planSession) return;

    void markTopicComplete(user.id, {
      day: planDay,
      session: planSession,
      sessionId: latestResult.session_metadata.session_id,
    });
  }, [latestResult, markTopicComplete, planDay, planSession, user?.id]);

  if (!latestResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No results available.</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.popToTop()}
          >
            <Text style={styles.backButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleFinish = () => {
    clear();
    navigation.popToTop();
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await captureAndShareCard(cardRef as any, topicTitle || 'My Session');
    } catch (err) {
      console.error('[Share]', err);
    } finally {
      setIsSharing(false);
    }
  };

  const sessionDate = dayjs(latestResult.session_metadata.processed_at).format('MMMM D, YYYY');
  const durationLabel = formatDurationLabel(elapsedSeconds);

  return (
    <SafeAreaView style={styles.container}>
      {/* Off-screen card for capture — invisible to user */}
      <View style={styles.offscreenContainer} pointerEvents="none">
        <ViewShot ref={cardRef} options={{ format: 'png', quality: 1.0 }}>
          <SessionActivityCard
            result={latestResult}
            topicTitle={topicTitle || 'My Session'}
            durationLabel={durationLabel}
            sessionDate={sessionDate}
          />
        </ViewShot>
      </View>

      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) + spacing.xs }]}>
        <TouchableOpacity onPress={handleFinish} style={styles.headerIcon}>
          <MaterialIcons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Results</Text>
        <TouchableOpacity 
          onPress={handleShare} 
          style={styles.headerIcon}
          disabled={isSharing}
        >
          {isSharing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialIcons name="share" size={24} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
      
      <ResultsView 
        result={latestResult} 
        sessionDurationLabel={durationLabel}
        localVideoUri={localVideoUri}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
          <Text style={styles.finishButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  offscreenContainer: {
    position: 'absolute',
    top: -2000,
    left: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
  },
  headerIcon: {
    padding: spacing.xs,
    minWidth: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    marginBottom: spacing.xl,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  backButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
  },
  footer: {
    padding: spacing.base,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  finishButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  finishButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
  },
});

export default ResultsScreen;
