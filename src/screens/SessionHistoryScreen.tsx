import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, fonts, fontSize, radius, spacing } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { useSessionHistory } from '../hooks/useSessionHistory';
import { useAuthStore } from '../store/authStore';
import { SessionListItem } from '../components/history/SessionListItem';
import { SessionListHeader } from '../components/history/SessionListHeader';
import { syncSessionsFromCloud, deleteSession } from '../cache/sessionCache';
import { SessionListEntry } from '../types/cache';

type HistoryNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SessionHistory'>;

const DECK_OVERLAP = 124;

const SessionHistoryScreen = () => {
  const navigation = useNavigation<HistoryNavigationProp>();
  const { user } = useAuthStore();
  const { sessions, loading, refresh } = useSessionHistory();
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const hasPlayedEntranceRef = useRef(false);
  const shouldAnimateEntrance = sessions.length > 1 && !hasPlayedEntranceRef.current;

  useEffect(() => {
    if (sessions.length === 0) {
      setExpandedSessionId(null);
      return;
    }

    setExpandedSessionId((current) => {
      if (current && sessions.some((session) => session.sessionId === current)) {
        return current;
      }
      return sessions[0].sessionId;
    });

    if (sessions.length > 1 && !hasPlayedEntranceRef.current) {
      hasPlayedEntranceRef.current = true;
    }
  }, [sessions]);

  const handleSync = async () => {
    if (!user?.id) return;

    setIsSyncing(true);
    try {
      const count = await syncSessionsFromCloud(user.id);
      if (count > 0) {
        Alert.alert('Sync Complete', `Updated ${count} session${count === 1 ? '' : 's'} from your account.`);
        refresh();
      } else {
        Alert.alert('Up to Date', 'All sessions are already synced to your device.');
      }
    } catch {
      Alert.alert('Sync Failed', 'Could not reach the analysis server. Please try again later.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = (sessionId: string) => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to permanently delete this session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSession(user!.id, sessionId);
              if (expandedSessionId === sessionId) {
                setExpandedSessionId(null);
              }
              refresh();
            } catch {
              Alert.alert('Error', 'Failed to delete session. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleCardPress = useCallback(
    (sessionId: string) => {
      if (expandedSessionId === sessionId) {
        navigation.navigate('SessionDetail', { sessionId });
        return;
      }

      setExpandedSessionId(sessionId);
    },
    [expandedSessionId, navigation]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: SessionListEntry; index: number }) => (
      <View style={[styles.cardSlot, index > 0 && styles.overlapSlot]}>
        <SessionListItem
          entry={item}
          index={index}
          expanded={expandedSessionId === item.sessionId}
          totalCount={sessions.length}
          hasEntranceAnimation={shouldAnimateEntrance}
          onPress={() => handleCardPress(item.sessionId)}
          onDelete={() => handleDelete(item.sessionId)}
        />
      </View>
    ),
    [expandedSessionId, handleCardPress, sessions.length, shouldAnimateEntrance]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons name="history-edu" size={36} color="#C9D9BC" />
      </View>
      <Text style={styles.emptyTitle}>No sessions yet.</Text>
      <Text style={styles.emptySubtitle}>
        Your completed speaking sessions will stack here once you finish the first review.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <SessionListHeader
        count={sessions.length}
        onBack={() => navigation.goBack()}
        onSync={handleSync}
        isSyncing={isSyncing}
      />

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.sessionId}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#DCE9CF" size="large" />
              <Text style={styles.loadingText}>Loading your session deck...</Text>
            </View>
          ) : renderEmpty()
        }
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor="#DCE9CF"
          />
        }
        contentContainerStyle={[
          styles.listContent,
          sessions.length === 0 && styles.emptyContent,
        ]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing['4xl'],
  },
  emptyContent: {
    flexGrow: 1,
  },
  cardSlot: {
    zIndex: 1,
  },
  overlapSlot: {
    marginTop: -DECK_OVERLAP,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.lg,
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    color: colors.textPrimary,
    fontSize: fontSize['2xl'],
    fontFamily: fonts.bold,
  },
  emptySubtitle: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 24,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
});

export default SessionHistoryScreen;
