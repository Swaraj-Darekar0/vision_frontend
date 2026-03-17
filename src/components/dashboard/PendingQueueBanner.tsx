// src/components/dashboard/PendingQueueBanner.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { getQueueCount } from '../../cache/offlineQueue';
import { drainOfflineQueue } from '../../utils/queueDrain';
import { colors } from '../../theme/colors';
import { fonts, fontSize } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export const PendingQueueBanner: React.FC = () => {
  const [count,    setCount]    = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [draining, setDraining] = useState(false);

  useEffect(() => {
    const refresh = async () => setCount(await getQueueCount());
    refresh();

    const unsub = NetInfo.addEventListener(async (state) => {
      setIsOnline(!!state.isConnected);
      if (state.isConnected) {
        // Came online — drain immediately in foreground
        setDraining(true);
        try {
          await drainOfflineQueue();
        } catch (e) {
          console.error('[PendingQueueBanner] Drain failed:', e);
        } finally {
          await refresh();
          setDraining(false);
        }
      }
    });
    return unsub;
  }, []);

  if (count === 0) return null;

  return (
    <View style={[styles.banner, isOnline ? styles.online : styles.offline]}>
      {draining ? (
        <>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.text}>Uploading {count} queued session{count > 1 ? 's' : ''}…</Text>
        </>
      ) : (
        <>
          <View style={[styles.dot, { backgroundColor: isOnline ? colors.primary : colors.recordingRed }]} />
          <Text style={styles.text}>
            {count} session{count > 1 ? 's' : ''} waiting to upload
          </Text>
          <Text style={styles.hint}>{isOnline ? 'Uploading…' : 'Connect to upload'}</Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: spacing.base,
    borderWidth: 0.5,
  },
  online:  { backgroundColor: 'rgba(17,82,212,0.12)', borderColor: 'rgba(17,82,212,0.3)' },
  offline: { backgroundColor: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.3)' },
  dot:  { width: 8, height: 8, borderRadius: 4 },
  text: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.textSecondary, flex: 1 },
  hint: { fontFamily: fonts.regular, fontSize: fontSize.xs, color: colors.textMuted },
});
