import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import dayjs from 'dayjs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, fontSize, spacing, radius } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { getSessionDetail, getSessionList } from '../cache/sessionCache';
import { EvaluationResult } from '../types/api';
import { ResultsView } from '../components/ui/ResultsView';
import { SessionActivityCard } from '../components/ui/SessionActivityCard';
import { formatLongDate } from '../utils/formatDate';
import { captureAndShareCard } from '../utils/shareCard';
import { SessionListEntry } from '../types/cache';
import { useAuthStore } from '../store/authStore';

type DetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SessionDetail'>;
type DetailRouteProp = RouteProp<RootStackParamList, 'SessionDetail'>;

const SessionDetailScreen = () => {
  const navigation = useNavigation<DetailNavigationProp>();
  const route = useRoute<DetailRouteProp>();
  const { sessionId } = route.params;
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [sessionEntry, setSessionEntry] = useState<SessionListEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  const cardRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      setLoading(true);
      const [detailData, listData] = await Promise.all([
        getSessionDetail(user.id, sessionId),
        getSessionList(user.id)
      ]);
      
      if (detailData) {
        setResult(detailData);
        const entry = listData.find(s => s.sessionId === sessionId);
        if (entry) setSessionEntry(entry);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    };

    loadData();
  }, [sessionId]);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await captureAndShareCard(cardRef as any, sessionEntry?.topicTitle || 'My Session');
    } catch (err) {
      console.error('[Share]', err);
    } finally {
      setIsSharing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || !result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.negative} />
          <Text style={styles.errorTitle}>Session not found.</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Back to History</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const sessionDate = dayjs(result.session_metadata.processed_at).format('MMMM D, YYYY');

  return (
    <SafeAreaView style={styles.container}>
      {/* Off-screen card for capture — invisible to user */}
      <View style={styles.offscreenContainer} pointerEvents="none">
        <ViewShot ref={cardRef} options={{ format: 'png', quality: 1.0 }}>
          <SessionActivityCard
            result={result}
            topicTitle={sessionEntry?.topicTitle || 'My Session'}
            durationLabel={sessionEntry?.durationLabel || '--'}
            sessionDate={sessionDate}
          />
        </ViewShot>
      </View>

      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) + spacing.xs }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <MaterialIcons name="chevron-left" size={32} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>{sessionEntry?.topicTitle || 'Session'}</Text>
          <Text style={styles.headerSubtitle}>{formatLongDate(result.session_metadata.processed_at)}</Text>
        </View>
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
        result={result} 
        sessionDurationLabel={sessionEntry?.durationLabel}
        localVideoUri={sessionEntry?.localVideoUri}
      />
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
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  headerContent: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.bold,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
  },
  headerIcon: {
    padding: spacing.xs,
    minWidth: 44,
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.medium,
    marginTop: spacing.lg,
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  backButton: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  backButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
  },
});

export default SessionDetailScreen;
