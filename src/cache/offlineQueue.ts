import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { OFFLINE_QUEUE } from '../theme/constants';

const QUEUE_KEY = 'sc_offline_queue_v1';

export interface QueuedSession {
  id: string;
  poseJsonUri?: string;
  audioAcousticJsonUri?: string;
  transcriptionAudioUri?: string;
  landmarkUri?: string;
  audioUri?: string;
  mediaName?: string;
  mediaMimeType?: string;
  topicTitle: string;
  elapsedSeconds: number;
  isDiagnostic?: boolean;
  planDay?: number;
  planSession?: number;
  targetSkill?: string;
  isRecovery?: boolean;
  weekNumber?: number;
  pipelineVersion?: string;
  featureFlagSnapshot?: {
    useDevicePosePipeline: boolean;
    useDeviceAcousticPipeline: boolean;
  };
  queuedAt: string;
  retryCount: number;
  status: 'pending' | 'uploading' | 'failed';
}

export interface QueueSummary {
  total: number;
  pending: number;
  uploading: number;
  failed: number;
}

export async function getQueue(): Promise<QueuedSession[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedSession[]) : [];
  } catch {
    return [];
  }
}

export async function enqueueSession(
  session: Omit<QueuedSession, 'retryCount' | 'status'>,
): Promise<void> {
  const queue = await getQueue();

  if (queue.length >= OFFLINE_QUEUE.MAX_SESSIONS) {
    throw new Error(`Offline queue limit reached (${OFFLINE_QUEUE.MAX_SESSIONS} sessions).`);
  }

  const entry: QueuedSession = { ...session, retryCount: 0, status: 'pending' };
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, entry]));
}

export async function updateQueueEntry(
  id: string,
  patch: Partial<Pick<QueuedSession, 'status' | 'retryCount'>>,
): Promise<void> {
  const queue = await getQueue();
  const updated = queue.map((session) => (session.id === id ? { ...session, ...patch } : session));
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export async function resetUploadingQueueEntries(): Promise<number> {
  const queue = await getQueue();
  let resetCount = 0;

  const updated = queue.map((session) => {
    if (session.status !== 'uploading') {
      return session;
    }

    resetCount += 1;
    return {
      ...session,
      status: 'pending' as const,
    };
  });

  if (resetCount > 0) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
  }

  return resetCount;
}

export async function dequeueSession(id: string): Promise<void> {
  const queue = await getQueue();
  const session = queue.find((entry) => entry.id === id);

  const cleanupTargets = [
    session?.poseJsonUri,
    session?.audioAcousticJsonUri,
    session?.landmarkUri,
    session?.transcriptionAudioUri,
    session?.audioUri,
  ].filter((target): target is string => !!target);

  for (const target of cleanupTargets) {
    await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => {});
  }

  const updated = queue.filter((entry) => entry.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export async function removeNextQueuedSession(): Promise<QueuedSession | null> {
  const queue = await getQueue();
  const nextSession = queue.find((entry) => entry.status === 'pending' || entry.status === 'failed');

  if (!nextSession) {
    return null;
  }

  await dequeueSession(nextSession.id);
  return nextSession;
}

export async function getQueueCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

export async function getQueueSummary(): Promise<QueueSummary> {
  const queue = await getQueue();

  return {
    total: queue.length,
    pending: queue.filter((session) => session.status === 'pending').length,
    uploading: queue.filter((session) => session.status === 'uploading').length,
    failed: queue.filter((session) => session.status === 'failed').length,
  };
}
