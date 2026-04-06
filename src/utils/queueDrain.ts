import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import {
  getQueue,
  updateQueueEntry,
  dequeueSession,
  QueuedSession,
  resetUploadingQueueEntries,
} from '../cache/offlineQueue';
import { saveSession, getSessionList } from '../cache/sessionCache';
import { OFFLINE_QUEUE } from '../theme/constants';
import { usePlanStore } from '../store/planStore';
import { normalizeEvaluationResult } from './normalizeEvaluationResult';
import { waitForEvaluationJob } from './waitForEvaluationJob';
import { formatDurationLabel } from './formatTime';
import { buildAnalysisFormData } from '../pipeline/buildAnalysisFormData';

export type QueueDrainResult =
  | 'uploaded'
  | 'failed'
  | 'offline'
  | 'busy'
  | 'empty'
  | 'unauthenticated';

let activeDrainPromise: Promise<QueueDrainResult> | null = null;

function getNextDrainableSession(queue: QueuedSession[]) {
  return queue.find(
    (session) => session.status === 'pending' && session.retryCount < OFFLINE_QUEUE.RETRY_MAX,
  );
}

async function uploadQueuedSession(session: QueuedSession): Promise<QueueDrainResult> {
  const userRaw = await SecureStore.getItemAsync('auth_user');
  const user = userRaw ? JSON.parse(userRaw) : null;

  if (!user?.id) {
    await updateQueueEntry(session.id, { status: 'failed' });
    return 'unauthenticated';
  }

  await updateQueueEntry(session.id, { status: 'uploading' });

  try {
    const existingSessions = await getSessionList(user.id);
    const form = buildAnalysisFormData(
      {
        sessionId: session.id,
        durationSeconds: session.elapsedSeconds,
        transcriptionAudioUri: session.transcriptionAudioUri ?? session.audioUri ?? '',
        transcriptionMediaName: session.mediaName ?? 'audio.m4a',
        transcriptionMediaMimeType: session.mediaMimeType ?? 'audio/mp4',
        poseJsonUri: session.poseJsonUri,
        audioAcousticJsonUri: session.audioAcousticJsonUri,
        legacyLandmarkUri: session.landmarkUri,
        pipelineVersion: session.pipelineVersion ?? 'legacy',
        featureFlagSnapshot: session.featureFlagSnapshot ?? {
          useDevicePosePipeline: !!session.poseJsonUri,
          useDeviceAcousticPipeline: !!session.audioAcousticJsonUri,
        },
      },
      {
        userId: user.id,
        topicTitle: session.topicTitle,
        durationLabel: formatDurationLabel(session.elapsedSeconds),
        isFirstSession: existingSessions.length === 0,
        isDiagnostic: session.isDiagnostic,
        planDay: session.planDay,
        planSession: session.planSession,
        targetSkill: session.targetSkill,
        isRecovery: session.isRecovery,
        weekNumber: session.weekNumber,
      },
    );

    const response = await apiClient.post(ENDPOINTS.analyzeFullVideo, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const result = response.data?.job_id
      ? await waitForEvaluationJob(response.data.job_id)
      : normalizeEvaluationResult(response.data);

    await saveSession(result, session.elapsedSeconds, session.topicTitle, user.id, null);

    if (typeof session.planDay === 'number' && typeof session.planSession === 'number') {
      const planStore = usePlanStore.getState();
      if (!planStore.currentPlan) {
        await planStore.loadPlan(user.id);
      }

      await planStore.markTopicComplete(user.id, {
        day: session.planDay,
        session: session.planSession,
        sessionId: result.session_metadata.session_id,
      });
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Coach\'s Report Ready',
        body: `Your ${session.topicTitle} session has been analysed.`,
        data: { sessionId: result.session_metadata.session_id },
      },
      trigger: null,
    });

    await dequeueSession(session.id);
    return 'uploaded';
  } catch (error) {
    console.error('[QueueDrain] session failed:', error);
    const nextRetryCount = session.retryCount + 1;

    if (nextRetryCount >= OFFLINE_QUEUE.RETRY_MAX) {
      await updateQueueEntry(session.id, { status: 'failed', retryCount: nextRetryCount });
    } else {
      await updateQueueEntry(session.id, { status: 'pending', retryCount: nextRetryCount });
    }

    return 'failed';
  }
}

export async function drainNextOfflineSession(): Promise<QueueDrainResult> {
  if (activeDrainPromise) {
    return 'busy';
  }

  activeDrainPromise = (async () => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return 'offline';
    }

    await resetUploadingQueueEntries();
    const queue = await getQueue();
    const nextSession = getNextDrainableSession(queue);

    if (!nextSession) {
      return 'empty';
    }

    return uploadQueuedSession(nextSession);
  })();

  try {
    return await activeDrainPromise;
  } finally {
    activeDrainPromise = null;
  }
}
