// src/cache/offlineQueue.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const QUEUE_KEY = 'sc_offline_queue_v1';

export interface QueuedSession {
  id:             string;    // uuid — generated at queue time
  landmarkUri:    string;    // local JSON file path
  audioUri:       string;    // local audio file path
  topicTitle:     string;
  elapsedSeconds: number;
  queuedAt:       string;    // ISO 8601
  retryCount:     number;    // increments on each failed upload attempt
  status:         'pending' | 'uploading' | 'failed';
}

// ── READ ───────────────────────────────────────────────────────────────────────

export async function getQueue(): Promise<QueuedSession[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedSession[]) : [];
  } catch {
    return [];
  }
}

// ── WRITE ──────────────────────────────────────────────────────────────────────

export async function enqueueSession(
  session: Omit<QueuedSession, 'retryCount' | 'status'>,
): Promise<void> {
  const queue = await getQueue();
  const entry: QueuedSession = { ...session, retryCount: 0, status: 'pending' };
  const updated = [...queue, entry];
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export async function updateQueueEntry(
  id: string,
  patch: Partial<Pick<QueuedSession, 'status' | 'retryCount'>>,
): Promise<void> {
  const queue = await getQueue();
  const updated = queue.map((s) => (s.id === id ? { ...s, ...patch } : s));
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export async function dequeueSession(id: string): Promise<void> {
  const queue = await getQueue();
  const session = queue.find((s) => s.id === id);

  // Delete the local files from disk before removing from queue
  if (session) {
    if (session.landmarkUri) {
      await FileSystem.deleteAsync(session.landmarkUri, { idempotent: true });
    }
    if (session.audioUri) {
      await FileSystem.deleteAsync(session.audioUri, { idempotent: true });
    }
  }

  const updated = queue.filter((s) => s.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export async function getQueueCount(): Promise<number> {
  const q = await getQueue();
  return q.length;
}
