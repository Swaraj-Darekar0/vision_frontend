// src/utils/queueDrain.ts

import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import { getQueue, updateQueueEntry, dequeueSession } from '../cache/offlineQueue';
import { saveSession, getSessionList } from '../cache/sessionCache';
import { OFFLINE_QUEUE } from '../theme/constants';
import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import * as SecureStore from 'expo-secure-store';
import { normalizeEvaluationResult } from './normalizeEvaluationResult';
import { waitForEvaluationJob } from './waitForEvaluationJob';
import { formatDurationLabel } from './formatTime';

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
      const userRaw = await SecureStore.getItemAsync('auth_user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      if (!user?.id) {
        // Should not happen if app requires auth, but handle it
        await updateQueueEntry(session.id, { status: 'failed' });
        continue;
      }

      // Build form
      const form = new FormData();
      
      // @ts-ignore
      form.append('pose_landmarks', {
        uri: session.landmarkUri,
        name: 'landmarks.json',
        type: 'application/json',
      });

      // @ts-ignore
      form.append('audio', {
        uri: session.audioUri,
        name: 'audio.m4a',
        type: 'audio/mp4',
      });

      form.append('user_id', user.id);
      form.append('session_id', session.id);
      form.append('topic_title', session.topicTitle);
      form.append('duration_label', formatDurationLabel(session.elapsedSeconds));
      
      const existingSessions = await getSessionList(user.id);
      form.append('is_first_session', (existingSessions.length === 0).toString());

      // Upload
      const response = await apiClient.post(
        ENDPOINTS.analyzeFullVideo,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      const result = response.data?.job_id
        ? await waitForEvaluationJob(response.data.job_id)
        : normalizeEvaluationResult(response.data);

      // Save result to local cache
      await saveSession(result, session.elapsedSeconds, session.topicTitle, user.id, null);

      // Send push notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Coach\'s Report Ready',
          body: `Your ${session.topicTitle} session has been analysed.`,
          data: { sessionId: result.session_metadata.session_id },
        },
        trigger: null, // immediate
      });

      // Remove from queue and delete local files
      await dequeueSession(session.id);

    } catch (err) {
      console.error('[QueueDrain] session failed:', err);
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
