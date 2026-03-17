// src/utils/queueDrain.ts

import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { getQueue, updateQueueEntry, dequeueSession } from '../cache/offlineQueue';
import { saveSession } from '../cache/sessionCache';
import { compressVideoFor480p } from './compressVideo';
import { OFFLINE_QUEUE } from '../theme/constants';
import apiClient from '../api/client';
import * as SecureStore from 'expo-secure-store';
import { EvaluationResult } from '../types/api';

export async function drainOfflineQueue(): Promise<void> {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return; // No connectivity — do nothing

  const queue = await getQueue();
  const pending = queue.filter(
    (s) => s.status === 'pending' && s.retryCount < OFFLINE_QUEUE.RETRY_MAX,
  );

  for (const session of pending) {
    await updateQueueEntry(session.id, { status: 'uploading' });

    try {
      // Compress (may already be compressed — compressor is idempotent at 480p)
      const { uri } = await compressVideoFor480p(session.videoUri);

      // Build form
      const form = new FormData();
      // @ts-ignore
      form.append('video', { uri, name: 'session.mp4', type: 'video/mp4' });

      const userRaw = await SecureStore.getItemAsync('auth_user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      if (user?.id) form.append('user_id', user.id);
      
      form.append('topic_title', session.topicTitle);
      // We don't have duration_label in QueuedSession, but we can compute it if needed
      // For now using placeholder or adding it to QueuedSession might be better
      // Given Job FE-T3-1 didn't include it, let's keep it simple or add it.

      // Upload
      const response = await apiClient.post<EvaluationResult>(
        '/analyze/full',
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      // Save result to local cache
      await saveSession(response.data, session.elapsedSeconds, session.topicTitle);

      // Send push notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Coach\'s Report Ready',
          body: `Your ${session.topicTitle} session has been analysed.`,
          data: { sessionId: response.data.session_metadata.session_id },
        },
        trigger: null, // immediate
      });

      // Remove from queue and delete video file
      await dequeueSession(session.id);

    } catch (err) {
      const newRetry = session.retryCount + 1;
      if (newRetry >= OFFLINE_QUEUE.RETRY_MAX) {
        // Mark as permanently failed — user will see it in queue UI
        await updateQueueEntry(session.id, { status: 'failed', retryCount: newRetry });
      } else {
        await updateQueueEntry(session.id, { status: 'pending', retryCount: newRetry });
      }
      // Continue draining other sessions — one failure doesn't block the queue
    }
  }
}
