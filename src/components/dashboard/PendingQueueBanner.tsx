import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {
  getQueueSummary,
  QueueSummary,
  removeNextQueuedSession,
  resetUploadingQueueEntries,
} from '../../cache/offlineQueue';
import { drainNextOfflineSession, QueueDrainResult } from '../../utils/queueDrain';
import { colors } from '../../theme/colors';
import { fonts, fontSize } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export const PendingQueueBanner: React.FC = () => {
  const [summary, setSummary] = useState<QueueSummary>({
    total: 0,
    pending: 0,
    uploading: 0,
    failed: 0,
  });
  const [isOnline, setIsOnline] = useState(true);
  const [draining, setDraining] = useState(false);
  const [lastResult, setLastResult] = useState<QueueDrainResult | null>(null);

  useEffect(() => {
    const refresh = async () => {
      await resetUploadingQueueEntries();
      setSummary(await getQueueSummary());
    };

    void refresh();

    const unsubscribe = NetInfo.addEventListener(async (state) => {
      setIsOnline(!!state.isConnected);
      await refresh();
    });

    return unsubscribe;
  }, []);

  const refreshSummary = async () => {
    setSummary(await getQueueSummary());
  };

  const handleDrainNext = async () => {
    setDraining(true);
    try {
      const result = await drainNextOfflineSession();
      setLastResult(result);
    } finally {
      await refreshSummary();
      setDraining(false);
    }
  };

  const handleRemoveNext = () => {
    Alert.alert(
      'Remove queued session?',
      'This will delete the next offline session from the queue and remove its local files.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeNextQueuedSession();
            setLastResult(null);
            await refreshSummary();
          },
        },
      ],
    );
  };

  if (summary.total === 0) return null;

  const canDrainNext = isOnline && !draining && summary.pending > 0 && summary.uploading === 0;
  const canRemoveNext = !draining && summary.uploading === 0 && summary.total > 0;

  const statusText = (() => {
    if (draining || summary.uploading > 0) return 'Uploading one prepared session...';
    if (!isOnline) return 'Prepared locally, waiting for connection before sending the next session.';
    if (summary.pending > 0) return `${summary.pending} prepared session${summary.pending > 1 ? 's are' : ' is'} ready to upload.`;
    if (summary.failed > 0) return 'Some sessions failed all retry attempts.';
    if (lastResult === 'uploaded') return 'Last prepared session uploaded successfully.';
    if (lastResult === 'failed') return 'Last queued session failed. Try again later.';
    if (lastResult === 'unauthenticated') return 'Please log in again before draining the queue.';
    return 'Queue is up to date.';
  })();

  const buttonLabel = draining ? 'Uploading...' : 'Upload Next Session';

  return (
    <View style={[styles.banner, isOnline ? styles.online : styles.offline]}>
      <View style={styles.textBlock}>
        <View style={[styles.dot, { backgroundColor: isOnline ? colors.primary : colors.recordingRed }]} />
        <View style={styles.copy}>
          <Text style={styles.text}>
            {summary.total} session{summary.total > 1 ? 's are' : ' is'} prepared and waiting in offline queue
          </Text>
          <Text style={styles.hint}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.removeButton, !canRemoveNext && styles.buttonDisabled]}
          onPress={handleRemoveNext}
          disabled={!canRemoveNext}
        >
          <Text style={styles.buttonText}>Remove Next Session</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.uploadButton, !canDrainNext && styles.buttonDisabled]}
          onPress={() => void handleDrainNext()}
          disabled={!canDrainNext}
        >
          {draining ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    padding: spacing.base,
    borderRadius: 12,
    marginBottom: spacing.base,
    borderWidth: 0.5,
    gap: spacing.md,
  },
  online: {
    backgroundColor: 'rgba(17,82,212,0.12)',
    borderColor: 'rgba(17,82,212,0.3)',
  },
  offline: {
    backgroundColor: 'rgba(245,158,11,0.10)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  textBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  copy: {
    flex: 1,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  button: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  removeButton: {
    backgroundColor: colors.surfaceElevated,
  },
  uploadButton: {
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: colors.textPrimary,
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
  },
});
