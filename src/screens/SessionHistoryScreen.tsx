import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import { colors, fonts, fontSize, spacing } from '../theme';
import { RootStackParamList } from '../types/navigation';
import { useSessionHistory } from '../hooks/useSessionHistory';
import { useAuthStore } from '../store/authStore';
import { SessionListItem } from '../components/history/SessionListItem';
import { SessionListHeader } from '../components/history/SessionListHeader';
import { syncSessionsFromCloud, deleteSession } from '../cache/sessionCache';

type HistoryNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SessionHistory'>;

const SessionHistoryScreen = () => {
  const navigation = useNavigation<HistoryNavigationProp>();
  const { user } = useAuthStore();
  const { sessions, loading, refresh } = useSessionHistory();
  const [isSyncing, setIsSyncing] = useState(false);

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
    } catch (error: any) {
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
              refresh();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete session. Please try again.');
            }
          }
        },
      ]
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="history" size={64} color={colors.surfaceElevated} />
      <Text style={styles.emptyTitle}>No sessions yet.</Text>
      <Text style={styles.emptySubtitle}>
        Complete your first presentation to see history here.
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
        renderItem={({ item }) => (
          <SessionListItem
            entry={item}
            onPress={() => navigation.navigate('SessionDetail', { sessionId: item.sessionId })}
            onDelete={() => handleDelete(item.sessionId)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : renderEmpty()
        }
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          sessions.length === 0 && { flex: 1 }
        ]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: spacing['4xl'],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default SessionHistoryScreen;
